import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const prisma = new PrismaClient();

const testData = {
  org: { id: null, userId: null, accessToken: null },
  station: null,
  permits: [],
  contractors: [],
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
  const signup = await request(API_BASE_URL).post('/api/auth/signup-with-org').send({ organizationName: 'Permit Test Org', subdomain: cred.subdomain, name: cred.name, email: cred.email, password: cred.password });
  testData.org.id = signup.body.organization.id;
  testData.org.userId = signup.body.user.id;
  await prisma.user.update({ where: { id: testData.org.userId }, data: { isEmailVerified: true } });
  const login = await request(API_BASE_URL).post('/api/auth/login').send({ email: cred.email, password: cred.password });
  testData.org.accessToken = login.body.accessToken;
  testData.station = await prisma.station.create({ data: { name: 'Permit Test Station', brand: 'TestBrand', region: 'North', address: '123 St', location: { lat: 51.5, lng: -0.1 }, organizationId: testData.org.id } });
}, 90000);

afterAll(async () => {
  try {
    if (testData.permits.length > 0) await prisma.workPermit.deleteMany({ where: { id: { in: testData.permits } } });
    if (testData.contractors.length > 0) await prisma.contractor.deleteMany({ where: { id: { in: testData.contractors } } });
    if (testData.station) await prisma.station.delete({ where: { id: testData.station.id } }).catch(() => {});
    if (testData.org.userId) await prisma.user.delete({ where: { id: testData.org.userId } }).catch(() => {});
    if (testData.org.id) await prisma.organization.delete({ where: { id: testData.org.id } }).catch(() => {});
  } catch (error) {
    console.error('Cleanup error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
});

describe('Work Permits Regression Tests', () => {
  describe('POST /api/work-permits', () => {
    it('should create work permit', async () => {
      const validFrom = new Date();
      const validTo = new Date(Date.now() + 86400000);
      const response = await request(API_BASE_URL).post('/api/work-permits').set('Authorization', `Bearer ${testData.org.accessToken}`).send({ stationId: testData.station.id, permitType: 'Hot Work', description: 'Welding work', status: 'Pending', validFrom: validFrom.toISOString(), validTo: validTo.toISOString() });
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.permitType).toBe('Hot Work');
      testData.permits.push(response.body.id);
    });
    
    it('should reject without authentication', async () => {
      const response = await request(API_BASE_URL).post('/api/work-permits').send({ stationId: testData.station.id, permitType: 'Test' });
      expect(response.status).toBe(401);
    });
  });
  
  describe('GET /api/work-permits', () => {
    it('should return all permits', async () => {
      const response = await request(API_BASE_URL).get('/api/work-permits').set('Authorization', `Bearer ${testData.org.accessToken}`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
  
  describe('PUT /api/work-permits/:id', () => {
    it('should update permit status', async () => {
      const response = await request(API_BASE_URL).put(`/api/work-permits/${testData.permits[0]}`).set('Authorization', `Bearer ${testData.org.accessToken}`).send({ status: 'Approved' });
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('Approved');
    });
  });
});

describe('Contractors Regression Tests', () => {
  describe('POST /api/contractors', () => {
    it('should create contractor', async () => {
      const response = await request(API_BASE_URL).post('/api/contractors').set('Authorization', `Bearer ${testData.org.accessToken}`).send({ name: 'Test Contractor LLC', licenseNumber: 'LIC-12345', specialization: 'Electrical', contactPerson: 'John Doe', email: 'contractor@example.com', status: 'Active' });
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Contractor LLC');
      testData.contractors.push(response.body.id);
    });
    
    it('should reject without authentication', async () => {
      const response = await request(API_BASE_URL).post('/api/contractors').send({ name: 'Test' });
      expect(response.status).toBe(401);
    });
  });
  
  describe('GET /api/contractors', () => {
    it('should return all contractors', async () => {
      const response = await request(API_BASE_URL).get('/api/contractors').set('Authorization', `Bearer ${testData.org.accessToken}`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });
});
