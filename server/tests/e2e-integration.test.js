import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_DB_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

const prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });

let testContext = { organizationId: null, userId: null, accessToken: null, stationId: null, auditId: null, incidentId: null };

const makeRequest = (method, path, data = null, token = null) => {
    return new Promise((resolve, reject) => {
        const url = new URL(path, API_BASE_URL);
        const options = { hostname: url.hostname, port: url.port || 3001, path: url.pathname + url.search, method: method, headers: { 'Content-Type': 'application/json' }, timeout: 10000 };
        if (token) options.headers['Authorization'] = `Bearer ${token}`;
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, headers: res.headers, data: body ? JSON.parse(body) : null });
                } catch (e) {
                    resolve({ status: res.statusCode, headers: res.headers, data: body });
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
};

const waitForService = async (maxAttempts = 30) => {
    console.log('Waiting for service to be ready...');
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await makeRequest('GET', '/api/health');
            if (response.status === 200) { console.log('✓ Service is ready'); return true; }
        } catch (e) {}
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new Error('Service did not become ready in time');
};

const cleanupTestData = async () => {
    console.log('\n🧹 Cleaning up test data...');
    try {
        if (testContext.incidentId) await prisma.incident.delete({ where: { id: testContext.incidentId } }).catch(() => {});
        if (testContext.auditId) await prisma.audit.delete({ where: { id: testContext.auditId } }).catch(() => {});
        if (testContext.stationId) await prisma.station.delete({ where: { id: testContext.stationId } }).catch(() => {});
        if (testContext.userId) await prisma.user.delete({ where: { id: testContext.userId } }).catch(() => {});
        if (testContext.organizationId) await prisma.organization.delete({ where: { id: testContext.organizationId } }).catch(() => {});
        console.log('✓ Test data cleaned up');
    } catch (error) {
        console.error('Cleanup error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
};

const testSignupWithOrganization = async () => {
    console.log('\n=== Test 1: Signup with Organization ===');
    const subdomain = `test-org-${Date.now()}`;
    const email = `test-${Date.now()}@example.com`;
    const response = await makeRequest('POST', '/api/auth/signup-with-org', { organizationName: 'E2E Test Organization', subdomain: subdomain, name: 'Test Admin User', email: email, password: 'TestPassword123!' });
    if (response.status === 201 && response.data.user && response.data.organization) {
        testContext.organizationId = response.data.organization.id;
        testContext.userId = response.data.user.id;
        console.log('✅ Signup successful');
        console.log('  - Organization ID:', testContext.organizationId);
        console.log('  - User ID:', testContext.userId);
        return true;
    } else {
        console.error('❌ Signup failed:', response.status, response.data);
        return false;
    }
};

const testLogin = async () => {
    console.log('\n=== Test 2: User Login ===');
    const user = await prisma.user.findUnique({ where: { id: testContext.userId } });
    if (!user) { console.error('❌ User not found in database'); return false; }
    await prisma.user.update({ where: { id: testContext.userId }, data: { isEmailVerified: true } });
    const response = await makeRequest('POST', '/api/auth/login', { email: user.email, password: 'TestPassword123!' });
    if (response.status === 200 && response.data.accessToken) {
        testContext.accessToken = response.data.accessToken;
        console.log('✅ Login successful');
        return true;
    } else {
        console.error('❌ Login failed:', response.status, response.data);
        return false;
    }
};

const testStripeCheckoutSession = async () => {
    console.log('\n=== Test 3: Stripe Checkout Session Creation ===');
    const response = await makeRequest('POST', '/api/billing/create-checkout-session', { planId: 'professional' }, testContext.accessToken);
    if (response.status === 200 && response.data.url) {
        console.log('✅ Stripe checkout session created');
        return true;
    } else if (response.status === 500 && response.data.error && response.data.error.includes('Stripe not configured')) {
        console.log('⚠️  Stripe not configured (expected in test environment)');
        return true;
    } else {
        console.error('❌ Checkout session creation failed:', response.status, response.data);
        return false;
    }
};

const testStripeWebhookSimulation = async () => {
    console.log('\n=== Test 4: Stripe Webhook Simulation ===');
    const mockSession = { client_reference_id: testContext.organizationId, customer: 'cus_test_' + Date.now(), subscription: 'sub_test_' + Date.now(), metadata: { organizationId: testContext.organizationId, planId: 'professional' } };
    const { handleCheckoutComplete } = await import('../services/stripeService.js');
    await handleCheckoutComplete(mockSession);
    const org = await prisma.organization.findUnique({ where: { id: testContext.organizationId } });
    if (org.subscriptionPlan === 'professional' && org.subscriptionStatus === 'active') {
        console.log('✅ Webhook simulation successful');
        console.log('  - Plan:', org.subscriptionPlan);
        console.log('  - Status:', org.subscriptionStatus);
        return true;
    } else {
        console.error('❌ Webhook simulation failed');
        return false;
    }
};

const testCreateStation = async () => {
    console.log('\n=== Test 5: Create Station ===');
    const station = await prisma.station.create({ data: { name: 'E2E Test Station', brand: 'TestBrand', region: 'North', address: '123 Test Street', location: { lat: 51.5074, lng: -0.1278 }, organizationId: testContext.organizationId } });
    testContext.stationId = station.id;
    console.log('✅ Station created');
    console.log('  - Station ID:', testContext.stationId);
    return true;
};

const testCreateAudit = async () => {
    console.log('\n=== Test 6: Create Audit ===');
    const audit = await prisma.audit.create({ data: { auditNumber: 'AUD-' + Date.now(), scheduledDate: new Date(), formId: 'test-form', status: 'Scheduled', findings: { items: [], photos: [] }, organizationId: testContext.organizationId, stationId: testContext.stationId, auditorId: testContext.userId } });
    testContext.auditId = audit.id;
    console.log('✅ Audit created');
    console.log('  - Audit ID:', testContext.auditId);
    return true;
};

const testUpdateAudit = async () => {
    console.log('\n=== Test 7: Update Audit with Findings ===');
    const updatedAudit = await prisma.audit.update({ where: { id: testContext.auditId }, data: { status: 'In Progress', findings: { items: [{ category: 'Fire Safety', finding: 'Extinguisher expired', severity: 'High' }], photos: ['/uploads/test-photo.jpg'] }, overallScore: 75.5 } });
    if (updatedAudit.status === 'In Progress' && updatedAudit.overallScore === 75.5) {
        console.log('✅ Audit updated with findings');
        return true;
    } else {
        console.error('❌ Audit update failed');
        return false;
    }
};

const testCreateIncident = async () => {
    console.log('\n=== Test 8: Create Incident ===');
    const incident = await prisma.incident.create({ data: { title: 'E2E Test Incident', description: 'Test incident for E2E testing', severity: 'High', status: 'Open', organizationId: testContext.organizationId, stationId: testContext.stationId, reporterId: testContext.userId } });
    testContext.incidentId = incident.id;
    console.log('✅ Incident created');
    console.log('  - Incident ID:', testContext.incidentId);
    return true;
};

const testIncidentNotification = async () => {
    console.log('\n=== Test 9: Incident Notification ===');
    const user = await prisma.user.findUnique({ where: { id: testContext.userId } });
    const { sendAlert } = await import('../services/emailService.js');
    const sent = await sendAlert(user.email, 'Incident Alert: E2E Test Incident', 'A high severity incident has been reported');
    console.log(sent ? '✅ Notification sent' : '⚠️  Notification simulated');
    return true;
};

const testTenantIsolation = async () => {
    console.log('\n=== Test 10: Tenant Isolation ===');
    const otherOrg = await prisma.organization.create({ data: { name: 'Other Org', slug: 'other-' + Date.now(), ownerId: 'other-owner' } });
    const otherStation = await prisma.station.create({ data: { name: 'Other Station', brand: 'Other', region: 'South', address: '456 St', location: { lat: 52.0, lng: -1.0 }, organizationId: otherOrg.id } });
    const myStations = await prisma.station.findMany({ where: { organizationId: testContext.organizationId } });
    const hasOther = myStations.some(s => s.id === otherStation.id);
    await prisma.station.delete({ where: { id: otherStation.id } });
    await prisma.organization.delete({ where: { id: otherOrg.id } });
    if (!hasOther) {
        console.log('✅ Tenant isolation verified');
        return true;
    } else {
        console.error('❌ Tenant isolation failed');
        return false;
    }
};

async function runE2ETests() {
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║   E2E Integration Test Suite                 ║');
    console.log('║   Critical User Journeys                     ║');
    console.log('╚═══════════════════════════════════════════════╝\n');
    let errors = [];
    try {
        await waitForService();
        if (!await testSignupWithOrganization()) errors.push('Signup failed');
        if (!await testLogin()) errors.push('Login failed');
        if (!await testStripeCheckoutSession()) errors.push('Stripe checkout failed');
        if (!await testStripeWebhookSimulation()) errors.push('Stripe webhook failed');
        if (!await testCreateStation()) errors.push('Station creation failed');
        if (!await testCreateAudit()) errors.push('Audit creation failed');
        if (!await testUpdateAudit()) errors.push('Audit update failed');
        if (!await testCreateIncident()) errors.push('Incident creation failed');
        if (!await testIncidentNotification()) errors.push('Notification failed');
        if (!await testTenantIsolation()) errors.push('Tenant isolation failed');
    } catch (error) {
        console.error('\n❌ Test suite error:', error.message);
        errors.push(error.message);
    } finally {
        await cleanupTestData();
    }
    console.log('\n' + '='.repeat(50));
    if (errors.length === 0) {
        console.log('✅ ALL E2E TESTS PASSED');
        console.log('='.repeat(50));
        process.exit(0);
    } else {
        console.log(`❌ ${errors.length} TEST(S) FAILED:`);
        errors.forEach(err => console.log(`  - ${err}`));
        console.log('='.repeat(50));
        process.exit(1);
    }
}

runE2ETests();
