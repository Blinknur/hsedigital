import { logger } from '../../shared/utils/logger.js';

const alertThresholds = {
  errorRate: parseFloat(process.env.ALERT_ERROR_RATE_THRESHOLD || '0.05'),
  responseTime: parseInt(process.env.ALERT_RESPONSE_TIME_MS || '5000', 10),
  databaseQueryTime: parseInt(process.env.ALERT_DB_QUERY_TIME_MS || '2000', 10),
  rateLimitHits: parseInt(process.env.ALERT_RATE_LIMIT_HITS || '100', 10)
};

class AlertManager {
  constructor() {
    this.alerts = new Map();
    this.alertCooldown = 5 * 60 * 1000;
  }

  shouldSendAlert(alertKey) {
    const lastAlert = this.alerts.get(alertKey);
    if (!lastAlert) return true;
    return Date.now() - lastAlert > this.alertCooldown;
  }

  async sendAlert(level, title, message, metadata = {}) {
    const alertKey = `${level}_${title}`;
    
    if (!this.shouldSendAlert(alertKey)) {
      logger.debug({ alertKey }, 'Alert suppressed due to cooldown');
      return;
    }

    this.alerts.set(alertKey, Date.now());

    logger[level]({
      type: 'alert',
      title,
      message,
      metadata,
      timestamp: new Date().toISOString()
    }, `ALERT: ${title}`);

    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 *${title}*`,
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: title
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
                type: 'context',
                elements: [
                  {
                    type: 'mrkdwn',
                    text: `Environment: ${process.env.NODE_ENV} | Time: ${new Date().toISOString()}`
                  }
                ]
              }
            ]
          })
        });
      } catch (error) {
        logger.error({ error }, 'Failed to send Slack alert');
      }
    }

    if (process.env.PAGERDUTY_INTEGRATION_KEY && level === 'error') {
      try {
        await fetch('https://events.pagerduty.com/v2/enqueue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            routing_key: process.env.PAGERDUTY_INTEGRATION_KEY,
            event_action: 'trigger',
            payload: {
              summary: title,
              severity: 'error',
              source: 'hse-digital',
              custom_details: {
                message,
                ...metadata
              }
            }
          })
        });
      } catch (error) {
        logger.error({ error }, 'Failed to send PagerDuty alert');
      }
    }
  }

  checkErrorRate(errors, total) {
    const rate = total > 0 ? errors / total : 0;
    if (rate > alertThresholds.errorRate) {
      this.sendAlert(
        'error',
        'High Error Rate Detected',
        `Error rate is ${(rate * 100).toFixed(2)}% (threshold: ${(alertThresholds.errorRate * 100).toFixed(2)}%)`,
        { errors, total, rate }
      );
    }
  }

  checkResponseTime(duration, endpoint) {
    if (duration > alertThresholds.responseTime) {
      this.sendAlert(
        'warn',
        'Slow Response Time',
        `Endpoint ${endpoint} took ${duration}ms (threshold: ${alertThresholds.responseTime}ms)`,
        { duration, endpoint }
      );
    }
  }

  checkDatabaseQueryTime(duration, query) {
    if (duration > alertThresholds.databaseQueryTime) {
      this.sendAlert(
        'warn',
        'Slow Database Query',
        `Query took ${duration}ms (threshold: ${alertThresholds.databaseQueryTime}ms)`,
        { duration, query: query.substring(0, 200) }
      );
    }
  }

  criticalError(error, context) {
    this.sendAlert(
      'error',
      'Critical Error Detected',
      error.message || 'An unexpected error occurred',
      { error: error.stack, context }
    );
  }

  serviceDown(service) {
    this.sendAlert(
      'error',
      `${service} Service Down`,
      `The ${service} service is not responding`,
      { service }
    );
  }
}

export const alertManager = new AlertManager();
