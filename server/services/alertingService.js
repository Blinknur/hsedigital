import { logger } from '../utils/logger.js';
import { sendAlert } from './emailService.js';
import Redis from 'ioredis';

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => Math.min(times * 50, 2000)
});

redis.on('error', (err) => {
    logger.error({ error: err }, 'Redis connection error in alerting service');
});

const ALERT_WINDOW_MS = 5 * 60 * 1000;
const ALERT_ESCALATION_DELAY_MS = 15 * 60 * 1000;
const MAX_DEDUP_TIME_MS = 60 * 60 * 1000;

const SEVERITY_LEVELS = {
    INFO: { level: 1, emoji: 'ℹ️', pagerduty: 'info' },
    WARNING: { level: 2, emoji: '⚠️', pagerduty: 'warning' },
    ERROR: { level: 3, emoji: '🔴', pagerduty: 'error' },
    CRITICAL: { level: 4, emoji: '🚨', pagerduty: 'critical' }
};

const ESCALATION_POLICIES = {
    error_rate: {
        thresholds: [
            { errors: 10, duration: 60000, severity: 'WARNING', channels: ['slack'] },
            { errors: 50, duration: 300000, severity: 'ERROR', channels: ['slack', 'email'] },
            { errors: 100, duration: 300000, severity: 'CRITICAL', channels: ['slack', 'email', 'pagerduty'] }
        ]
    },
    quota_breach: {
        thresholds: [
            { percentage: 80, severity: 'WARNING', channels: ['slack', 'email'] },
            { percentage: 90, severity: 'ERROR', channels: ['slack', 'email'] },
            { percentage: 100, severity: 'CRITICAL', channels: ['slack', 'email', 'pagerduty'] }
        ]
    },
    database_pool: {
        thresholds: [
            { percentage: 70, severity: 'WARNING', channels: ['slack'] },
            { percentage: 85, severity: 'ERROR', channels: ['slack', 'email'] },
            { percentage: 95, severity: 'CRITICAL', channels: ['slack', 'email', 'pagerduty'] }
        ]
    },
    redis_failure: {
        severity: 'CRITICAL',
        channels: ['slack', 'email', 'pagerduty']
    }
};

class AdvancedAlertingService {
    constructor() {
        this.errorRateWindow = [];
        this.alertHistory = new Map();
        this.escalationTimers = new Map();
    }

    async shouldSendAlert(alertKey, severity) {
        const dedupKey = `alert:dedup:${alertKey}`;
        const existing = await redis.get(dedupKey);
        
        if (existing) {
            const existingData = JSON.parse(existing);
            const existingSeverity = SEVERITY_LEVELS[existingData.severity];
            const newSeverity = SEVERITY_LEVELS[severity];
            
            if (newSeverity.level > existingSeverity.level) {
                await redis.setex(dedupKey, Math.floor(MAX_DEDUP_TIME_MS / 1000), JSON.stringify({ severity, timestamp: Date.now() }));
                return true;
            }
            
            logger.debug({ alertKey, severity }, 'Alert deduplicated');
            return false;
        }
        
        await redis.setex(dedupKey, Math.floor(MAX_DEDUP_TIME_MS / 1000), JSON.stringify({ severity, timestamp: Date.now() }));
        return true;
    }

    async trackErrorRate(error) {
        const now = Date.now();
        const errorKey = `errors:${Math.floor(now / 60000)}`;
        
        await redis.incr(errorKey);
        await redis.expire(errorKey, 600);
        
        const keys = [];
        for (let i = 0; i < 5; i++) {
            keys.push(`errors:${Math.floor((now - i * 60000) / 60000)}`);
        }
        
        const values = await redis.mget(keys);
        const total = values.reduce((sum, val) => sum + parseInt(val || 0), 0);
        
        const policy = ESCALATION_POLICIES.error_rate;
        for (const threshold of policy.thresholds.slice().reverse()) {
            if (total >= threshold.errors) {
                await this.sendAlert({
                    type: 'error_rate',
                    severity: threshold.severity,
                    title: 'High Error Rate Detected',
                    message: `${total} errors detected in the last 5 minutes`,
                    metadata: { errorCount: total, threshold: threshold.errors, error: error.message },
                    channels: threshold.channels,
                    tenantId: null
                });
                break;
            }
        }
    }

    async checkQuotaBreach(organizationId, resource, current, limit, percentage) {
        const policy = ESCALATION_POLICIES.quota_breach;
        
        for (const threshold of policy.thresholds.slice().reverse()) {
            if (percentage >= threshold.percentage) {
                await this.sendAlert({
                    type: 'quota_breach',
                    severity: threshold.severity,
                    title: `Quota Breach: ${resource}`,
                    message: `Organization ${organizationId} has reached ${percentage.toFixed(1)}% of ${resource} quota (${current}/${limit})`,
                    metadata: { organizationId, resource, current, limit, percentage },
                    channels: threshold.channels,
                    tenantId: organizationId
                });
                break;
            }
        }
    }

    async checkDatabasePoolExhaustion(activeConnections, maxConnections) {
        const percentage = (activeConnections / maxConnections) * 100;
        const policy = ESCALATION_POLICIES.database_pool;
        
        for (const threshold of policy.thresholds.slice().reverse()) {
            if (percentage >= threshold.percentage) {
                await this.sendAlert({
                    type: 'database_pool',
                    severity: threshold.severity,
                    title: 'Database Connection Pool Exhaustion',
                    message: `Database pool at ${percentage.toFixed(1)}% capacity (${activeConnections}/${maxConnections} connections)`,
                    metadata: { activeConnections, maxConnections, percentage },
                    channels: threshold.channels,
                    tenantId: null
                });
                break;
            }
        }
    }

    async checkRedisFailure(error) {
        const policy = ESCALATION_POLICIES.redis_failure;
        
        await this.sendAlert({
            type: 'redis_failure',
            severity: policy.severity,
            title: 'Redis Cluster Failure Detected',
            message: `Redis connection failed: ${error.message}`,
            metadata: { error: error.message, stack: error.stack },
            channels: policy.channels,
            tenantId: null
        });
    }

    async sendAlert({ type, severity, title, message, metadata = {}, channels = ['slack'], tenantId = null }) {
        const alertKey = `${type}:${tenantId || 'global'}:${title}`;
        
        const shouldSend = await this.shouldSendAlert(alertKey, severity);
        if (!shouldSend) {
            return;
        }

        const severityInfo = SEVERITY_LEVELS[severity] || SEVERITY_LEVELS.INFO;
        
        const logLevel = severity.toLowerCase() === 'critical' || severity.toLowerCase() === 'error' ? 'error' : severity.toLowerCase();
        logger[logLevel]({ 
            type: 'alert',
            alertType: type,
            severity,
            title, 
            message, 
            metadata,
            tenantId
        }, `ALERT [${severity}]: ${title}`);

        const alertPromises = [];

        if (channels.includes('slack') && process.env.SLACK_WEBHOOK_URL) {
            alertPromises.push(this.sendSlackAlert(severityInfo, title, message, metadata, tenantId, severity));
        }

        if (channels.includes('email') && process.env.ALERT_EMAIL_RECIPIENTS) {
            alertPromises.push(this.sendEmailAlert(severity, title, message, metadata, tenantId));
        }

        if (channels.includes('pagerduty') && process.env.PAGERDUTY_INTEGRATION_KEY) {
            alertPromises.push(this.sendPagerDutyAlert(severityInfo, title, message, metadata, tenantId, type));
        }

        await Promise.allSettled(alertPromises);

        if (severity === 'ERROR' || severity === 'CRITICAL') {
            this.scheduleEscalation(alertKey, type, severity, title, message, metadata, tenantId);
        }
    }

    async sendSlackAlert(severityInfo, title, message, metadata, tenantId, severity) {
        try {
            const color = {
                INFO: '#36a64f',
                WARNING: '#ff9900',
                ERROR: '#ff0000',
                CRITICAL: '#8B0000'
            }[severity || 'INFO'];

            const fields = Object.entries(metadata)
                .filter(([key]) => key !== 'stack')
                .map(([key, value]) => ({
                    type: 'mrkdwn',
                    text: `*${key}:* ${JSON.stringify(value)}`
                }));

            if (tenantId) {
                fields.unshift({
                    type: 'mrkdwn',
                    text: `*Tenant:* ${tenantId}`
                });
            }

            await fetch(process.env.SLACK_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: `${severityInfo.emoji} *${title}*`,
                    blocks: [
                        {
                            type: 'header',
                            text: {
                                type: 'plain_text',
                                text: `${severityInfo.emoji} ${title}`
                            }
                        },
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: message
                            }
                        },
                        {
                            type: 'section',
                            fields: fields
                        },
                        {
                            type: 'context',
                            elements: [
                                {
                                    type: 'mrkdwn',
                                    text: `Environment: *${process.env.NODE_ENV}* | Time: ${new Date().toISOString()}`
                                }
                            ]
                        }
                    ],
                    attachments: [{
                        color: color
                    }]
                })
            });
            
            logger.debug({ title }, 'Slack alert sent successfully');
        } catch (error) {
            logger.error({ error, title }, 'Failed to send Slack alert');
        }
    }

    async sendEmailAlert(severity, title, message, metadata, tenantId) {
        try {
            const recipients = process.env.ALERT_EMAIL_RECIPIENTS.split(',');
            
            const emailBody = `<div style="font-family: Arial, sans-serif; max-width: 600px;"><h2 style="color: ${severity === 'CRITICAL' ? '#8B0000' : '#ff0000'};">${title}</h2><p><strong>Severity:</strong> ${severity}</p><p><strong>Message:</strong> ${message}</p>${tenantId ? `<p><strong>Tenant ID:</strong> ${tenantId}</p>` : ''}<h3>Details:</h3><pre style="background: #f4f4f4; padding: 10px; border-radius: 5px;">${JSON.stringify(metadata, null, 2)}</pre><p style="color: #666; font-size: 12px; margin-top: 20px;">Environment: ${process.env.NODE_ENV}<br>Time: ${new Date().toISOString()}</p></div>`;

            for (const recipient of recipients) {
                await sendAlert(recipient.trim(), `[${severity}] ${title}`, emailBody);
            }
            
            logger.debug({ title, recipients: recipients.length }, 'Email alerts sent successfully');
        } catch (error) {
            logger.error({ error, title }, 'Failed to send email alert');
        }
    }

    async sendPagerDutyAlert(severityInfo, title, message, metadata, tenantId, type) {
        try {
            const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    routing_key: process.env.PAGERDUTY_INTEGRATION_KEY,
                    event_action: 'trigger',
                    dedup_key: `${type || 'alert'}_${tenantId || 'global'}_${Date.now()}`,
                    payload: {
                        summary: title,
                        severity: severityInfo.pagerduty,
                        source: 'hse-digital',
                        component: tenantId || 'platform',
                        custom_details: {
                            message,
                            ...metadata,
                            environment: process.env.NODE_ENV,
                            timestamp: new Date().toISOString()
                        }
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error(`PagerDuty API returned ${response.status}`);
            }
            
            logger.debug({ title }, 'PagerDuty alert sent successfully');
        } catch (error) {
            logger.error({ error, title }, 'Failed to send PagerDuty alert');
        }
    }

    scheduleEscalation(alertKey, type, severity, title, message, metadata, tenantId) {
        if (this.escalationTimers.has(alertKey)) {
            return;
        }

        const timer = setTimeout(async () => {
            const nextSeverity = severity === 'ERROR' ? 'CRITICAL' : severity;
            
            logger.warn({ alertKey, severity: nextSeverity }, 'Escalating unresolved alert');
            
            await this.sendAlert({
                type,
                severity: nextSeverity,
                title: `[ESCALATED] ${title}`,
                message: `Alert has not been resolved after ${ALERT_ESCALATION_DELAY_MS / 60000} minutes. ${message}`,
                metadata: { ...metadata, escalated: true, originalSeverity: severity },
                channels: ['slack', 'email', 'pagerduty'],
                tenantId
            });
            
            this.escalationTimers.delete(alertKey);
        }, ALERT_ESCALATION_DELAY_MS);

        this.escalationTimers.set(alertKey, timer);
    }

    cancelEscalation(alertKey) {
        const timer = this.escalationTimers.get(alertKey);
        if (timer) {
            clearTimeout(timer);
            this.escalationTimers.delete(alertKey);
            logger.debug({ alertKey }, 'Escalation cancelled');
        }
    }

    async getAlertStats() {
        const pattern = 'alert:dedup:*';
        const keys = await redis.keys(pattern);
        
        const stats = {
            totalActiveAlerts: keys.length,
            byType: {},
            bySeverity: {}
        };

        for (const key of keys) {
            const data = await redis.get(key);
            if (data) {
                const alertData = JSON.parse(data);
                const type = key.split(':')[2];
                
                stats.byType[type] = (stats.byType[type] || 0) + 1;
                stats.bySeverity[alertData.severity] = (stats.bySeverity[alertData.severity] || 0) + 1;
            }
        }

        return stats;
    }
}

export const advancedAlertingService = new AdvancedAlertingService();
export default advancedAlertingService;
