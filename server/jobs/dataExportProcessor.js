import { logger } from '../utils/logger.js';
import { dataExportQueue } from '../queues/index.js';
import prisma from '../utils/db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const exportData = async (organizationId, entities, format = 'json') => {
    const exportData = {};
    
    for (const entity of entities) {
        switch (entity) {
            case 'stations':
                exportData.stations = await prisma.station.findMany({
                    where: { organizationId }
                });
                break;
                
            case 'audits':
                exportData.audits = await prisma.audit.findMany({
                    where: { organizationId },
                    include: { station: true }
                });
                break;
                
            case 'incidents':
                exportData.incidents = await prisma.incident.findMany({
                    where: { organizationId },
                    include: { station: true, reporter: { select: { id: true, name: true, email: true } } }
                });
                break;
                
            case 'work-permits':
                exportData.workPermits = await prisma.workPermit.findMany({
                    where: { organizationId },
                    include: { station: true, contractor: true }
                });
                break;
                
            case 'contractors':
                exportData.contractors = await prisma.contractor.findMany({
                    where: { organizationId }
                });
                break;
                
            case 'users':
                exportData.users = await prisma.user.findMany({
                    where: { organizationId },
                    select: { id: true, email: true, name: true, role: true, region: true, createdAt: true }
                });
                break;
                
            default:
                logger.warn({ entity }, `Unknown entity type: ${entity}`);
        }
    }
    
    return exportData;
};

const saveExportToFile = async (exportData, exportId, format) => {
    const exportsDir = path.join(__dirname, '../public/exports');
    await fs.mkdir(exportsDir, { recursive: true });
    
    const filename = `export-${exportId}.${format}`;
    const filepath = path.join(exportsDir, filename);
    
    if (format === 'json') {
        await fs.writeFile(filepath, JSON.stringify(exportData, null, 2));
    }
    
    return { filename, filepath };
};

const processDataExportJob = async (job) => {
    const { organizationId, entities, format, userId, notifyEmail } = job.data;
    
    logger.info({ 
        jobId: job.id, 
        organizationId, 
        entities 
    }, 'Processing data export job');

    try {
        const data = await exportData(organizationId, entities, format);
        const fileInfo = await saveExportToFile(data, job.id, format);
        
        const totalRecords = Object.values(data).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
        
        if (notifyEmail) {
            const { addEmailJob } = await import('./emailProcessor.js');
            await addEmailJob({
                to: notifyEmail,
                subject: 'Data Export Complete',
                html: `<p>Your data export is complete.</p><p>Export ID: ${job.id}</p><p>Total records: ${totalRecords}</p>`,
                text: `Your data export is complete. Export ID: ${job.id}. Total records: ${totalRecords}`
            });
        }
        
        logger.info({ 
            jobId: job.id, 
            filename: fileInfo.filename,
            totalRecords
        }, 'Data export completed successfully');
        
        return {
            exportId: job.id,
            filename: fileInfo.filename,
            entities,
            totalRecords
        };
    } catch (error) {
        logger.error({ 
            error, 
            jobId: job.id, 
            organizationId 
        }, 'Failed to export data');
        
        throw error;
    }
};

export const startDataExportProcessor = (concurrency = 2) => {
    dataExportQueue.process(concurrency, processDataExportJob);
    
    dataExportQueue.on('completed', (job, result) => {
        logger.info({ 
            jobId: job.id, 
            result 
        }, 'Data export job completed');
    });

    dataExportQueue.on('failed', (job, error) => {
        logger.error({ 
            jobId: job.id, 
            error,
            attempts: job.attemptsMade
        }, 'Data export job failed');
    });

    logger.info({ concurrency }, 'Data export processor started');
};

export const addDataExportJob = async (exportData, options = {}) => {
    const job = await dataExportQueue.add(exportData, {
        ...options,
        timeout: options.timeout || 600000
    });
    
    logger.info({ 
        jobId: job.id, 
        organizationId: exportData.organizationId,
        entities: exportData.entities
    }, 'Data export job added to queue');
    
    return job;
};
