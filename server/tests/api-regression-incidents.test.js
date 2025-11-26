import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const prisma = new PrismaClient();

const testData = {
  org: { id: null, userId: null, accessToken: null },
  station: null,
  incidents: [],
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
    organizationName: 'Incident Test Org',
    subdomain: cred.subdomain,
    name: cred.name,
    email: cred.email,
    password: cred.password,
  });
  testData.org.id = signup.body.organization.id;
  testData.org.userId = signup.body.user.id;
  await prisma.user.update({ where: { id: testData.org.userId }, data: { isEmailVerified: true } });
  const login = await request(API_BASE_URL).post('/api/auth/login').send({ email: cred.email, password: cred.password });
  testData.org.accessToken = login.body.accessToken;
  testData.station = await prisma.station.create({
    data: { name: 'Incident Test Station', brand: 'TestBrand', region: 'North', address: '123 St', location: { lat: 51.5, lng: -0.1 }, organizationId: testData.org.id }
  });
}, 90000);

afterAll(async () => {
  try {
    if (testData.incidents.length > 0) await prisma.incident.deleteMany({ where: { id: { in: testData.incidents } } });
    if (testData.station) await prisma.station.delete({ where: { id: testData.station.id } }).catch(() => {});
    if (testData.org.userId) await prisma.user.delete({ where: { id: testData.org.userId } }).catch(() => {});
    if (testData.org.id) await prisma.organization.delete({ where: { id: testData.org.id } }).catch(() => {});
  } catch (error) {
    console.error('Cleanup error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
});

describe('Incidents with Notifications Regression Tests', () => {
  describe('POST /api/incidents', () => {
    it('should create incident with valid data', async () => {
      const response = await request(API_BASE_URL).post('/api/incidents').set('Authorization', `Bearer ${testData.org.accessToken}`).send({
        stationId: testData.station.id,
        incidentType: 'Safety Violation',
        severity: 'High',
        description: 'Test incident description',
        status: 'Open',
      });
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.severity).toBe('High');
      expect(response.body.status).toBe('Open');
      testData.incidents.push(response.body.id);
    });
    
    it('should reject incident without authentication', async () => {
      const response = await request(API_BASE_URL).post('/api/incidents').send({ stationId: testData.station.id, severity: 'Low', description: 'Test' });
      expect(response.status).toBe(401);
    });
  });
  
  describe('GET /api/incidents', () => {
    it('should return all incidents for organization', async () => {
      const response = await request(API_BASE_URL).get('/api/incidents').set('Authorization', `Bearer ${testData.org.accessToken}`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
    
    it('should filter by severity', async () => {
      const response = await request(API_BASE_URL).get('/api/incidents').query({ severity: 'High' }).set('Authorization', `Bearer ${testData.org.accessToken}`);
      expect(response.status).toBe(200);
      expect(response.body.every(i => i.severity === 'High')).toBe(true);
    });
  });
  
  describe('PUT /api/incidents/:id', () => {
    it('should update incident status', async () => {
      const response = await request(API_BASE_URL).put(`/api/incidents/${testData.incidents[0]}`).set('Authorization', `Bearer ${testData.org.accessToken}`).send({ status: 'In Progress' });
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('In Progress');
    });
    
    it('should resolve incident', async () => {
      const response = await request(API_BASE_URL).put(`/api/incidents/${testData.incidents[0]}`).set('Authorization', `Bearer ${testData.org.accessToken}`).send({ status: 'Resolved', resolvedAt: new Date().toISOString() });
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('Resolved');
      expect(response.body).toHaveProperty('resolvedAt');
    });
  });
  
  describe('DELETE /api/incidents/:id', () => {
    it('should delete incident', async () => {
      const response = await request(API_BASE_URL).delete(`/api/incidents/${testData.incidents[0]}`).set('Authorization', `Bearer ${testData.org.accessToken}`);
      expect(response.status).toBe(200);
      testData.incidents.shift();
    });
  });
});
