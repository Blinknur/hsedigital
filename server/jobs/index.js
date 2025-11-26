import { startEmailProcessor } from './emailProcessor.js';
import { startReportProcessor } from './reportProcessor.js';
import { startDataExportProcessor } from './dataExportProcessor.js';
import { startWebhookProcessor } from './webhookProcessor.js';
import { startTenantOnboardingProcessor } from './tenantOnboardingProcessor.js';
import { logger } from '../utils/logger.js';

export const startAllProcessors = () => {
    const concurrency = parseInt(process.env.QUEUE_CONCURRENCY || '5');
    
    startEmailProcessor(concurrency);
    startReportProcessor(Math.max(1, Math.floor(concurrency * 0.6)));
    startDataExportProcessor(Math.max(1, Math.floor(concurrency * 0.4)));
    startWebhookProcessor(concurrency);
    startTenantOnboardingProcessor(Math.max(1, Math.floor(concurrency * 0.4)));
    
    logger.info('All job processors started');
};

export * from './emailProcessor.js';
export * from './reportProcessor.js';
export * from './dataExportProcessor.js';
export * from './webhookProcessor.js';
export * from './tenantOnboardingProcessor.js';
