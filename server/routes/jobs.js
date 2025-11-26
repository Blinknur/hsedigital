import express from 'express';
import { createBullBoard } from 'bull-board';
import { BullAdapter } from 'bull-board/bullAdapter.js';
import { queues } from '../queues/index.js';
import { 
    addEmailJob,
    addReportJob,
    addDataExportJob,
    addWebhookJob,
    addTenantOnboardingJob
} from '../jobs/index.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

const { router: bullBoardRouter } = createBullBoard(
    Object.values(queues).map(queue => new BullAdapter(queue))
);

router.use('/dashboard', bullBoardRouter);

router.get('/stats', async (req, res) => {
    try {
        const stats = {};
        
        for (const [name, queue] of Object.entries(queues)) {
            const [
                waiting,
                active,
                completed,
                failed,
                delayed,
                paused
            ] = await Promise.all([
                queue.getWaitingCount(),
                queue.getActiveCount(),
                queue.getCompletedCount(),
                queue.getFailedCount(),
                queue.getDelayedCount(),
                queue.getPausedCount()
            ]);
            
            stats[name] = {
                waiting,
                active,
                completed,
                failed,
                delayed,
                paused,
                total: waiting + active + completed + failed + delayed
            };
        }
        
        res.json(stats);
    } catch (error) {
        logger.error({ error }, 'Failed to fetch queue stats');
        res.status(500).json({ error: 'Failed to fetch queue stats' });
    }
});

router.get('/:queueName/jobs', async (req, res) => {
    try {
        const { queueName } = req.params;
        const { status = 'waiting', limit = 50 } = req.query;
        
        const queue = queues[queueName];
        if (!queue) {
            return res.status(404).json({ error: 'Queue not found' });
        }
        
        let jobs;
        switch (status) {
            case 'waiting':
                jobs = await queue.getWaiting(0, parseInt(limit));
                break;
            case 'active':
                jobs = await queue.getActive(0, parseInt(limit));
                break;
            case 'completed':
                jobs = await queue.getCompleted(0, parseInt(limit));
                break;
            case 'failed':
                jobs = await queue.getFailed(0, parseInt(limit));
                break;
            case 'delayed':
                jobs = await queue.getDelayed(0, parseInt(limit));
                break;
            default:
                return res.status(400).json({ error: 'Invalid status' });
        }
        
        const jobData = jobs.map(job => ({
            id: job.id,
            name: job.name,
            data: job.data,
            progress: job.progress(),
            attemptsMade: job.attemptsMade,
            processedOn: job.processedOn,
            finishedOn: job.finishedOn,
            failedReason: job.failedReason,
            stacktrace: job.stacktrace
        }));
        
        res.json(jobData);
    } catch (error) {
        logger.error({ error }, 'Failed to fetch jobs');
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});

router.get('/:queueName/jobs/:jobId', async (req, res) => {
    try {
        const { queueName, jobId } = req.params;
        
        const queue = queues[queueName];
        if (!queue) {
            return res.status(404).json({ error: 'Queue not found' });
        }
        
        const job = await queue.getJob(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        
        const state = await job.getState();
        
        res.json({
            id: job.id,
            name: job.name,
            data: job.data,
            opts: job.opts,
            progress: job.progress(),
            attemptsMade: job.attemptsMade,
            processedOn: job.processedOn,
            finishedOn: job.finishedOn,
            failedReason: job.failedReason,
            stacktrace: job.stacktrace,
            returnvalue: job.returnvalue,
            state
        });
    } catch (error) {
        logger.error({ error }, 'Failed to fetch job details');
        res.status(500).json({ error: 'Failed to fetch job details' });
    }
});

router.post('/:queueName/jobs/:jobId/retry', async (req, res) => {
    try {
        const { queueName, jobId } = req.params;
        
        const queue = queues[queueName];
        if (!queue) {
            return res.status(404).json({ error: 'Queue not found' });
        }
        
        const job = await queue.getJob(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        
        await job.retry();
        
        logger.info({ queueName, jobId }, 'Job retried manually');
        res.json({ message: 'Job retried successfully' });
    } catch (error) {
        logger.error({ error }, 'Failed to retry job');
        res.status(500).json({ error: 'Failed to retry job' });
    }
});

router.delete('/:queueName/jobs/:jobId', async (req, res) => {
    try {
        const { queueName, jobId } = req.params;
        
        const queue = queues[queueName];
        if (!queue) {
            return res.status(404).json({ error: 'Queue not found' });
        }
        
        const job = await queue.getJob(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        
        await job.remove();
        
        logger.info({ queueName, jobId }, 'Job removed manually');
        res.json({ message: 'Job removed successfully' });
    } catch (error) {
        logger.error({ error }, 'Failed to remove job');
        res.status(500).json({ error: 'Failed to remove job' });
    }
});

router.post('/:queueName/clean', async (req, res) => {
    try {
        const { queueName } = req.params;
        const { grace = 3600000, status = 'completed' } = req.body;
        
        const queue = queues[queueName];
        if (!queue) {
            return res.status(404).json({ error: 'Queue not found' });
        }
        
        const result = await queue.clean(parseInt(grace), status);
        
        logger.info({ queueName, status, grace, removed: result.length }, 'Queue cleaned');
        res.json({ message: `Cleaned ${result.length} jobs`, count: result.length });
    } catch (error) {
        logger.error({ error }, 'Failed to clean queue');
        res.status(500).json({ error: 'Failed to clean queue' });
    }
});

router.post('/email', async (req, res) => {
    try {
        const { to, subject, html, text, from, priority } = req.body;
        
        if (!to || !subject) {
            return res.status(400).json({ error: 'Missing required fields: to, subject' });
        }
        
        const job = await addEmailJob(
            { to, subject, html, text, from },
            { priority }
        );
        
        res.status(201).json({ 
            jobId: job.id, 
            queue: 'email',
            message: 'Email job queued successfully' 
        });
    } catch (error) {
        logger.error({ error }, 'Failed to add email job');
        res.status(500).json({ error: 'Failed to add email job' });
    }
});

router.post('/reports', async (req, res) => {
    try {
        const { type, filters, format, notifyEmail } = req.body;
        const organizationId = req.tenantId;
        const userId = req.user.id;
        
        if (!type) {
            return res.status(400).json({ error: 'Missing required field: type' });
        }
        
        const job = await addReportJob({
            type,
            organizationId,
            filters,
            format: format || 'json',
            userId,
            notifyEmail
        });
        
        res.status(201).json({ 
            jobId: job.id, 
            queue: 'reports',
            message: 'Report generation job queued successfully' 
        });
    } catch (error) {
        logger.error({ error }, 'Failed to add report job');
        res.status(500).json({ error: 'Failed to add report job' });
    }
});

router.post('/data-exports', async (req, res) => {
    try {
        const { entities, format, notifyEmail } = req.body;
        const organizationId = req.tenantId;
        const userId = req.user.id;
        
        if (!entities || !Array.isArray(entities)) {
            return res.status(400).json({ error: 'Missing required field: entities (array)' });
        }
        
        const job = await addDataExportJob({
            organizationId,
            entities,
            format: format || 'json',
            userId,
            notifyEmail
        });
        
        res.status(201).json({ 
            jobId: job.id, 
            queue: 'data-exports',
            message: 'Data export job queued successfully' 
        });
    } catch (error) {
        logger.error({ error }, 'Failed to add data export job');
        res.status(500).json({ error: 'Failed to add data export job' });
    }
});

router.post('/webhooks', async (req, res) => {
    try {
        const { url, payload, secret, headers, eventType } = req.body;
        const organizationId = req.tenantId;
        
        if (!url || !payload || !eventType) {
            return res.status(400).json({ error: 'Missing required fields: url, payload, eventType' });
        }
        
        const job = await addWebhookJob({
            url,
            payload,
            secret,
            headers,
            eventType,
            organizationId
        });
        
        res.status(201).json({ 
            jobId: job.id, 
            queue: 'webhooks',
            message: 'Webhook delivery job queued successfully' 
        });
    } catch (error) {
        logger.error({ error }, 'Failed to add webhook job');
        res.status(500).json({ error: 'Failed to add webhook job' });
    }
});

router.post('/tenant-onboarding', async (req, res) => {
    try {
        const { organizationName, adminEmail, adminName, tier, stripeCustomerId, stripeSubscriptionId } = req.body;
        
        if (!organizationName || !adminEmail || !adminName) {
            return res.status(400).json({ error: 'Missing required fields: organizationName, adminEmail, adminName' });
        }
        
        const job = await addTenantOnboardingJob({
            organizationName,
            adminEmail,
            adminName,
            tier,
            stripeCustomerId,
            stripeSubscriptionId
        });
        
        res.status(201).json({ 
            jobId: job.id, 
            queue: 'tenant-onboarding',
            message: 'Tenant onboarding job queued successfully' 
        });
    } catch (error) {
        logger.error({ error }, 'Failed to add tenant onboarding job');
        res.status(500).json({ error: 'Failed to add tenant onboarding job' });
    }
});

export default router;
