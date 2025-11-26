import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const prisma = new PrismaClient();

const testData = {
  org: { id: null, userId: null, accessToken: null },
  station: null,
  audits: [],
};

const generateTestData = () => ({
  email: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
  subdomain: `test-org-${Date.now()}-${Math.random().toString(36).substring(7)}`,
  password: 'TestPassword123!',
  name: 'Test User',
});

const waitForService = async (maxAttempts = 30) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await request(API_BASE_URL).get('/api/health');
      if (response.status === 200) return true;
    } catch (e) {}
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error('Service not ready');
};

beforeAll(async () => {
  await waitForService();
  
  const cred = generateTestData();
  const signup = await request(API_BASE_URL).post('/api/auth/signup-with-org').send({
    organizationName: 'Audit Test Org',
    subdomain: cred.subdomain,
    name: cred.name,
    email: cred.email,
    password: cred.password,
  });
  
  testData.org.id = signup.body.organization.id;
  testData.org.userId = signup.body.user.id;
  
  await prisma.user.update({ where: { id: testData.org.userId }, data: { isEmailVerified: true } });
  
  const login = await request(API_BASE_URL).post('/api/auth/login').send({
    email: cred.email,
    password: cred.password,
  });
  testData.org.accessToken = login.body.accessToken;
  
  testData.station = await prisma.station.create({
    data: {
      name: 'Audit Test Station',
      brand: 'TestBrand',
      region: 'North',
      address: '123 St',
      location: { lat: 51.5, lng: -0.1 },
      organizationId: testData.org.id,
    }
  });
}, 90000);

afterAll(async () => {
  try {
    if (testData.audits.length > 0) await prisma.audit.deleteMany({ where: { id: { in: testData.audits } } });
    if (testData.station) await prisma.station.delete({ where: { id: testData.station.id } }).catch(() => {});
    if (testData.org.userId) await prisma.user.delete({ where: { id: testData.org.userId } }).catch(() => {});
    if (testData.org.id) await prisma.organization.delete({ where: { id: testData.org.id } }).catch(() => {});
  } catch (error) {
    console.error('Cleanup error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
});

describe('Audits Lifecycle Regression Tests', () => {
  
  describe('POST /api/audits', () => {
    it('should create audit with valid data', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/audits')
        .set('Authorization', `Bearer ${testData.org.accessToken}`)
        .send({
          stationId: testData.station.id,
          auditNumber: `AUD-${Date.now()}`,
          scheduledDate: new Date().toISOString(),
          formId: 'test-form-1',
          status: 'Scheduled',
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.stationId).toBe(testData.station.id);
      expect(response.body.status).toBe('Scheduled');
      expect(response.body.overallScore).toBe(0);
      testData.audits.push(response.body.id);
    });
    
    it('should reject audit without authentication', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/audits')
        .send({
          stationId: testData.station.id,
          auditNumber: `AUD-${Date.now()}`,
          scheduledDate: new Date().toISOString(),
          formId: 'test-form-1',
        });
      
      expect(response.status).toBe(401);
    });
    
    it('should reject audit with missing required fields', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/audits')
        .set('Authorization', `Bearer ${testData.org.accessToken}`)
        .send({
          stationId: testData.station.id,
        });
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('GET /api/audits', () => {
    it('should return all audits for organization', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/audits')
        .set('Authorization', `Bearer ${testData.org.accessToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.every(a => a.organizationId === testData.org.id)).toBe(true);
    });
    
    it('should filter audits by station', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/audits')
        .query({ stationId: testData.station.id })
        .set('Authorization', `Bearer ${testData.org.accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.every(a => a.stationId === testData.station.id)).toBe(true);
    });
    
    it('should filter audits by status', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/audits')
        .query({ status: 'Scheduled' })
        .set('Authorization', `Bearer ${testData.org.accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.every(a => a.status === 'Scheduled')).toBe(true);
    });
  });
  
  describe('GET /api/audits/:id', () => {
    it('should return specific audit', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/audits/${testData.audits[0]}`)
        .set('Authorization', `Bearer ${testData.org.accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testData.audits[0]);
    });
    
    it('should reject access to non-existent audit', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/audits/non-existent-id')
        .set('Authorization', `Bearer ${testData.org.accessToken}`);
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('PUT /api/audits/:id', () => {
    it('should update audit status', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/audits/${testData.audits[0]}`)
        .set('Authorization', `Bearer ${testData.org.accessToken}`)
        .send({
          status: 'In Progress',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('In Progress');
    });
    
    it('should update audit with findings', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/audits/${testData.audits[0]}`)
        .set('Authorization', `Bearer ${testData.org.accessToken}`)
        .send({
          status: 'Completed',
          findings: {
            items: [
              {
                category: 'Fire Safety',
                finding: 'Fire extinguisher expired',
                severity: 'High',
                recommendation: 'Replace immediately',
              },
              {
                category: 'General Safety',
                finding: 'Emergency exit partially blocked',
                severity: 'Medium',
                recommendation: 'Clear exit path',
              }
            ],
            photos: ['/uploads/photo1.jpg', '/uploads/photo2.jpg'],
          },
          overallScore: 75.5,
          completedDate: new Date().toISOString(),
        });
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('Completed');
      expect(response.body.overallScore).toBe(75.5);
      expect(response.body.findings.items.length).toBe(2);
      expect(response.body).toHaveProperty('completedDate');
    });
    
    it('should validate status transitions', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/audits/${testData.audits[0]}`)
        .set('Authorization', `Bearer ${testData.org.accessToken}`)
        .send({
          status: 'InvalidStatus',
        });
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('DELETE /api/audits/:id', () => {
    it('should delete audit', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/audits/${testData.audits[0]}`)
        .set('Authorization', `Bearer ${testData.org.accessToken}`);
      
      expect(response.status).toBe(200);
      
      const audit = await prisma.audit.findUnique({ where: { id: testData.audits[0] } });
      expect(audit).toBeNull();
      
      testData.audits.shift();
    });
    
    it('should reject unauthorized deletion', async () => {
      const audit = await prisma.audit.create({
        data: {
          auditNumber: `AUD-${Date.now()}`,
          scheduledDate: new Date(),
          formId: 'test-form',
          status: 'Scheduled',
          organizationId: testData.org.id,
          stationId: testData.station.id,
          auditorId: testData.org.userId,
        }
      });
      testData.audits.push(audit.id);
      
      const response = await request(API_BASE_URL)
        .delete(`/api/audits/${audit.id}`);
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('Audit Findings Schema', () => {
    it('should validate findings structure', async () => {
      const audit = await prisma.audit.create({
        data: {
          auditNumber: `AUD-${Date.now()}`,
          scheduledDate: new Date(),
          formId: 'test-form',
          status: 'Scheduled',
          organizationId: testData.org.id,
          stationId: testData.station.id,
          auditorId: testData.org.userId,
        }
      });
      testData.audits.push(audit.id);
      
      const response = await request(API_BASE_URL)
        .put(`/api/audits/${audit.id}`)
        .set('Authorization', `Bearer ${testData.org.accessToken}`)
        .send({
          findings: {
            items: 'invalid',
          },
        });
      
      expect(response.status).toBe(400);
    });
  });
});
