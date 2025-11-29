import prisma from '../shared/utils/db.js';
import { provisionOrganization } from '../core/services/tenantProvisioning.js';
import { authService } from '../core/services/authService.js';

async function cleanup() {
    try {
        await prisma.userRole.deleteMany({
            where: {
                user: {
                    email: 'test-owner@example.com'
                }
            }
        });
        await prisma.user.deleteMany({ where: { email: 'test-owner@example.com' } });
        await prisma.organization.deleteMany({ where: { slug: { startsWith: 'test-company' } } });
        console.log('✓ Cleaned up test data');
    } catch (error) {
        console.log('No test data to clean up');
    }
}

async function testSignupWithOrg() {
    console.log('\n🧪 Testing Self-Service Organization Signup...\n');
    
    try {
        await cleanup();
        
        const result = await provisionOrganization({
            organizationName: 'Test Company Inc',
            ownerName: 'John Doe',
            ownerEmail: 'test-owner@example.com',
            ownerPassword: 'SecurePass123!'
        });
        
        console.log('✅ Organization Created:');
        console.log(`   - Name: ${result.organization.name}`);
        console.log(`   - Slug: ${result.organization.slug}`);
        console.log(`   - Subscription: ${result.organization.subscriptionPlan}`);
        
        console.log('\n✅ Owner User Created:');
        console.log(`   - Name: ${result.user.name}`);
        console.log(`   - Email: ${result.user.email}`);
        console.log(`   - Role: ${result.user.role}`);
        console.log(`   - Email Verified: ${result.user.isEmailVerified}`);
        
        console.log('\n✅ JWT Tokens Generated:');
        console.log(`   - Access Token: ${result.accessToken.substring(0, 30)}...`);
        console.log(`   - Refresh Token: ${result.refreshToken.substring(0, 30)}...`);
        
        const verified = authService.verifyAccessToken(result.accessToken);
        console.log(`\n✅ Token Verified - User ID: ${verified.id}`);
        
        const userRoles = await prisma.userRole.findMany({
            where: { userId: result.user.id },
            include: { role: true }
        });
        console.log(`\n✅ Owner Role Assigned: ${userRoles.map(ur => ur.role.name).join(', ')}`);
        
        const forms = await prisma.formDefinition.count({
            where: { organizationId: result.organization.id }
        });
        console.log(`✅ Default Form Templates Created: ${forms}`);
        
        const testUniqueSlug1 = await provisionOrganization({
            organizationName: 'Test Company Inc',
            ownerName: 'Jane Smith',
            ownerEmail: 'test-owner2@example.com',
            ownerPassword: 'SecurePass123!'
        });
        console.log(`\n✅ Unique Slug Generated: ${testUniqueSlug1.organization.slug}`);
        
        await prisma.userRole.deleteMany({ where: { userId: testUniqueSlug1.user.id } });
        await prisma.user.delete({ where: { id: testUniqueSlug1.user.id } });
        await prisma.organization.delete({ where: { id: testUniqueSlug1.organization.id } });
        
        await cleanup();
        
        console.log('\n✅ All tests passed!\n');
    } catch (error) {
        console.error('❌ Test failed:', error);
        await cleanup();
        process.exit(1);
    }
}

testSignupWithOrg()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (error) => {
        console.error(error);
        await prisma.$disconnect();
        process.exit(1);
    });
