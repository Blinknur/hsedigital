import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const prisma = new PrismaClient();

const testData = {
  org1: { id: null, userId: null, accessToken: null, email: null, password: null },
  org2: { id: null, userId: null, accessToken: null },
  stations: [],
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
  
  const cred1 = generateTestData();
  const signup1 = await request(API_BASE_URL).post('/api/auth/signup-with-org').send({
    organizationName: 'Org 1',
    subdomain: cred1.subdomain,
    name: cred1.name,
    email: cred1.email,
    password: cred1.password,
  });
  
  testData.org1.id = signup1.body.organization.id;
  testData.org1.userId = signup1.body.user.id;
  testData.org1.email = cred1.email;
  testData.org1.password = cred1.password;
  
  await prisma.user.update({ where: { id: testData.org1.userId }, data: { isEmailVerified: true } });
  
  const login1 = await request(API_BASE_URL).post('/api/auth/login').send({
    email: cred1.email,
    password: cred1.password,
  });
  testData.org1.accessToken = login1.body.accessToken;
  
  const cred2 = generateTestData();
  const signup2 = await request(API_BASE_URL).post('/api/auth/signup-with-org').send({
    organizationName: 'Org 2',
    subdomain: cred2.subdomain,
    name: cred2.name,
    email: cred2.email,
    password: cred2.password,
  });
  
  testData.org2.id = signup2.body.organization.id;
  testData.org2.userId = signup2.body.user.id;
  
  await prisma.user.update({ where: { id: testData.org2.userId }, data: { isEmailVerified: true } });
  
  const login2 = await request(API_BASE_URL).post('/api/auth/login').send({
    email: cred2.email,
    password: cred2.password,
  });
  testData.org2.accessToken = login2.body.accessToken;
}, 90000);

afterAll(async () => {
  try {
    if (testData.stations.length > 0) await prisma.station.deleteMany({ where: { id: { in: testData.stations } } });
    if (testData.org1.userId) await prisma.user.delete({ where: { id: testData.org1.userId } }).catch(() => {});
    if (testData.org2.userId) await prisma.user.delete({ where: { id: testData.org2.userId } }).catch(() => {});
    if (testData.org1.id) await prisma.organization.delete({ where: { id: testData.org1.id } }).catch(() => {});
    if (testData.org2.id) await prisma.organization.delete({ where: { id: testData.org2.id } }).catch(() => {});
  } catch (error) {
    console.error('Cleanup error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
});

describe('Stations CRUD with Tenant Isolation', () => {
  
  describe('POST /api/stations', () => {
    it('should create station for org1', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/stations')
        .set('Authorization', `Bearer ${testData.org1.accessToken}`)
        .send({
          name: 'Station Alpha',
          brand: 'BrandA',
          region: 'North',
          address: '123 Test St',
          location: { lat: 51.5, lng: -0.1 },
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Station Alpha');
      expect(response.body.organizationId).toBe(testData.org1.id);
      testData.stations.push(response.body.id);
    });
    
    it('should create station for org2', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/stations')
        .set('Authorization', `Bearer ${testData.org2.accessToken}`)
        .send({
          name: 'Station Beta',
          brand: 'BrandB',
          region: 'South',
          address: '456 Test Ave',
          location: { lat: 52.0, lng: -1.0 },
        });
      
      expect(response.status).toBe(201);
      expect(response.body.organizationId).toBe(testData.org2.id);
      testData.stations.push(response.body.id);
    });
    
    it('should reject unauthorized creation', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/stations')
        .send({ name: 'Unauthorized Station' });
      
      expect(response.status).toBe(401);
    });
    
    it('should reject invalid data schema', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/stations')
        .set('Authorization', `Bearer ${testData.org1.accessToken}`)
        .send({ name: '' });
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('GET /api/stations', () => {
    it('should return only org1 stations', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/stations')
        .set('Authorization', `Bearer ${testData.org1.accessToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.every(s => s.organizationId === testData.org1.id)).toBe(true);
    });
    
    it('should return only org2 stations', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/stations')
        .set('Authorization', `Bearer ${testData.org2.accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.every(s => s.organizationId === testData.org2.id)).toBe(true);
    });
    
    it('should filter by region', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/stations')
        .query({ region: 'North' })
        .set('Authorization', `Bearer ${testData.org1.accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.every(s => s.region === 'North')).toBe(true);
    });
    
    it('should reject unauthorized access', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/stations');
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('PUT /api/stations/:id', () => {
    it('should update own station', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/stations/${testData.stations[0]}`)
        .set('Authorization', `Bearer ${testData.org1.accessToken}`)
        .send({ name: 'Updated Station Alpha' });
      
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Station Alpha');
    });
    
    it('should not update other org station (tenant isolation)', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/stations/${testData.stations[0]}`)
        .set('Authorization', `Bearer ${testData.org2.accessToken}`)
        .send({ name: 'Hacked Name' });
      
      expect(response.status).not.toBe(200);
      
      const station = await prisma.station.findUnique({ where: { id: testData.stations[0] } });
      expect(station.name).not.toBe('Hacked Name');
    });
    
    it('should reject invalid update data', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/stations/${testData.stations[0]}`)
        .set('Authorization', `Bearer ${testData.org1.accessToken}`)
        .send({ name: '' });
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('DELETE /api/stations/:id', () => {
    it('should not delete other org station (tenant isolation)', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/stations/${testData.stations[0]}`)
        .set('Authorization', `Bearer ${testData.org2.accessToken}`);
      
      expect(response.status).not.toBe(200);
      
      const station = await prisma.station.findUnique({ where: { id: testData.stations[0] } });
      expect(station).not.toBeNull();
    });
    
    it('should delete own station', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/stations/${testData.stations[0]}`)
        .set('Authorization', `Bearer ${testData.org1.accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      
      const station = await prisma.station.findUnique({ where: { id: testData.stations[0] } });
      expect(station).toBeNull();
      
      testData.stations.shift();
    });
    
    it('should reject unauthorized deletion', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/stations/${testData.stations[0]}`);
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('Schema Validation', () => {
    it('should validate required fields', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/stations')
        .set('Authorization', `Bearer ${testData.org1.accessToken}`)
        .send({});
      
      expect(response.status).toBe(400);
    });
    
    it('should validate location format', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/stations')
        .set('Authorization', `Bearer ${testData.org1.accessToken}`)
        .send({
          name: 'Test Station',
          brand: 'TestBrand',
          region: 'North',
          address: '123 St',
          location: { invalid: 'data' },
        });
      
      expect(response.status).toBe(400);
    });
  });
});
