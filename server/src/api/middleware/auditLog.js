import prisma from '../../shared/utils/db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { notificationService } from '../../core/services/notificationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUDIT_LOG_FILE = path.join(__dirname, '../logs/security-audit.log');

const sensitiveOperations = {
    'POST /api/auth/login': 'Authentication attempt',
    'POST /api/auth/register': 'User registration',
    'POST /api/auth/password-reset': 'Password reset',
    'DELETE /api/users/:id': 'User deletion',
    'POST /api/audits': 'Audit creation',
    'PUT /api/audits/:id': 'Audit modification',
    'DELETE /api/audits/:id': 'Audit deletion',
    'POST /api/organizations': 'Organization creation',
    'PUT /api/organizations/:id': 'Organization modification',
    'DELETE /api/organizations/:id': 'Organization deletion',
    'POST /api/rbac/roles': 'Role creation',
    'PUT /api/rbac/roles/:id': 'Role modification',
    'DELETE /api/rbac/roles/:id': 'Role deletion',
    'POST /api/rbac/permissions': 'Permission assignment',
    'DELETE /api/rbac/permissions': 'Permission removal',
};

const isSensitiveOperation = (method, path) => {
    const normalizedPath = path.replace(/\/[a-z0-9]{25}(?=\/|$)/gi, '/:id');
    const key = `${method} ${normalizedPath}`;
    return sensitiveOperations[key];
};

const logToFile = async (logEntry) => {
    try {
        const logDir = path.dirname(AUDIT_LOG_FILE);
        await fs.mkdir(logDir, { recursive: true });
        
        const logLine = JSON.stringify(logEntry) + '\n';
        await fs.appendFile(AUDIT_LOG_FILE, logLine);
    } catch (error) {
        console.error('Failed to write audit log to file:', error);
    }
};

const createAuditLog = async (logData) => {
    try {
        await prisma.$executeRaw`
            INSERT INTO audit_logs (
                id, user_id, organization_id, action, resource, 
                resource_id, ip_address, user_agent, status, 
                error_message, metadata, created_at
            ) VALUES (
                gen_random_uuid()::text,
                ${logData.userId || null},
                ${logData.organizationId || null},
                ${logData.action},
                ${logData.resource},
                ${logData.resourceId || null},
                ${logData.ipAddress},
                ${logData.userAgent},
                ${logData.status},
                ${logData.errorMessage || null},
                ${JSON.stringify(logData.metadata || {})}::jsonb,
                NOW()
            )
            ON CONFLICT DO NOTHING
        `;
    } catch (error) {
        console.error('Failed to create audit log in database:', error);
    }
};

export const auditLogger = (options = {}) => {
    const { logToDatabase = true, logToFileSystem = true } = options;
    
    return async (req, res, next) => {
        const operationDescription = isSensitiveOperation(req.method, req.path);
        
        if (!operationDescription) {
            return next();
        }
        
        const startTime = Date.now();
        const originalJson = res.json.bind(res);
        
        res.json = function(body) {
            const duration = Date.now() - startTime;
            
            const logEntry = {
                timestamp: new Date().toISOString(),
                userId: req.user?.id || null,
                organizationId: req.tenantId || req.user?.organizationId || null,
                action: operationDescription,
                resource: req.path,
                resourceId: req.params?.id || null,
                method: req.method,
                ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
                userAgent: req.headers['user-agent'] || 'Unknown',
                status: res.statusCode,
                duration,
                errorMessage: res.statusCode >= 400 ? body?.error : null,
                metadata: {
                    query: req.query,
                    bodyKeys: Object.keys(req.body || {}),
                }
            };
            
            if (logToFileSystem) {
                logToFile(logEntry).catch(console.error);
            }
            
            if (logToDatabase) {
                createAuditLog(logEntry).catch(console.error);
            }
            
            console.log(`[AUDIT] ${logEntry.action} by user ${logEntry.userId} - Status: ${logEntry.status}`);
            
            return originalJson(body);
        };
        
        next();
    };
};

export const logSecurityEvent = async (eventType, details) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        eventType,
        severity: details.severity || 'INFO',
        ...details
    };
    
    await logToFile(logEntry);
    console.log(`[SECURITY] ${eventType}:`, details);
};

// Additional audit middleware for entity-level tracking
const GDPR_SENSITIVE_FIELDS = ['password', 'refreshTokens', 'emailVerificationToken', 'passwordResetToken'];

const sanitizeChanges = (changes) => {
  if (!changes) return null;
  
  const sanitized = { ...changes };
  
  if (sanitized.before) {
    GDPR_SENSITIVE_FIELDS.forEach(field => {
      if (sanitized.before[field]) {
        sanitized.before[field] = '[REDACTED]';
      }
    });
  }
  
  if (sanitized.after) {
    GDPR_SENSITIVE_FIELDS.forEach(field => {
      if (sanitized.after[field]) {
        sanitized.after[field] = '[REDACTED]';
      }
    });
  }
  
  return sanitized;
};

export const auditLog = (entityType) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    
    res.json = async function(data) {
      try {
        if (!req.user || !req.tenantId) {
          return originalJson(data);
        }

        let action = 'READ';
        let entityId = null;
        let changes = null;

        if (req.method === 'POST') {
          action = 'CREATE';
          entityId = data?.id || null;
          changes = { after: data };
        } else if (req.method === 'PUT' || req.method === 'PATCH') {
          action = 'UPDATE';
          entityId = req.params.id || data?.id || null;
          
          if (req.originalEntity) {
            changes = {
              before: req.originalEntity,
              after: data
            };
          } else {
            changes = { after: data };
          }
        } else if (req.method === 'DELETE') {
          action = 'DELETE';
          entityId = req.params.id || null;
          changes = req.originalEntity ? { before: req.originalEntity } : null;
        }

        if (['CREATE', 'UPDATE', 'DELETE'].includes(action)) {
          const auditLogEntry = await prisma.auditLog.create({
            data: {
              organizationId: req.tenantId,
              userId: req.user.id,
              action,
              resource: req.path,
              resourceId: entityId,
              ipAddress: req.ipAddress || req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
              userAgent: req.userAgent || req.headers['user-agent'] || 'Unknown',
              status: res.statusCode,
              entityType,
              entityId,
              changes: sanitizeChanges(changes)
            }
          });

          notificationService.auditLogCreated(req.tenantId, auditLogEntry);
        }
      } catch (error) {
        console.error('Audit log error:', error);
      }

      return originalJson(data);
    };

    next();
  };
};

export const captureOriginalEntity = (entityType, idParam = 'id') => {
  return async (req, res, next) => {
    if (req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
      try {
        const entityId = req.params[idParam];
        if (entityId && req.tenantId) {
          const model = prisma[entityType];
          if (model) {
            req.originalEntity = await model.findFirst({
              where: {
                id: entityId,
                organizationId: req.tenantId
              }
            });
          }
        }
      } catch (error) {
        console.error('Error capturing original entity:', error);
      }
    }
    next();
  };
};
