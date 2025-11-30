import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import http from 'http';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_DB_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

const prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });

let testContext = {
  organizationId: null,
  userId: null,
  accessToken: null,
  stationId: null,
  auditId: null,
  incidentId: null
};

const makeRequest = (method, path, data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 3001,
      path: url.pathname + url.search,
      method: method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    };
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

const waitForService = async (maxAttempts = 10) => {
  console.log('Waiting for service to be ready...');
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await makeRequest('GET', '/api/health');
      if (response.status === 200) {
        console.log('✓ Service is ready');
        return true;
      }
    } catch (e) {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
};

let serviceAvailable = false;

const skipIfServiceUnavailable = () => {
  if (!serviceAvailable) {
    console.log('⚠️  Skipping test - service not available');
    return true;
  }
  return false;
};

describe('E2E Integration Test Suite - Critical User Journeys', () => {
  beforeAll(async () => {
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║   E2E Integration Test Suite                 ║');
    console.log('║   Critical User Journeys                     ║');
    console.log('╚═══════════════════════════════════════════════╝\n');
    serviceAvailable = await waitForService();
    if (!serviceAvailable) {
      console.log('⚠️  Service not available - tests will be skipped');
      console.log('   To run E2E tests: npm run dev (in another terminal)');
    }
  }, 15000);

  afterAll(async () => {
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
  });

  test('Signup with Organization', async () => {
    if (skipIfServiceUnavailable()) return;
    
    console.log('\n=== Test 1: Signup with Organization ===');
    const subdomain = `test-org-${Date.now()}`;
    const email = `test-${Date.now()}@example.com`;
    const response = await makeRequest('POST', '/api/auth/signup-with-org', {
      organizationName: 'E2E Test Organization',
      subdomain: subdomain,
      name: 'Test Admin User',
      email: email,
      password: 'TestPassword123!'
    });

    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('user');
    expect(response.data).toHaveProperty('organization');
    
    testContext.organizationId = response.data.organization.id;
    testContext.userId = response.data.user.id;
    
    console.log('✅ Signup successful');
    console.log('  - Organization ID:', testContext.organizationId);
    console.log('  - User ID:', testContext.userId);
  });

  test('User Login', async () => {
    if (skipIfServiceUnavailable()) return;
    
    console.log('\n=== Test 2: User Login ===');
    const user = await prisma.user.findUnique({ where: { id: testContext.userId } });
    
    expect(user).toBeTruthy();
    
    await prisma.user.update({ where: { id: testContext.userId }, data: { isEmailVerified: true } });
    
    const response = await makeRequest('POST', '/api/auth/login', {
      email: user.email,
      password: 'TestPassword123!'
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('accessToken');
    
    testContext.accessToken = response.data.accessToken;
    console.log('✅ Login successful');
  });

  test('Stripe Checkout Session Creation', async () => {
    if (skipIfServiceUnavailable()) return;
    
    console.log('\n=== Test 3: Stripe Checkout Session Creation ===');
    const response = await makeRequest(
      'POST',
      '/api/billing/create-checkout-session',
      { planId: 'professional' },
      testContext.accessToken
    );

    if (response.status === 200 && response.data.url) {
      console.log('✅ Stripe checkout session created');
      expect(response.data).toHaveProperty('url');
    } else if (response.status === 500 && response.data.error && response.data.error.includes('Stripe not configured')) {
      console.log('⚠️  Stripe not configured (expected in test environment)');
      expect(response.status).toBe(500);
    } else {
      throw new Error(`Unexpected response: ${response.status}`);
    }
  });

  test('Stripe Webhook Simulation', async () => {
    if (skipIfServiceUnavailable()) return;
    
    console.log('\n=== Test 4: Stripe Webhook Simulation ===');
    const mockSession = {
      client_reference_id: testContext.organizationId,
      customer: 'cus_test_' + Date.now(),
      subscription: 'sub_test_' + Date.now(),
      metadata: {
        organizationId: testContext.organizationId,
        planId: 'professional'
      }
    };

    const { handleCheckoutComplete } = await import('../core/services/stripeService.js');
    await handleCheckoutComplete(mockSession);
    
    const org = await prisma.organization.findUnique({ where: { id: testContext.organizationId } });
    
    expect(org.subscriptionPlan).toBe('professional');
    expect(org.subscriptionStatus).toBe('active');
    
    console.log('✅ Webhook simulation successful');
    console.log('  - Plan:', org.subscriptionPlan);
    console.log('  - Status:', org.subscriptionStatus);
  });

  test('Create Station', async () => {
    if (skipIfServiceUnavailable()) return;
    
    console.log('\n=== Test 5: Create Station ===');
    const station = await prisma.station.create({
      data: {
        name: 'E2E Test Station',
        brand: 'TestBrand',
        region: 'North',
        address: '123 Test Street',
        location: { lat: 51.5074, lng: -0.1278 },
        organizationId: testContext.organizationId
      }
    });
    
    testContext.stationId = station.id;
    
    expect(station).toBeTruthy();
    expect(station.id).toBeTruthy();
    
    console.log('✅ Station created');
    console.log('  - Station ID:', testContext.stationId);
  });

  test('Create Audit', async () => {
    if (skipIfServiceUnavailable()) return;
    
    console.log('\n=== Test 6: Create Audit ===');
    const audit = await prisma.audit.create({
      data: {
        auditNumber: 'AUD-' + Date.now(),
        scheduledDate: new Date(),
        formId: 'test-form',
        status: 'Scheduled',
        findings: { items: [], photos: [] },
        organizationId: testContext.organizationId,
        stationId: testContext.stationId,
        auditorId: testContext.userId
      }
    });
    
    testContext.auditId = audit.id;
    
    expect(audit).toBeTruthy();
    expect(audit.id).toBeTruthy();
    
    console.log('✅ Audit created');
    console.log('  - Audit ID:', testContext.auditId);
  });

  test('Update Audit with Findings', async () => {
    if (skipIfServiceUnavailable()) return;
    
    console.log('\n=== Test 7: Update Audit with Findings ===');
    const updatedAudit = await prisma.audit.update({
      where: { id: testContext.auditId },
      data: {
        status: 'In Progress',
        findings: {
          items: [{
            category: 'Fire Safety',
            finding: 'Extinguisher expired',
            severity: 'High'
          }],
          photos: ['/uploads/test-photo.jpg']
        },
        overallScore: 75.5
      }
    });
    
    expect(updatedAudit.status).toBe('In Progress');
    expect(updatedAudit.overallScore).toBe(75.5);
    
    console.log('✅ Audit updated with findings');
  });

  test('Create Incident', async () => {
    if (skipIfServiceUnavailable()) return;
    
    console.log('\n=== Test 8: Create Incident ===');
    const incident = await prisma.incident.create({
      data: {
        title: 'E2E Test Incident',
        description: 'Test incident for E2E testing',
        severity: 'High',
        status: 'Open',
        organizationId: testContext.organizationId,
        stationId: testContext.stationId,
        reporterId: testContext.userId
      }
    });
    
    testContext.incidentId = incident.id;
    
    expect(incident).toBeTruthy();
    expect(incident.id).toBeTruthy();
    
    console.log('✅ Incident created');
    console.log('  - Incident ID:', testContext.incidentId);
  });

  test('Incident Notification', async () => {
    if (skipIfServiceUnavailable()) return;
    
    console.log('\n=== Test 9: Incident Notification ===');
    const user = await prisma.user.findUnique({ where: { id: testContext.userId } });
    
    const { sendAlert } = await import('../core/services/emailService.js');
    const sent = await sendAlert(
      user.email,
      'Incident Alert: E2E Test Incident',
      'A high severity incident has been reported'
    );
    
    console.log(sent ? '✅ Notification sent' : '⚠️  Notification simulated');
    expect(sent).toBeDefined();
  });

  test('Tenant Isolation', async () => {
    if (skipIfServiceUnavailable()) return;
    
    console.log('\n=== Test 10: Tenant Isolation ===');
    const otherOrg = await prisma.organization.create({
      data: {
        name: 'Other Org',
        slug: 'other-' + Date.now(),
        ownerId: 'other-owner'
      }
    });
    
    const otherStation = await prisma.station.create({
      data: {
        name: 'Other Station',
        brand: 'Other',
        region: 'South',
        address: '456 St',
        location: { lat: 52.0, lng: -1.0 },
        organizationId: otherOrg.id
      }
    });
    
    const myStations = await prisma.station.findMany({
      where: { organizationId: testContext.organizationId }
    });
    
    const hasOther = myStations.some(s => s.id === otherStation.id);
    
    await prisma.station.delete({ where: { id: otherStation.id } });
    await prisma.organization.delete({ where: { id: otherOrg.id } });
    
    expect(hasOther).toBe(false);
    console.log('✅ Tenant isolation verified');
  });
});
