import { logger } from '../utils/logger.js';
import { reportQueue } from '../queues/index.js';
import prisma from '../utils/db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const generateReport = async (type, organizationId, filters = {}, format = 'json') => {
    let data;
    
    switch (type) {
        case 'audits':
            data = await prisma.audit.findMany({
                where: {
                    organizationId,
                    ...filters
                },
                include: {
                    station: true
                }
            });
            break;
            
        case 'incidents':
            data = await prisma.incident.findMany({
                where: {
                    organizationId,
                    ...filters
                },
                include: {
                    station: true,
                    reporter: {
                        select: { id: true, name: true, email: true }
                    }
                }
            });
            break;
            
        case 'work-permits':
            data = await prisma.workPermit.findMany({
                where: {
                    organizationId,
                    ...filters
                },
                include: {
                    station: true,
                    contractor: true
                }
            });
            break;
            
        case 'compliance':
            const audits = await prisma.audit.findMany({
                where: { organizationId, ...filters }
            });
            const incidents = await prisma.incident.findMany({
                where: { organizationId, ...filters }
            });
            data = {
                summary: {
                    totalAudits: audits.length,
                    totalIncidents: incidents.length,
                    criticalIncidents: incidents.filter(i => i.severity === 'Critical').length,
                    completedAudits: audits.filter(a => a.status === 'Completed').length
                },
                audits,
                incidents
            };
            break;
            
        default:
            throw new Error(`Unknown report type: ${type}`);
    }
    
    return { data, format };
};

const saveReportToFile = async (reportData, reportId, format) => {
    const reportsDir = path.join(__dirname, '../public/reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    const filename = `report-${reportId}.${format}`;
    const filepath = path.join(reportsDir, filename);
    
    if (format === 'json') {
        await fs.writeFile(filepath, JSON.stringify(reportData, null, 2));
    } else if (format === 'csv') {
        const csv = convertToCSV(reportData);
        await fs.writeFile(filepath, csv);
    }
    
    return { filename, filepath };
};

const convertToCSV = (data) => {
    if (!Array.isArray(data)) {
        data = [data];
    }
    
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const rows = data.map(row => 
        headers.map(header => JSON.stringify(row[header] || '')).join(',')
    );
    
    return [headers.join(','), ...rows].join('\n');
};

const processReportJob = async (job) => {
    const { type, organizationId, filters, format, userId, notifyEmail } = job.data;
    
    logger.info({ 
        jobId: job.id, 
        type, 
        organizationId 
    }, 'Processing report generation job');

    try {
        const result = await generateReport(type, organizationId, filters, format);
        const fileInfo = await saveReportToFile(result.data, job.id, format);
        
        if (notifyEmail) {
            const { addEmailJob } = await import('./emailProcessor.js');
            await addEmailJob({
                to: notifyEmail,
                subject: `Report Ready: ${type}`,
                html: `<p>Your ${type} report is ready for download.</p><p>Report ID: ${job.id}</p>`,
                text: `Your ${type} report is ready. Report ID: ${job.id}`
            });
        }
        
        logger.info({ 
            jobId: job.id, 
            type, 
            filename: fileInfo.filename 
        }, 'Report generated successfully');
        
        return {
            reportId: job.id,
            type,
            filename: fileInfo.filename,
            recordCount: Array.isArray(result.data) ? result.data.length : 1
        };
    } catch (error) {
        logger.error({ 
            error, 
            jobId: job.id, 
            type, 
            organizationId 
        }, 'Failed to generate report');
        
        throw error;
    }
};

export const startReportProcessor = (concurrency = 3) => {
    reportQueue.process(concurrency, processReportJob);
    
    reportQueue.on('completed', (job, result) => {
        logger.info({ 
            jobId: job.id, 
            result 
        }, 'Report job completed');
    });

    reportQueue.on('failed', (job, error) => {
        logger.error({ 
            jobId: job.id, 
            error,
            attempts: job.attemptsMade
        }, 'Report job failed');
    });

    logger.info({ concurrency }, 'Report processor started');
};

export const addReportJob = async (reportData, options = {}) => {
    const job = await reportQueue.add(reportData, {
        ...options,
        timeout: options.timeout || 300000
    });
    
    logger.info({ 
        jobId: job.id, 
        type: reportData.type, 
        organizationId: reportData.organizationId 
    }, 'Report job added to queue');
    
    return job;
};
