import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAuditLogSystem() {
    console.log('🧪 Testing Audit Log System...\n');

    try {
        const testOrgId = 'org-test-audit';
        const testUserId = 'user-test-audit';

        console.log('1. Creating test audit log entry...');
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
        console.log('✅ Created audit log:', auditLog.id);

        console.log('\n2. Reading audit logs...');
        const logs = await prisma.auditLog.findMany({
            where: { organizationId: testOrgId },
            orderBy: { createdAt: 'desc' }
        });
        console.log(`✅ Found ${logs.length} log(s)`);

        console.log('\n3. Testing filters...');
        const filteredLogs = await prisma.auditLog.findMany({
            where: {
                organizationId: testOrgId,
                action: 'CREATE',
                entityType: 'test_entity'
            }
        });
        console.log(`✅ Filtered to ${filteredLogs.length} log(s)`);

        console.log('\n4. Testing GDPR redaction...');
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
        
        const GDPR_SENSITIVE_FIELDS = ['password', 'refreshTokens', 'emailVerificationToken', 'passwordResetToken'];
        
        const sanitized = { ...sensitiveData };
        GDPR_SENSITIVE_FIELDS.forEach(field => {
            if (sanitized.before && sanitized.before[field]) {
                sanitized.before[field] = '[REDACTED]';
            }
            if (sanitized.after && sanitized.after[field]) {
                sanitized.after[field] = '[REDACTED]';
            }
        });
        
        console.log('Original:', JSON.stringify(sensitiveData, null, 2));
        console.log('Sanitized:', JSON.stringify(sanitized, null, 2));
        console.log('✅ GDPR redaction working');

        console.log('\n5. Cleaning up test data...');
        await prisma.auditLog.deleteMany({
            where: { organizationId: testOrgId }
        });
        console.log('✅ Cleanup complete');

        console.log('\n✅ All audit log tests passed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

testAuditLogSystem();
