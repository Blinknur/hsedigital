import { logger } from '../utils/logger.js';
import { advancedAlertingService } from '../services/alertingService.js';

let lastCheckTime = 0;
const CHECK_INTERVAL_MS = 60000;

export const monitorDatabasePool = (prisma) => {
    return async (req, res, next) => {
        const now = Date.now();
        
        if (now - lastCheckTime > CHECK_INTERVAL_MS) {
            lastCheckTime = now;
            
            try {
                const poolMetrics = await prisma.$metrics.json();
                
                if (poolMetrics && poolMetrics.counters) {
                    const activeConnections = poolMetrics.counters.find(c => c.key === 'prisma_client_queries_active');
                    const maxConnections = parseInt(process.env.DATABASE_POOL_MAX || '10');
                    
                    if (activeConnections && activeConnections.value) {
                        const active = activeConnections.value;
                        
                        advancedAlertingService.checkDatabasePoolExhaustion(active, maxConnections)
                            .catch(err => logger.error({ err }, 'Failed to check database pool'));
                    }
                }
            } catch (err) {
                logger.debug({ err }, 'Unable to fetch database pool metrics');
            }
        }
        
        next();
    };
};
