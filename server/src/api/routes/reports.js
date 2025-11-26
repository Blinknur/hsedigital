import express from 'express';
import { createTracedPrismaClient } from '../../shared/utils/tracedPrismaClient.js';
import { logger } from '../../shared/utils/logger.js';
import { reportService } from '../../core/services/reportService.js';
import { reportScheduler } from '../../core/services/reportScheduler.js';
import { s3Service } from '../../core/services/s3Service.js';

const router = express.Router();
const prisma = createTracedPrismaClient();

router.get('/', async (req, res, next) => {
  try {
    const { type, status } = req.query;
    const where = { organizationId: req.tenantId };
    
    if (type) where.type = type;
    if (status) where.status = status;

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(reports);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const report = await prisma.report.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.tenantId,
      },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, type, filters, parameters } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    const report = await prisma.report.create({
      data: {
        organizationId: req.tenantId,
        name,
        type,
        format: 'pdf',
        status: 'pending',
        filters: filters || {},
        parameters: parameters || {},
        generatedBy: req.user.id,
      },
    });

    setImmediate(async () => {
      try {
        await reportService.generateReport(report.id);
      } catch (error) {
        logger.error({ error, reportId: report.id }, 'Background report generation failed');
      }
    });

    res.status(202).json(report);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/download', async (req, res, next) => {
  try {
    const report = await prisma.report.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.tenantId,
      },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (report.status !== 'completed') {
      return res.status(400).json({ error: `Report is ${report.status}` });
    }

    const url = await s3Service.getSignedUrl(report.fileKey, 3600);
    res.json({ url });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const report = await prisma.report.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.tenantId,
      },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (report.fileKey) {
      await s3Service.deleteFile(report.fileKey).catch(err => 
        logger.error({ err, fileKey: report.fileKey }, 'Failed to delete report file from storage')
      );
    }

    await prisma.report.delete({ where: { id: req.params.id } });
    res.json({ message: 'Report deleted' });
  } catch (error) {
    next(error);
  }
});

router.get('/templates/list', async (req, res, next) => {
  try {
    const templates = await prisma.reportTemplate.findMany({
      where: { organizationId: req.tenantId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(templates);
  } catch (error) {
    next(error);
  }
});

router.post('/templates', async (req, res, next) => {
  try {
    const { name, description, type, template, branding, isDefault } = req.body;

    if (!name || !type || !template) {
      return res.status(400).json({ error: 'Name, type, and template are required' });
    }

    if (isDefault) {
      await prisma.reportTemplate.updateMany({
        where: { organizationId: req.tenantId, type },
        data: { isDefault: false },
      });
    }

    const reportTemplate = await prisma.reportTemplate.create({
      data: {
        organizationId: req.tenantId,
        name,
        description,
        type,
        template,
        branding: branding || {},
        isDefault: isDefault || false,
      },
    });

    res.status(201).json(reportTemplate);
  } catch (error) {
    next(error);
  }
});

router.put('/templates/:id', async (req, res, next) => {
  try {
    const { name, description, template, branding, isDefault } = req.body;

    if (isDefault) {
      const existingTemplate = await prisma.reportTemplate.findFirst({
        where: { id: req.params.id, organizationId: req.tenantId },
      });

      if (existingTemplate) {
        await prisma.reportTemplate.updateMany({
          where: { organizationId: req.tenantId, type: existingTemplate.type },
          data: { isDefault: false },
        });
      }
    }

    const reportTemplate = await prisma.reportTemplate.updateMany({
      where: {
        id: req.params.id,
        organizationId: req.tenantId,
      },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(template && { template }),
        ...(branding && { branding }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    const updated = await prisma.reportTemplate.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/templates/:id', async (req, res, next) => {
  try {
    await prisma.reportTemplate.deleteMany({
      where: {
        id: req.params.id,
        organizationId: req.tenantId,
      },
    });

    res.json({ message: 'Template deleted' });
  } catch (error) {
    next(error);
  }
});

router.get('/schedules/list', async (req, res, next) => {
  try {
    const schedules = await prisma.reportSchedule.findMany({
      where: { organizationId: req.tenantId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(schedules);
  } catch (error) {
    next(error);
  }
});

router.post('/schedules', async (req, res, next) => {
  try {
    const { name, reportType, cronExpression, filters, parameters, recipients, isActive } = req.body;

    if (!name || !reportType || !cronExpression) {
      return res.status(400).json({ error: 'Name, report type, and cron expression are required' });
    }

    const schedule = await reportScheduler.addSchedule({
      organizationId: req.tenantId,
      name,
      reportType,
      cronExpression,
      filters: filters || {},
      parameters: parameters || {},
      recipients: recipients || [],
      isActive: isActive !== false,
    });

    res.status(201).json(schedule);
  } catch (error) {
    next(error);
  }
});

router.put('/schedules/:id', async (req, res, next) => {
  try {
    const schedule = await prisma.reportSchedule.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.tenantId,
      },
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const { name, reportType, cronExpression, filters, parameters, recipients, isActive } = req.body;

    const updated = await reportScheduler.updateSchedule(req.params.id, {
      ...(name && { name }),
      ...(reportType && { reportType }),
      ...(cronExpression && { cronExpression }),
      ...(filters && { filters }),
      ...(parameters && { parameters }),
      ...(recipients && { recipients }),
      ...(isActive !== undefined && { isActive }),
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/schedules/:id', async (req, res, next) => {
  try {
    const schedule = await prisma.reportSchedule.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.tenantId,
      },
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    await reportScheduler.deleteSchedule(req.params.id);
    res.json({ message: 'Schedule deleted' });
  } catch (error) {
    next(error);
  }
});

router.post('/schedules/:id/run', async (req, res, next) => {
  try {
    const schedule = await prisma.reportSchedule.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.tenantId,
      },
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    setImmediate(async () => {
      try {
        await reportScheduler.executeScheduledReport(req.params.id);
      } catch (error) {
        logger.error({ error, scheduleId: req.params.id }, 'Manual schedule execution failed');
      }
    });

    res.json({ message: 'Schedule execution started' });
  } catch (error) {
    next(error);
  }
});

export default router;
