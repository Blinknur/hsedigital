import prisma from '../utils/db.js';
import {
    createCheckoutSession,
    handleCheckoutComplete,
    handleSubscriptionUpdated,
    handleSubscriptionDeleted,
    handlePaymentFailed
} from '../services/stripeService.js';

async function testStripeIntegration() {
    console.log('🧪 Testing Stripe Integration...\n');

    let testOrgId;
    let errors = [];

    try {
        const testOrg = await prisma.organization.create({
            data: {
                name: 'Test Stripe Org',
                ownerId: 'test-owner-123',
                subscriptionPlan: 'free',
                subscriptionStatus: 'active'
            }
        });
        testOrgId = testOrg.id;
        console.log('✅ Created test organization:', testOrgId);

        console.log('\n--- Testing Checkout Complete Handler ---');
        const mockSession = {
            client_reference_id: testOrgId,
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            metadata: {
                organizationId: testOrgId,
                planId: 'professional'
            }
        };

        await handleCheckoutComplete(mockSession);
        
        let org = await prisma.organization.findUnique({ where: { id: testOrgId } });
        
        if (org.stripeCustomerId === 'cus_test_123' &&
            org.stripeSubscriptionId === 'sub_test_123' &&
            org.subscriptionPlan === 'professional' &&
            org.subscriptionStatus === 'active') {
            console.log('✅ Checkout complete handler working correctly');
        } else {
            const error = '❌ Checkout complete handler failed to update organization';
            console.error(error);
            console.error('  Expected: customerId=cus_test_123, subscriptionId=sub_test_123, plan=professional, status=active');
            console.error('  Got:', org);
            errors.push(error);
        }

        console.log('\n--- Testing Subscription Updated Handler ---');
        const mockSubscription = {
            id: 'sub_test_123',
            status: 'past_due',
            metadata: {
                planId: 'professional'
            }
        };

        await handleSubscriptionUpdated(mockSubscription);
        
        org = await prisma.organization.findUnique({ where: { id: testOrgId } });
        
        if (org.subscriptionStatus === 'past_due') {
            console.log('✅ Subscription updated handler working correctly');
        } else {
            const error = '❌ Subscription updated handler failed';
            console.error(error, '- Expected status: past_due, Got:', org.subscriptionStatus);
            errors.push(error);
        }

        console.log('\n--- Testing Subscription Deleted Handler ---');
        await handleSubscriptionDeleted(mockSubscription);
        
        org = await prisma.organization.findUnique({ where: { id: testOrgId } });
        
        if (org.subscriptionStatus === 'canceled' &&
            org.subscriptionPlan === 'free' &&
            org.stripeSubscriptionId === null) {
            console.log('✅ Subscription deleted handler working correctly');
        } else {
            const error = '❌ Subscription deleted handler failed';
            console.error(error);
            console.error('  Expected: status=canceled, plan=free, subscriptionId=null');
            console.error('  Got:', org);
            errors.push(error);
        }

        console.log('\n--- Testing Payment Failed Handler ---');
        await prisma.organization.update({
            where: { id: testOrgId },
            data: {
                stripeSubscriptionId: 'sub_test_123',
                subscriptionStatus: 'active'
            }
        });

        const mockInvoice = {
            subscription: 'sub_test_123'
        };

        await handlePaymentFailed(mockInvoice);
        
        org = await prisma.organization.findUnique({ where: { id: testOrgId } });
        
        if (org.subscriptionStatus === 'past_due') {
            console.log('✅ Payment failed handler working correctly');
        } else {
            const error = '❌ Payment failed handler failed';
            console.error(error, '- Expected status: past_due, Got:', org.subscriptionStatus);
            errors.push(error);
        }

    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        errors.push(error.message);
    } finally {
        if (testOrgId) {
            await prisma.organization.delete({ where: { id: testOrgId } }).catch(() => {});
            console.log('\n🧹 Cleaned up test organization');
        }
        await prisma.$disconnect();
    }

    console.log('\n' + '='.repeat(50));
    if (errors.length === 0) {
        console.log('✅ ALL TESTS PASSED');
        console.log('='.repeat(50));
        process.exit(0);
    } else {
        console.log(`❌ ${errors.length} TEST(S) FAILED:`);
        errors.forEach(err => console.log(`  - ${err}`));
        console.log('='.repeat(50));
        process.exit(1);
    }
}

testStripeIntegration();
