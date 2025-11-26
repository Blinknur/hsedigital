import { createQueue } from './queueConfig.js';
import { logger } from '../../../shared/utils/logger.js';

export const emailQueue = createQueue('email', {
    defaultJobOptions: {
        priority: 2,
        attempts: 5
    }
});

export const reportQueue = createQueue('reports', {
    defaultJobOptions: {
        priority: 3,
        attempts: 3,
        timeout: 300000
    }
});

export const dataExportQueue = createQueue('data-exports', {
    defaultJobOptions: {
        priority: 4,
        attempts: 2,
        timeout: 600000
    }
});

export const webhookQueue = createQueue('webhooks', {
    defaultJobOptions: {
        priority: 2,
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 10000
        }
    }
});

export const tenantOnboardingQueue = createQueue('tenant-onboarding', {
    defaultJobOptions: {
        priority: 1,
        attempts: 3
    }
});

export const cleanupQueue = createQueue('cleanup', {
    defaultJobOptions: {
        priority: 5,
        attempts: 2
    }
});

export const queues = {
    email: emailQueue,
    reports: reportQueue,
    'data-exports': dataExportQueue,
    webhooks: webhookQueue,
    'tenant-onboarding': tenantOnboardingQueue,
    cleanup: cleanupQueue
};

const shutdownQueues = async () => {
    logger.info('Shutting down queues...');
    
    const queueNames = Object.keys(queues);
    for (const name of queueNames) {
        try {
            await queues[name].close();
            logger.info({ queue: name }, `Queue ${name} closed`);
        } catch (error) {
            logger.error({ error, queue: name }, `Error closing queue ${name}`);
        }
    }
};

process.on('SIGTERM', shutdownQueues);
process.on('SIGINT', shutdownQueues);

export { shutdownQueues };
