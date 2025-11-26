import prisma from '../../shared/utils/db.js';
import { logger } from '../../shared/utils/logger.js';
import { Parser } from 'json2csv';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import csvParser from 'csv-parser';

export const exportTenantToJSON = async (tenantId, options = {}) => {
  const { includeAuditLogs = true } = options;
  logger.info({ tenantId }, 'Starting tenant data export to JSON');
  
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: tenantId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            region: true,
            assignedStationIds: true,
            contractorId: true,
            isEmailVerified: true,
            createdAt: true,
            updatedAt: true
          }
        },
        stations: true,
        contractors: true,
        audits: true,
        forms: true,
        incidents: true,
        workPermits: true
      }
    });

    if (!organization) {
      throw new Error(`Organization ${tenantId} not found`);
    }

    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        tenantId: organization.id,
        tenantName: organization.name
      },
      organization: {
        id: organization.id,
        name: organization.name,
        ownerId: organization.ownerId,
        subscriptionPlan: organization.subscriptionPlan,
        subscriptionStatus: organization.subscriptionStatus,
        ssoConfig: organization.ssoConfig,
        monthlyRevenue: organization.monthlyRevenue,
        lastActivityAt: organization.lastActivityAt,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt
      },
      users: organization.users,
      stations: organization.stations,
      contractors: organization.contractors,
      audits: organization.audits,
      forms: organization.forms,
      incidents: organization.incidents,
      workPermits: organization.workPermits
    };

    if (includeAuditLogs) {
      const auditLogs = await prisma.auditLog.findMany({
        where: { organizationId: tenantId },
        orderBy: { createdAt: 'desc' }
      });
      exportData.auditLogs = auditLogs;
    }

    logger.info({ tenantId }, 'Tenant data export completed');
    return exportData;
  } catch (error) {
    logger.error({ tenantId, error }, 'Failed to export tenant data');
    throw error;
  }
};

export const exportTenantToCSV = async (tenantId, options = {}) => {
  logger.info({ tenantId }, 'Starting tenant data export to CSV');
  
  try {
    const jsonData = await exportTenantToJSON(tenantId, options);
    const csvFiles = {};

    const models = ['users', 'stations', 'contractors', 'audits', 'forms', 'incidents', 'workPermits'];
    if (options.includeAuditLogs !== false) {
      models.push('auditLogs');
    }

    for (const model of models) {
      if (jsonData[model] && jsonData[model].length > 0) {
        const fields = Object.keys(jsonData[model][0]);
        const parser = new Parser({ fields });
        csvFiles[model] = parser.parse(jsonData[model]);
      } else {
        csvFiles[model] = '';
      }
    }

    csvFiles.organization = new Parser({ 
      fields: Object.keys(jsonData.organization) 
    }).parse([jsonData.organization]);

    csvFiles.metadata = new Parser({ 
      fields: Object.keys(jsonData.metadata) 
    }).parse([jsonData.metadata]);

    logger.info({ tenantId }, 'Tenant data CSV export completed');
    return csvFiles;
  } catch (error) {
    logger.error({ tenantId, error }, 'Failed to export tenant data to CSV');
    throw error;
  }
};

export const exportTenantToZip = async (tenantId, outputPath, format = 'json', options = {}) => {
  logger.info({ tenantId, format, outputPath }, 'Creating tenant export archive');
  
  try {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise(async (resolve, reject) => {
      output.on('close', () => {
        logger.info({ tenantId, bytes: archive.pointer() }, 'Archive created successfully');
        resolve(outputPath);
      });

      archive.on('error', (err) => {
        logger.error({ tenantId, error: err }, 'Archive creation failed');
        reject(err);
      });

      archive.pipe(output);

      if (format === 'json') {
        const jsonData = await exportTenantToJSON(tenantId, options);
        archive.append(JSON.stringify(jsonData, null, 2), { name: 'export.json' });
      } else if (format === 'csv') {
        const csvFiles = await exportTenantToCSV(tenantId, options);
        for (const [name, content] of Object.entries(csvFiles)) {
          archive.append(content, { name: `${name}.csv` });
        }
      } else if (format === 'both') {
        const jsonData = await exportTenantToJSON(tenantId, options);
        archive.append(JSON.stringify(jsonData, null, 2), { name: 'export.json' });
        
        const csvFiles = await exportTenantToCSV(tenantId, options);
        for (const [name, content] of Object.entries(csvFiles)) {
          archive.append(content, { name: `csv/${name}.csv` });
        }
      }

      await archive.finalize();
    });
  } catch (error) {
    logger.error({ tenantId, error }, 'Failed to create export archive');
    throw error;
  }
};

export const deleteTenantData = async (tenantId, options = {}) => {
  const { gdprCompliant = true, createBackup = true } = options;
  
  logger.info({ tenantId, gdprCompliant, createBackup }, 'Starting tenant data deletion');
  
  try {
    if (gdprCompliant) {
      const deletionRecord = await prisma.auditLog.create({
        data: {
          organizationId: tenantId,
          action: 'GDPR_DELETION_REQUEST',
          resource: 'organization',
          resourceId: tenantId,
          ipAddress: '127.0.0.1',
          userAgent: 'system',
          status: 200,
          metadata: {
            requestedAt: new Date().toISOString(),
            gdprCompliant: true
          }
        }
      });
      logger.info({ tenantId, auditLogId: deletionRecord.id }, 'GDPR deletion logged');
    }

    let backupPath = null;
    if (createBackup) {
      const backupDir = path.join(process.cwd(), 'backups', 'gdpr-deletions');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      backupPath = path.join(backupDir, `tenant-${tenantId}-${Date.now()}.zip`);
      await exportTenantToZip(tenantId, backupPath, 'both', { includeAuditLogs: true });
      logger.info({ tenantId, backupPath }, 'Backup created before deletion');
    }

    const result = await prisma.$transaction(async (tx) => {
      const counts = {};

      counts.auditLogs = await tx.auditLog.deleteMany({ where: { organizationId: tenantId } });
      counts.workPermits = await tx.workPermit.deleteMany({ where: { organizationId: tenantId } });
      counts.incidents = await tx.incident.deleteMany({ where: { organizationId: tenantId } });
      counts.audits = await tx.audit.deleteMany({ where: { organizationId: tenantId } });
      counts.forms = await tx.formDefinition.deleteMany({ where: { organizationId: tenantId } });
      counts.contractors = await tx.contractor.deleteMany({ where: { organizationId: tenantId } });
      counts.stations = await tx.station.deleteMany({ where: { organizationId: tenantId } });
      counts.users = await tx.user.deleteMany({ where: { organizationId: tenantId } });
      counts.organization = await tx.organization.delete({ where: { id: tenantId } });

      return counts;
    });

    logger.info({ tenantId, deletedRecords: result, backupPath }, 'Tenant data deleted successfully');
    
    return { success: true, deletedRecords: result, backupPath };
  } catch (error) {
    logger.error({ tenantId, error }, 'Failed to delete tenant data');
    throw error;
  }
};

export const cloneTenant = async (sourceTenantId, targetName, options = {}) => {
  const { 
    includeUsers = false, 
    includeAudits = false,
    includeAuditLogs = false,
    ownerId = null 
  } = options;
  
  logger.info({ sourceTenantId, targetName, options }, 'Starting tenant clone operation');
  
  try {
    const sourceData = await exportTenantToJSON(sourceTenantId, { includeAuditLogs });
    
    if (!sourceData.organization) {
      throw new Error(`Source tenant ${sourceTenantId} not found`);
    }

    const clonedTenant = await prisma.$transaction(async (tx) => {
      const newOrg = await tx.organization.create({
        data: {
          name: targetName,
          ownerId: ownerId || sourceData.organization.ownerId,
          subscriptionPlan: sourceData.organization.subscriptionPlan,
          subscriptionStatus: 'active',
          ssoConfig: sourceData.organization.ssoConfig,
          monthlyRevenue: 0
        }
      });

      const idMapping = {
        organization: { [sourceTenantId]: newOrg.id },
        users: {},
        stations: {},
        contractors: {},
        forms: {}
      };

      if (includeUsers && sourceData.users.length > 0) {
        for (const user of sourceData.users) {
          const newUser = await tx.user.create({
            data: {
              email: `cloned-${Date.now()}-${user.email}`,
              name: user.name,
              password: 'CLONED_CHANGE_PASSWORD',
              role: user.role,
              organizationId: newOrg.id,
              region: user.region,
              assignedStationIds: [],
              isEmailVerified: false
            }
          });
          idMapping.users[user.id] = newUser.id;
        }
      }

      for (const station of sourceData.stations) {
        const newStation = await tx.station.create({
          data: {
            organizationId: newOrg.id,
            name: station.name,
            brand: station.brand,
            region: station.region,
            address: station.address,
            location: station.location,
            riskCategory: station.riskCategory,
            auditFrequency: station.auditFrequency,
            isActive: station.isActive
          }
        });
        idMapping.stations[station.id] = newStation.id;
      }

      for (const contractor of sourceData.contractors) {
        const newContractor = await tx.contractor.create({
          data: {
            organizationId: newOrg.id,
            name: contractor.name,
            licenseNumber: contractor.licenseNumber,
            specialization: contractor.specialization,
            contactPerson: contractor.contactPerson,
            email: contractor.email,
            status: contractor.status
          }
        });
        idMapping.contractors[contractor.id] = newContractor.id;
      }

      for (const form of sourceData.forms) {
        const newForm = await tx.formDefinition.create({
          data: {
            organizationId: newOrg.id,
            name: form.name,
            frequency: form.frequency,
            schema: form.schema
          }
        });
        idMapping.forms[form.id] = newForm.id;
      }

      return { organization: newOrg, idMapping };
    });

    logger.info({ sourceTenantId, targetTenantId: clonedTenant.organization.id }, 'Tenant cloned successfully');
    
    return clonedTenant;
  } catch (error) {
    logger.error({ sourceTenantId, error }, 'Failed to clone tenant');
    throw error;
  }
};

export const validateImportData = (data) => {
  const errors = [];
  
  if (!data.metadata || !data.metadata.version) {
    errors.push('Missing metadata.version');
  }
  
  if (!data.organization || !data.organization.name) {
    errors.push('Missing organization.name');
  }
  
  if (!Array.isArray(data.users)) {
    errors.push('users must be an array');
  }
  
  if (!Array.isArray(data.stations)) {
    errors.push('stations must be an array');
  }
  
  if (!Array.isArray(data.contractors)) {
    errors.push('contractors must be an array');
  }
  
  return { valid: errors.length === 0, errors };
};

export const importTenantData = async (importData, options = {}) => {
  const { targetTenantId = null, createNew = false, dryRun = false } = options;
  
  logger.info({ targetTenantId, createNew, dryRun }, 'Starting tenant data import');
  
  try {
    const validation = validateImportData(importData);
    if (!validation.valid) {
      throw new Error(`Import validation failed: ${validation.errors.join(', ')}`);
    }

    if (dryRun) {
      logger.info('Dry run - validation passed, no data imported');
      return { success: true, dryRun: true, validation };
    }

    const result = await prisma.$transaction(async (tx) => {
      let targetOrg;
      
      if (createNew) {
        targetOrg = await tx.organization.create({
          data: {
            name: importData.organization.name,
            ownerId: importData.organization.ownerId,
            subscriptionPlan: importData.organization.subscriptionPlan || 'free',
            subscriptionStatus: 'active',
            ssoConfig: importData.organization.ssoConfig
          }
        });
      } else {
        if (!targetTenantId) {
          throw new Error('targetTenantId required when createNew is false');
        }
        targetOrg = await tx.organization.findUnique({ where: { id: targetTenantId } });
        if (!targetOrg) {
          throw new Error(`Target tenant ${targetTenantId} not found`);
        }
      }

      const idMapping = { users: {}, stations: {}, contractors: {}, forms: {} };
      const counts = { users: 0, stations: 0, contractors: 0, forms: 0 };

      for (const user of importData.users || []) {
        const newUser = await tx.user.create({
          data: {
            email: user.email,
            name: user.name,
            password: user.password || 'IMPORTED_CHANGE_PASSWORD',
            role: user.role,
            organizationId: targetOrg.id,
            region: user.region,
            assignedStationIds: user.assignedStationIds || [],
            isEmailVerified: user.isEmailVerified || false
          }
        });
        idMapping.users[user.id] = newUser.id;
        counts.users++;
      }

      for (const station of importData.stations || []) {
        const newStation = await tx.station.create({
          data: {
            organizationId: targetOrg.id,
            name: station.name,
            brand: station.brand,
            region: station.region,
            address: station.address,
            location: station.location,
            riskCategory: station.riskCategory,
            auditFrequency: station.auditFrequency,
            isActive: station.isActive !== false
          }
        });
        idMapping.stations[station.id] = newStation.id;
        counts.stations++;
      }

      for (const contractor of importData.contractors || []) {
        const newContractor = await tx.contractor.create({
          data: {
            organizationId: targetOrg.id,
            name: contractor.name,
            licenseNumber: contractor.licenseNumber,
            specialization: contractor.specialization,
            contactPerson: contractor.contactPerson,
            email: contractor.email,
            status: contractor.status || 'Active'
          }
        });
        idMapping.contractors[contractor.id] = newContractor.id;
        counts.contractors++;
      }

      for (const form of importData.forms || []) {
        const newForm = await tx.formDefinition.create({
          data: {
            organizationId: targetOrg.id,
            name: form.name,
            frequency: form.frequency,
            schema: form.schema
          }
        });
        idMapping.forms[form.id] = newForm.id;
        counts.forms++;
      }

      return { organization: targetOrg, idMapping, counts };
    });

    logger.info({ targetTenantId: result.organization.id, counts: result.counts }, 'Tenant data imported successfully');
    
    return { success: true, organization: result.organization, counts: result.counts };
  } catch (error) {
    logger.error({ targetTenantId, error }, 'Failed to import tenant data');
    throw error;
  }
};

export const createRollbackPoint = async (tenantId) => {
  logger.info({ tenantId }, 'Creating rollback point');
  
  try {
    const backupDir = path.join(process.cwd(), 'backups', 'rollback');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const rollbackId = `rollback-${tenantId}-${Date.now()}`;
    const backupPath = path.join(backupDir, `${rollbackId}.zip`);
    
    await exportTenantToZip(tenantId, backupPath, 'json', { includeAuditLogs: false });
    
    logger.info({ tenantId, rollbackId, backupPath }, 'Rollback point created');
    
    return { rollbackId, backupPath };
  } catch (error) {
    logger.error({ tenantId, error }, 'Failed to create rollback point');
    throw error;
  }
};

export const rollbackTenant = async (tenantId, rollbackPath) => {
  logger.info({ tenantId, rollbackPath }, 'Rolling back tenant data');
  
  try {
    if (!fs.existsSync(rollbackPath)) {
      throw new Error(`Rollback file not found: ${rollbackPath}`);
    }

    const rollbackData = JSON.parse(fs.readFileSync(rollbackPath, 'utf8'));
    
    await prisma.$transaction(async (tx) => {
      await tx.workPermit.deleteMany({ where: { organizationId: tenantId } });
      await tx.incident.deleteMany({ where: { organizationId: tenantId } });
      await tx.audit.deleteMany({ where: { organizationId: tenantId } });
      await tx.formDefinition.deleteMany({ where: { organizationId: tenantId } });
      await tx.contractor.deleteMany({ where: { organizationId: tenantId } });
      await tx.station.deleteMany({ where: { organizationId: tenantId } });
      await tx.user.deleteMany({ where: { organizationId: tenantId } });
    });

    await importTenantData(rollbackData, { targetTenantId: tenantId, createNew: false });
    
    logger.info({ tenantId }, 'Tenant data rolled back successfully');
    
    return { success: true, tenantId };
  } catch (error) {
    logger.error({ tenantId, error }, 'Failed to rollback tenant data');
    throw error;
  }
};
