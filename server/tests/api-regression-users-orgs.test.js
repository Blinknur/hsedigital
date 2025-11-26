import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const prisma = new PrismaClient();

const testData = {
  org: { id: null, userId: null, accessToken: null },
  users: [],
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
  const signup = await request(API_BASE_URL).post('/api/auth/signup-with-org').send({ organizationName: 'User Test Org', subdomain: cred.subdomain, name: cred.name, email: cred.email, password: cred.password });
  testData.org.id = signup.body.organization.id;
  testData.org.userId = signup.body.user.id;
  await prisma.user.update({ where: { id: testData.org.userId }, data: { isEmailVerified: true } });
  const login = await request(API_BASE_URL).post('/api/auth/login').send({ email: cred.email, password: cred.password });
  testData.org.accessToken = login.body.accessToken;
}, 90000);

afterAll(async () => {
  try {
    if (testData.users.length > 0) await prisma.user.deleteMany({ where: { id: { in: testData.users } } });
    if (testData.org.userId) await prisma.user.delete({ where: { id: testData.org.userId } }).catch(() => {});
    if (testData.org.id) await prisma.organization.delete({ where: { id: testData.org.id } }).catch(() => {});
  } catch (error) {
    console.error('Cleanup error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
});

describe('User Management Regression Tests', () => {
  describe('POST /api/users', () => {
    it('should create user in organization', async () => {
      const userData = generateTestData();
      const response = await request(API_BASE_URL).post('/api/users').set('Authorization', `Bearer ${testData.org.accessToken}`).send({ email: userData.email, name: userData.name, password: 'TempPass123!', role: 'User', region: 'North' });
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).not.toHaveProperty('password');
      expect(response.body.email).toBe(userData.email);
      testData.users.push(response.body.id);
    });
    
    it('should reject without authentication', async () => {
      const response = await request(API_BASE_URL).post('/api/users').send({ email: 'test@test.com', name: 'Test' });
      expect(response.status).toBe(401);
    });
  });
  
  describe('GET /api/users', () => {
    it('should return all users in organization', async () => {
      const response = await request(API_BASE_URL).get('/api/users').set('Authorization', `Bearer ${testData.org.accessToken}`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.every(u => !u.password)).toBe(true);
    });
    
    it('should not expose password field', async () => {
      const response = await request(API_BASE_URL).get('/api/users').set('Authorization', `Bearer ${testData.org.accessToken}`);
      expect(response.status).toBe(200);
      response.body.forEach(user => {
        expect(user).not.toHaveProperty('password');
        expect(user).not.toHaveProperty('emailVerificationToken');
        expect(user).not.toHaveProperty('passwordResetToken');
      });
    });
  });
});

describe('Organization Management Regression Tests', () => {
  describe('GET /api/organizations/me', () => {
    it('should return current organization', async () => {
      const response = await request(API_BASE_URL).get('/api/organizations/me').set('Authorization', `Bearer ${testData.org.accessToken}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toBe(testData.org.id);
    });
    
    it('should reject without authentication', async () => {
      const response = await request(API_BASE_URL).get('/api/organizations/me');
      expect(response.status).toBe(401);
    });
  });
  
  describe('PUT /api/organizations/me', () => {
    it('should update organization details', async () => {
      const response = await request(API_BASE_URL).put('/api/organizations/me').set('Authorization', `Bearer ${testData.org.accessToken}`).send({ name: 'Updated Org Name' });
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Org Name');
    });
    
    it('should reject without authentication', async () => {
      const response = await request(API_BASE_URL).put('/api/organizations/me').send({ name: 'Hacked' });
      expect(response.status).toBe(401);
    });
  });
  
  describe('GET /api/organizations/:id', () => {
    it('should return organization by id', async () => {
      const response = await request(API_BASE_URL).get(`/api/organizations/${testData.org.id}`).set('Authorization', `Bearer ${testData.org.accessToken}`);
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testData.org.id);
    });
  });
});
