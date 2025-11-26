import express from 'express';
import { 
  exportTenantToJSON,
  exportTenantToCSV,
  exportTenantToZip,
  deleteTenantData,
  cloneTenant,
  validateImportData,
  importTenantData,
  createRollbackPoint,
  rollbackTenant
} from '../services/tenantMigrationService.js';
import { validateRequest, tenantCloneSchema, tenantImportSchema } from '../middleware/validation.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.get('/export/json', asyncHandler(async (req, res) => {
  const { tenantId } = req.query;
  const includeAuditLogs = req.query.includeAuditLogs !== 'false';
  
  if (!tenantId) {
    return res.status(400).json({ error: 'tenantId is required' });
  }

  const exportData = await exportTenantToJSON(tenantId, { includeAuditLogs });
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="tenant-${tenantId}-export.json"`);
  res.json(exportData);
}));

router.get('/export/csv', asyncHandler(async (req, res) => {
  const { tenantId } = req.query;
  const includeAuditLogs = req.query.includeAuditLogs !== 'false';
  
  if (!tenantId) {
    return res.status(400).json({ error: 'tenantId is required' });
  }

  const csvFiles = await exportTenantToCSV(tenantId, { includeAuditLogs });
  
  res.json(csvFiles);
}));

router.get('/export/zip', asyncHandler(async (req, res) => {
  const { tenantId, format = 'json' } = req.query;
  const includeAuditLogs = req.query.includeAuditLogs !== 'false';
  
  if (!tenantId) {
    return res.status(400).json({ error: 'tenantId is required' });
  }

  if (!['json', 'csv', 'both'].includes(format)) {
    return res.status(400).json({ error: 'format must be json, csv, or both' });
  }

  const exportDir = path.join(process.cwd(), 'backups', 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const filename = `tenant-${tenantId}-${Date.now()}.zip`;
  const filepath = path.join(exportDir, filename);
  
  await exportTenantToZip(tenantId, filepath, format, { includeAuditLogs });
  
  res.download(filepath, filename, (err) => {
    if (err) {
      logger.error({ error: err }, 'Error sending file');
    }
    fs.unlink(filepath, (unlinkErr) => {
      if (unlinkErr) {
        logger.error({ error: unlinkErr }, 'Error deleting temp file');
      }
    });
  });
}));

router.delete('/delete/:tenantId', asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  const gdprCompliant = req.body.gdprCompliant !== false;
  const createBackup = req.body.createBackup !== false;
  
  const result = await deleteTenantData(tenantId, { gdprCompliant, createBackup });
  
  res.json(result);
}));

router.post('/clone', validateRequest(tenantCloneSchema), asyncHandler(async (req, res) => {
  const { sourceTenantId, targetName, includeUsers, includeAudits, includeAuditLogs, ownerId } = req.validatedData;

  const result = await cloneTenant(sourceTenantId, targetName, {
    includeUsers,
    includeAudits,
    includeAuditLogs,
    ownerId
  });
  
  res.status(201).json(result);
}));

router.post('/import/validate', asyncHandler(async (req, res) => {
  const importData = req.body;
  
  const validation = validateImportData(importData);
  
  res.json(validation);
}));

router.post('/import', validateRequest(tenantImportSchema), asyncHandler(async (req, res) => {
  const { importData, targetTenantId, createNew, dryRun } = req.validatedData;

  const result = await importTenantData(importData, {
    targetTenantId,
    createNew,
    dryRun
  });
  
  res.json(result);
}));

router.post('/rollback/create/:tenantId', asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  
  const rollbackPoint = await createRollbackPoint(tenantId);
  
  res.json(rollbackPoint);
}));

router.post('/rollback/restore/:tenantId', asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  const { rollbackPath } = req.body;
  
  if (!rollbackPath) {
    return res.status(400).json({ error: 'rollbackPath is required' });
  }

  const result = await rollbackTenant(tenantId, rollbackPath);
  
  res.json(result);
}));

export default router;