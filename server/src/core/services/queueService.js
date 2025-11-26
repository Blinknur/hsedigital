import { 
    addEmailJob,
    addReportJob,
    addDataExportJob,
    addWebhookJob,
    addTenantOnboardingJob
} from '../jobs/index.js';
import { logger } from '../../shared/utils/logger.js';

export const queueEmail = async (emailData, options = {}) => {
    try {
        const job = await addEmailJob(emailData, options);
        logger.info({ jobId: job.id, to: emailData.to }, 'Email queued');
        return { success: true, jobId: job.id };
    } catch (error) {
        logger.error({ error, emailData }, 'Failed to queue email');
        throw error;
    }
};

export const queueReport = async (reportData, options = {}) => {
    try {
        const job = await addReportJob(reportData, options);
        logger.info({ jobId: job.id, type: reportData.type }, 'Report queued');
        return { success: true, jobId: job.id };
    } catch (error) {
        logger.error({ error, reportData }, 'Failed to queue report');
        throw error;
    }
};

export const queueDataExport = async (exportData, options = {}) => {
    try {
        const job = await addDataExportJob(exportData, options);
        logger.info({ jobId: job.id, entities: exportData.entities }, 'Data export queued');
        return { success: true, jobId: job.id };
    } catch (error) {
        logger.error({ error, exportData }, 'Failed to queue data export');
        throw error;
    }
};

export const queueWebhook = async (webhookData, options = {}) => {
    try {
        const job = await addWebhookJob(webhookData, options);
        logger.info({ jobId: job.id, url: webhookData.url }, 'Webhook queued');
        return { success: true, jobId: job.id };
    } catch (error) {
        logger.error({ error, webhookData }, 'Failed to queue webhook');
        throw error;
    }
};

export const queueTenantOnboarding = async (onboardingData, options = {}) => {
    try {
        const job = await addTenantOnboardingJob(onboardingData, options);
        logger.info({ jobId: job.id, organizationName: onboardingData.organizationName }, 'Tenant onboarding queued');
        return { success: true, jobId: job.id };
    } catch (error) {
        logger.error({ error, onboardingData }, 'Failed to queue tenant onboarding');
        throw error;
    }
};

export const queueBulkEmails = async (emailList, options = {}) => {
    try {
        const jobs = await Promise.all(
            emailList.map(emailData => addEmailJob(emailData, options))
        );
        
        logger.info({ count: jobs.length }, 'Bulk emails queued');
        return { success: true, jobIds: jobs.map(j => j.id), count: jobs.length };
    } catch (error) {
        logger.error({ error, count: emailList.length }, 'Failed to queue bulk emails');
        throw error;
    }
};

export const queueScheduledEmail = async (emailData, delayMs, options = {}) => {
    try {
        const job = await addEmailJob(emailData, {
            ...options,
            delay: delayMs
        });
        
        logger.info({ 
            jobId: job.id, 
            to: emailData.to,
            delayMs 
        }, 'Scheduled email queued');
        
        return { success: true, jobId: job.id };
    } catch (error) {
        logger.error({ error, emailData }, 'Failed to queue scheduled email');
        throw error;
    }
};

export const getJobStatus = async (queueName, jobId) => {
    try {
        const { queues } = await import('../queues/index.js');
        const queue = queues[queueName];
        
        if (!queue) {
            throw new Error(`Queue not found: ${queueName}`);
        }
        
        const job = await queue.getJob(jobId);
        
        if (!job) {
            return { found: false };
        }
        
        const state = await job.getState();
        
        return {
            found: true,
            id: job.id,
            state,
            progress: job.progress(),
            attemptsMade: job.attemptsMade,
            processedOn: job.processedOn,
            finishedOn: job.finishedOn,
            failedReason: job.failedReason,
            returnvalue: job.returnvalue
        };
    } catch (error) {
        logger.error({ error, queueName, jobId }, 'Failed to get job status');
        throw error;
    }
};
