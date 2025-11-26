import { logger } from '../../../shared/utils/logger.js';
import { webhookQueue } from '../queues/index.js';
import crypto from 'crypto';

const deliverWebhook = async (url, payload, secret, headers = {}) => {
    const timestamp = Date.now();
    const signature = crypto
        .createHmac('sha256', secret || 'default-secret')
        .update(`${timestamp}.${JSON.stringify(payload)}`)
        .digest('hex');
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Timestamp': timestamp.toString(),
            ...headers
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000)
    });
    
    if (!response.ok) {
        throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
    }
    
    return {
        status: response.status,
        statusText: response.statusText,
        timestamp
    };
};

const processWebhookJob = async (job) => {
    const { url, payload, secret, headers, eventType, organizationId } = job.data;
    
    logger.info({ 
        jobId: job.id, 
        url, 
        eventType,
        organizationId,
        attempt: job.attemptsMade + 1
    }, 'Processing webhook delivery job');

    try {
        const result = await deliverWebhook(url, payload, secret, headers);
        
        logger.info({ 
            jobId: job.id, 
            url, 
            eventType,
            status: result.status,
            attempt: job.attemptsMade + 1
        }, 'Webhook delivered successfully');
        
        return result;
    } catch (error) {
        logger.error({ 
            error: error.message, 
            jobId: job.id, 
            url,
            eventType,
            attempt: job.attemptsMade + 1
        }, 'Failed to deliver webhook');
        
        throw error;
    }
};

export const startWebhookProcessor = (concurrency = 5) => {
    webhookQueue.process(concurrency, processWebhookJob);
    
    webhookQueue.on('completed', (job, result) => {
        logger.info({ 
            jobId: job.id, 
            result,
            attempts: job.attemptsMade + 1
        }, 'Webhook job completed');
    });

    webhookQueue.on('failed', (job, error) => {
        logger.error({ 
            jobId: job.id, 
            error: error.message,
            attempts: job.attemptsMade,
            maxAttempts: job.opts.attempts,
            url: job.data.url
        }, 'Webhook job failed');
        
        if (job.attemptsMade >= job.opts.attempts) {
            logger.error({ 
                jobId: job.id,
                url: job.data.url,
                eventType: job.data.eventType
            }, 'Webhook permanently failed after all retries');
        }
    });

    logger.info({ concurrency }, 'Webhook processor started');
};

export const addWebhookJob = async (webhookData, options = {}) => {
    const job = await webhookQueue.add(webhookData, {
        ...options,
        attempts: options.attempts || 5,
        backoff: options.backoff || {
            type: 'exponential',
            delay: 10000
        }
    });
    
    logger.info({ 
        jobId: job.id, 
        url: webhookData.url,
        eventType: webhookData.eventType
    }, 'Webhook job added to queue');
    
    return job;
};
