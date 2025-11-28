import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../../shared/utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '../../../..');
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts/incident-response');

class IncidentResponseService {
    constructor() {
        this.activeIncidents = new Map();
        this.diagnosticsHistory = [];
    }

    async handleCriticalAlert(alertType, alertData) {
        const incidentId = `${alertType}-${Date.now()}`;
        
        logger.error({
            type: 'critical_alert_triggered',
            incidentId,
            alertType,
            alertData
        }, `Critical alert triggered: ${alertType}`);

        this.activeIncidents.set(incidentId, {
            id: incidentId,
            type: alertType,
            data: alertData,
            startedAt: new Date(),
            status: 'investigating'
        });

        try {
            const diagnosticsPath = await this.collectDiagnostics(alertType, alertData);
            
            this.activeIncidents.get(incidentId).diagnosticsPath = diagnosticsPath;
            this.diagnosticsHistory.push({
                incidentId,
                alertType,
                timestamp: new Date(),
                diagnosticsPath
            });

            logger.info({
                incidentId,
                diagnosticsPath
            }, 'Diagnostics collected for incident');

            await this.executeAutomatedResponse(alertType, alertData, incidentId);

            return { incidentId, diagnosticsPath };
        } catch (error) {
            logger.error({ error, incidentId }, 'Failed to handle critical alert');
            throw error;
        }
    }

    async collectDiagnostics(alertType, alertData) {
        logger.info({ alertType }, 'Collecting diagnostic data...');

        try {
            const scriptPath = path.join(SCRIPTS_DIR, 'alert-diagnostics.sh');
            const { stdout, stderr } = await execAsync(`bash ${scriptPath} ${alertType}`);

            const match = stdout.match(/\/.*diagnostics.*$/m);
            const diagnosticsPath = match ? match[0].trim() : null;

            if (diagnosticsPath) {
                logger.info({ diagnosticsPath }, 'Diagnostics collected successfully');
                return diagnosticsPath;
            } else {
                logger.warn('Could not determine diagnostics path from output');
                return null;
            }
        } catch (error) {
            logger.error({ error, alertType }, 'Failed to collect diagnostics');
            return null;
        }
    }

    async executeAutomatedResponse(alertType, alertData, incidentId) {
        logger.info({ alertType, incidentId }, 'Executing automated response...');

        try {
            switch (alertType) {
                case 'database_pool':
                    await this.handleDatabasePoolAlert(alertData);
                    break;

                case 'memory_leak':
                case 'high_memory':
                    await this.handleMemoryAlert(alertData);
                    break;

                case 'error_rate':
                    await this.handleErrorRateAlert(alertData);
                    break;

                case 'redis_failure':
                    await this.handleRedisFailure(alertData);
                    break;

                default:
                    logger.warn({ alertType }, 'No automated response defined for alert type');
            }
        } catch (error) {
            logger.error({ error, alertType, incidentId }, 'Automated response failed');
        }
    }

    async handleDatabasePoolAlert(alertData) {
        const { activeConnections, maxConnections, percentage } = alertData;

        logger.warn({
            activeConnections,
            maxConnections,
            percentage
        }, 'Database pool exhaustion detected');

        if (percentage >= 95) {
            logger.error('Critical pool exhaustion - attempting pool optimization');
            try {
                const scriptPath = path.join(SCRIPTS_DIR, 'db-pool-monitor.sh');
                await execAsync(`bash ${scriptPath} optimize`);
                logger.info('Pool optimization triggered');
            } catch (error) {
                logger.error({ error }, 'Pool optimization failed');
            }
        }
    }

    async handleMemoryAlert(alertData) {
        logger.warn(alertData, 'Memory alert detected');

        try {
            const scriptPath = path.join(SCRIPTS_DIR, 'memory-leak-detector.sh');
            await execAsync(`bash ${scriptPath} heap-dump`);
            logger.info('Heap dump created for memory analysis');
        } catch (error) {
            logger.error({ error }, 'Failed to create heap dump');
        }
    }

    async handleErrorRateAlert(alertData) {
        const { errorCount, threshold } = alertData;

        logger.error({
            errorCount,
            threshold
        }, 'High error rate detected');

        try {
            const scriptPath = path.join(SCRIPTS_DIR, 'log-aggregator.sh');
            const { stdout } = await execAsync(`bash ${scriptPath} errors 15`);
            
            logger.info({ recentErrors: stdout.split('\n').slice(0, 10) }, 'Recent errors collected');
        } catch (error) {
            logger.error({ error }, 'Failed to collect error logs');
        }
    }

    async handleRedisFailure(alertData) {
        logger.error(alertData, 'Redis failure detected');
        
        logger.warn('Redis connection lost - application may have degraded performance');
    }

    async checkDatabasePoolHealth() {
        try {
            const scriptPath = path.join(SCRIPTS_DIR, 'db-pool-monitor.sh');
            const { stdout } = await execAsync(`bash ${scriptPath} alert-check`);
            
            const result = JSON.parse(stdout);
            return result;
        } catch (error) {
            logger.error({ error }, 'Failed to check database pool health');
            return { alert: true, error: error.message };
        }
    }

    async exportPoolMetrics() {
        try {
            const scriptPath = path.join(SCRIPTS_DIR, 'db-pool-monitor.sh');
            const { stdout } = await execAsync(`bash ${scriptPath} export`);
            
            return JSON.parse(stdout);
        } catch (error) {
            logger.error({ error }, 'Failed to export pool metrics');
            throw error;
        }
    }

    async getIncidentHistory() {
        return {
            active: Array.from(this.activeIncidents.values()),
            history: this.diagnosticsHistory.slice(-20)
        };
    }

    async resolveIncident(incidentId) {
        const incident = this.activeIncidents.get(incidentId);
        if (incident) {
            incident.status = 'resolved';
            incident.resolvedAt = new Date();
            this.activeIncidents.delete(incidentId);
            
            logger.info({ incidentId }, 'Incident resolved');
            return incident;
        }
        return null;
    }
}

export const incidentResponseService = new IncidentResponseService();
export default incidentResponseService;
