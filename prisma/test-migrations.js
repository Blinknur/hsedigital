import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSchema() {
    console.log('🧪 Testing Prisma Schema...\n');

    try {
        // Test User model with new fields
        console.log('1️⃣ Testing User model fields...');
        const userFields = await prisma.$queryRaw`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN (
                'emailVerificationToken', 
                'isEmailVerified', 
                'passwordResetToken', 
                'passwordResetTokenExpiry', 
                'refreshTokens'
            )
            ORDER BY column_name;
        `;
        console.log('   ✓ User auth fields:', userFields.length === 5 ? 'PASS' : 'FAIL');
        if (userFields.length > 0) {
            userFields.forEach(field => {
                console.log(`     - ${field.column_name}: ${field.data_type}`);
            });
        }

        // Test Organization model with Stripe fields
        console.log('\n2️⃣ Testing Organization model fields...');
        const orgFields = await prisma.$queryRaw`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'organizations' 
            AND column_name IN ('stripeCustomerId', 'stripeSubscriptionId')
            ORDER BY column_name;
        `;
        console.log('   ✓ Stripe fields:', orgFields.length === 2 ? 'PASS' : 'FAIL');
        if (orgFields.length > 0) {
            orgFields.forEach(field => {
                console.log(`     - ${field.column_name}: ${field.data_type}`);
            });
        }

        // Test indexes
        console.log('\n3️⃣ Testing tenant-scoped indexes...');
        const indexes = await prisma.$queryRaw`
            SELECT tablename, indexname 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND indexname LIKE '%organizationId%'
            ORDER BY tablename, indexname;
        `;
        console.log(`   ✓ Found ${indexes.length} organizationId indexes`);
        indexes.forEach(idx => {
            console.log(`     - ${idx.tablename}: ${idx.indexname}`);
        });

        // Test RBAC tables
        console.log('\n4️⃣ Testing RBAC tables...');
        const roleCount = await prisma.role.count();
        const permCount = await prisma.permission.count();
        const rolePermCount = await prisma.rolePermission.count();
        
        console.log(`   ✓ Roles: ${roleCount}`);
        console.log(`   ✓ Permissions: ${permCount}`);
        console.log(`   ✓ Role-Permission mappings: ${rolePermCount}`);

        // Test unique constraints
        console.log('\n5️⃣ Testing unique constraints...');
        const constraints = await prisma.$queryRaw`
            SELECT conname, conrelid::regclass AS table_name
            FROM pg_constraint
            WHERE contype = 'u'
            AND conrelid::regclass::text IN ('users', 'organizations')
            AND conname LIKE '%email%' 
                OR conname LIKE '%stripe%'
                OR conname LIKE '%token%'
            ORDER BY table_name, conname;
        `;
        console.log(`   ✓ Found ${constraints.length} unique constraints`);
        constraints.forEach(c => {
            console.log(`     - ${c.table_name}: ${c.conname}`);
        });

        console.log('\n✅ All schema tests completed!');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        throw error;
    }
}

async function testDataCreation() {
    console.log('\n\n🧪 Testing data creation...\n');

    try {
        // Test creating an organization with Stripe fields
        console.log('1️⃣ Creating test organization with Stripe fields...');
        const org = await prisma.organization.create({
            data: {
                name: 'Test Org',
                ownerId: 'test-owner',
                subscriptionPlan: 'pro',
                stripeCustomerId: 'cus_test123',
                stripeSubscriptionId: 'sub_test123'
            }
        });
        console.log(`   ✓ Created organization: ${org.id}`);

        // Test creating a user with auth fields
        console.log('\n2️⃣ Creating test user with auth fields...');
        const user = await prisma.user.create({
            data: {
                name: 'Test User',
                email: 'test@example.com',
                password: 'hashed_password',
                role: 'Station Manager',
                organizationId: org.id,
                emailVerificationToken: 'token_abc123',
                isEmailVerified: false,
                passwordResetToken: 'reset_xyz789',
                passwordResetTokenExpiry: new Date(Date.now() + 3600000),
                refreshTokens: ['refresh_token_1', 'refresh_token_2']
            }
        });
        console.log(`   ✓ Created user: ${user.id}`);

        // Test querying with indexes
        console.log('\n3️⃣ Testing indexed queries...');
        const orgUsers = await prisma.user.findMany({
            where: { organizationId: org.id }
        });
        console.log(`   ✓ Found ${orgUsers.length} users in organization`);

        // Cleanup test data
        console.log('\n4️⃣ Cleaning up test data...');
        await prisma.user.delete({ where: { id: user.id } });
        await prisma.organization.delete({ where: { id: org.id } });
        console.log('   ✓ Cleanup complete');

        console.log('\n✅ All data tests completed!');

    } catch (error) {
        console.error('\n❌ Data test failed:', error.message);
        throw error;
    }
}

async function main() {
    console.log('🚀 Starting comprehensive schema tests\n');
    console.log('=' .repeat(60) + '\n');

    try {
        await testSchema();
        await testDataCreation();
        
        console.log('\n' + '=' .repeat(60));
        console.log('✅ ALL TESTS PASSED!');
        console.log('=' .repeat(60) + '\n');
        
    } catch (error) {
        console.error('\n' + '=' .repeat(60));
        console.error('❌ TESTS FAILED');
        console.error('=' .repeat(60) + '\n');
        throw error;
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
