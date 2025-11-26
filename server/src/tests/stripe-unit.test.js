console.log('🧪 Running Stripe Integration Unit Tests...\n');

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
    tests.push({ name, fn });
}

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message || 'Assertion failed'}: expected ${expected}, got ${actual}`);
    }
}

function assertExists(value, message) {
    if (!value) {
        throw new Error(message || 'Value does not exist');
    }
}

test('stripeService exports required functions', async () => {
    const stripeService = await import('../services/stripeService.js');
    assertExists(stripeService.createCheckoutSession, 'createCheckoutSession should be exported');
    assertExists(stripeService.createPortalSession, 'createPortalSession should be exported');
    assertExists(stripeService.handleCheckoutComplete, 'handleCheckoutComplete should be exported');
    assertExists(stripeService.handleSubscriptionUpdated, 'handleSubscriptionUpdated should be exported');
    assertExists(stripeService.handleSubscriptionDeleted, 'handleSubscriptionDeleted should be exported');
    assertExists(stripeService.handlePaymentFailed, 'handlePaymentFailed should be exported');
    assertExists(stripeService.constructWebhookEvent, 'constructWebhookEvent should be exported');
});

test('billing routes module exists and exports router', async () => {
    const billingRoutes = await import('../routes/billing.js');
    assertExists(billingRoutes.default, 'billing routes should export default router');
});

test('webhook routes module exists and exports router', async () => {
    const webhookRoutes = await import('../routes/webhooks.js');
    assertExists(webhookRoutes.default, 'webhook routes should export default router');
});

test('emailService exports required functions', async () => {
    const emailService = await import('../services/emailService.js');
    assertExists(emailService.sendMagicLink, 'sendMagicLink should be exported');
    assertExists(emailService.sendAlert, 'sendAlert should be exported');
});

test('index.js imports billing and webhook routes', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('index.js', 'utf8');
    
    if (!content.includes('billingRoutes')) {
        throw new Error('index.js should import billingRoutes');
    }
    if (!content.includes('webhookRoutes')) {
        throw new Error('index.js should import webhookRoutes');
    }
    if (!content.includes('/api/billing')) {
        throw new Error('index.js should mount /api/billing route');
    }
    if (!content.includes('/api/webhooks')) {
        throw new Error('index.js should mount /api/webhooks route');
    }
});

test('.env.example includes Stripe configuration', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('.env.example', 'utf8');
    
    if (!content.includes('STRIPE_SECRET_KEY')) {
        throw new Error('.env.example should include STRIPE_SECRET_KEY');
    }
    if (!content.includes('STRIPE_WEBHOOK_SECRET')) {
        throw new Error('.env.example should include STRIPE_WEBHOOK_SECRET');
    }
    if (!content.includes('CLIENT_URL')) {
        throw new Error('.env.example should include CLIENT_URL');
    }
});

test('Prisma schema includes Stripe fields', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('prisma/schema.prisma', 'utf8');
    
    if (!content.includes('stripeCustomerId')) {
        throw new Error('Organization model should include stripeCustomerId field');
    }
    if (!content.includes('stripeSubscriptionId')) {
        throw new Error('Organization model should include stripeSubscriptionId field');
    }
    if (!content.includes('subscriptionStatus')) {
        throw new Error('Organization model should include subscriptionStatus field');
    }
});

async function runTests() {
    console.log(`Running ${tests.length} tests...\n`);
    
    for (const { name, fn } of tests) {
        try {
            await fn();
            console.log(`✅ ${name}`);
            passed++;
        } catch (error) {
            console.error(`❌ ${name}`);
            console.error(`   ${error.message}`);
            failed++;
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`Tests: ${passed} passed, ${failed} failed, ${tests.length} total`);
    console.log('='.repeat(60));
    
    if (failed > 0) {
        process.exit(1);
    } else {
        console.log('\n✅ All unit tests passed!');
        process.exit(0);
    }
}

runTests();
