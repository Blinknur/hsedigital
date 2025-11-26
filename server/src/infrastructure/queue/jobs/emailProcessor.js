import { sendEmail } from '../../../core/services/emailService.js';
import { logger } from '../../../shared/utils/logger.js';
import { emailQueue } from '../queues/index.js';

const processEmailJob = async (job) => {
    const { to, subject, html, text, from } = job.data;
    
    logger.info({ 
        jobId: job.id, 
        to, 
        subject 
    }, 'Processing email job');

    try {
        const result = await sendEmail({ to, subject, html, text, from });
        
        logger.info({ 
            jobId: job.id, 
            messageId: result.messageId, 
            to, 
            subject 
        }, 'Email sent successfully');
        
        return result;
    } catch (error) {
        logger.error({ 
            error, 
            jobId: job.id, 
            to, 
            subject 
        }, 'Failed to send email');
        
        throw error;
    }
};

export const startEmailProcessor = (concurrency = 5) => {
    emailQueue.process(concurrency, processEmailJob);
    
    emailQueue.on('completed', (job, result) => {
        logger.info({ 
            jobId: job.id, 
            result 
        }, 'Email job completed');
    });

    emailQueue.on('failed', (job, error) => {
        logger.error({ 
            jobId: job.id, 
            error,
            attempts: job.attemptsMade,
            data: job.data
        }, 'Email job failed');
    });

    logger.info({ concurrency }, 'Email processor started');
};

export const addEmailJob = async (emailData, options = {}) => {
    const job = await emailQueue.add(emailData, {
        ...options,
        attempts: options.attempts || 5,
        backoff: options.backoff || {
            type: 'exponential',
            delay: 5000
        }
    });
    
    logger.info({ 
        jobId: job.id, 
        to: emailData.to, 
        subject: emailData.subject 
    }, 'Email job added to queue');
    
    return job;
};
