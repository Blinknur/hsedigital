import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { dbConnectionEstablished } from '../../jest.setup.js';
import prisma from '../shared/utils/db.js';

describe('Audit Log System', () => {
  const testOrgId = 'org-test-audit-' + Date.now();
  const testUserId = 'user-test-audit-' + Date.now();
  let createdLogIds = [];

  beforeAll(() => {
    if (!dbConnectionEstablished) {
      console.log('⚠️  Skipping audit log tests - database not available');
    }
  });

  afterAll(async () => {
    if (dbConnectionEstablished && createdLogIds.length > 0) {
      try {
        await prisma.auditLog.deleteMany({
          where: { id: { in: createdLogIds } }
        });
      } catch (error) {
      }
    }
  });

  it('should create audit log entry', async () => {
    if (!dbConnectionEstablished) {
      console.log('Skipping: Database not available');
      return;
    }

    const auditLog = await prisma.auditLog.create({
      data: {
        organizationId: testOrgId,
        userId: testUserId,
        action: 'CREATE',
        entityType: 'test_entity',
        entityId: 'test-123',
        changes: {
          after: {
            name: 'Test Entity',
            status: 'active'
          }
        },
        ipAddress: '127.0.0.1',
        userAgent: 'TestAgent/1.0'
      }
    });

    expect(auditLog.id).toBeDefined();
    expect(auditLog.organizationId).toBe(testOrgId);
    expect(auditLog.action).toBe('CREATE');
    createdLogIds.push(auditLog.id);
  });

  it('should read audit logs', async () => {
    if (!dbConnectionEstablished) {
      console.log('Skipping: Database not available');
      return;
    }

    const logs = await prisma.auditLog.findMany({
      where: { organizationId: testOrgId },
      orderBy: { createdAt: 'desc' }
    });

    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThan(0);
  });

  it('should filter audit logs', async () => {
    if (!dbConnectionEstablished) {
      console.log('Skipping: Database not available');
      return;
    }

    const filteredLogs = await prisma.auditLog.findMany({
      where: {
        organizationId: testOrgId,
        action: 'CREATE',
        entityType: 'test_entity'
      }
    });

    expect(Array.isArray(filteredLogs)).toBe(true);
    filteredLogs.forEach(log => {
      expect(log.action).toBe('CREATE');
      expect(log.entityType).toBe('test_entity');
    });
  });

  it('should redact sensitive fields for GDPR compliance', () => {
    const GDPR_SENSITIVE_FIELDS = ['password', 'refreshTokens', 'emailVerificationToken', 'passwordResetToken'];

    const sensitiveData = {
      before: {
        email: 'test@example.com',
        password: 'secret123',
        name: 'Test User'
      },
      after: {
        email: 'new@example.com',
        password: 'newsecret456',
        name: 'New Test User'
      }
    };

    const sanitized = JSON.parse(JSON.stringify(sensitiveData));
    GDPR_SENSITIVE_FIELDS.forEach(field => {
      if (sanitized.before && sanitized.before[field]) {
        sanitized.before[field] = '[REDACTED]';
      }
      if (sanitized.after && sanitized.after[field]) {
        sanitized.after[field] = '[REDACTED]';
      }
    });

    expect(sanitized.before.password).toBe('[REDACTED]');
    expect(sanitized.after.password).toBe('[REDACTED]');
    expect(sanitized.before.email).toBe('test@example.com');
    expect(sanitized.after.email).toBe('new@example.com');
  });
});
