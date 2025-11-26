import Bull from 'bull';
import { logger } from '../../../shared/utils/logger.js';

const queueConfig = {
    redis: {
        host: process.env.QUEUE_REDIS_HOST || process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.QUEUE_REDIS_PORT || process.env.REDIS_PORT || '6379'),
        password: process.env.QUEUE_REDIS_PASSWORD || process.env.REDIS_PASSWORD || undefined,
        retryStrategy: (times) => {
            if (times > 3) {
                logger.error('Queue Redis connection failed after 3 retries');
                return null;
            }
            return Math.min(times * 50, 2000);
        }
    },
    defaultJobOptions: {
        attempts: parseInt(process.env.QUEUE_MAX_RETRIES || '3'),
        backoff: {
            type: 'exponential',
            delay: parseInt(process.env.QUEUE_BACKOFF_DELAY || '5000')
        },
        removeOnComplete: {
            age: 86400,
            count: 1000
        },
        removeOnFail: {
            age: 604800
        }
    },
    settings: {
        lockDuration: 30000,
        lockRenewTime: 15000,
        stalledInterval: 30000,
        maxStalledCount: 3
    }
};

export const createQueue = (name, options = {}) => {
    const queue = new Bull(name, {
        redis: queueConfig.redis,
        defaultJobOptions: {
            ...queueConfig.defaultJobOptions,
            ...options.defaultJobOptions
        },
        settings: {
            ...queueConfig.settings,
            ...options.settings
        }
    });

    queue.on('error', (error) => {
        logger.error({ error, queue: name }, `Queue ${name} error`);
    });

    queue.on('failed', (job, error) => {
        logger.error({ 
            error, 
            queue: name, 
            jobId: job.id, 
            jobData: job.data,
            attempts: job.attemptsMade
        }, `Job ${job.id} in queue ${name} failed`);
    });

    queue.on('stalled', (job) => {
        logger.warn({ 
            queue: name, 
            jobId: job.id, 
            jobData: job.data 
        }, `Job ${job.id} in queue ${name} stalled`);
    });

    logger.info({ queue: name }, `Queue ${name} initialized`);
    
    return queue;
};

export default queueConfig;
