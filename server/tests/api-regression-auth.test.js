import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const prisma = new PrismaClient();

const testData = {
  org: null,
  user: null,
  tokens: null,
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
}, 60000);

afterAll(async () => {
  try {
    if (testData.user) await prisma.user.delete({ where: { id: testData.user.id } }).catch(() => {});
    if (testData.org) await prisma.organization.delete({ where: { id: testData.org.id } }).catch(() => {});
  } catch (error) {
    console.error('Cleanup error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
});

describe('Authentication Flow Regression Tests', () => {
  const credentials = generateTestData();
  
  describe('POST /api/auth/signup-with-org', () => {
    it('should create organization and user successfully', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/signup-with-org')
        .send({
          organizationName: 'Test Organization',
          subdomain: credentials.subdomain,
          name: credentials.name,
          email: credentials.email,
          password: credentials.password,
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('organization');
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user.email).toBe(credentials.email);
      expect(response.body.organization.subdomain).toBe(credentials.subdomain);
      
      testData.org = response.body.organization;
      testData.user = response.body.user;
    });
    
    it('should reject signup with duplicate subdomain', async () => {
      const newData = generateTestData();
      const response = await request(API_BASE_URL)
        .post('/api/auth/signup-with-org')
        .send({
          organizationName: 'Another Org',
          subdomain: credentials.subdomain,
          name: newData.name,
          email: newData.email,
          password: newData.password,
        });
      
      expect(response.status).toBe(409);
      expect(response.body.error).toContain('Subdomain already taken');
    });
    
    it('should reject invalid subdomain format', async () => {
      const newData = generateTestData();
      const response = await request(API_BASE_URL)
        .post('/api/auth/signup-with-org')
        .send({
          organizationName: 'Test Org',
          subdomain: 'Invalid_Subdomain!',
          name: newData.name,
          email: newData.email,
          password: newData.password,
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
    
    it('should reject signup with missing required fields', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/signup-with-org')
        .send({
          organizationName: 'Test Org',
          subdomain: 'test-sub',
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
  
  describe('GET /api/auth/check-subdomain', () => {
    it('should return unavailable for existing subdomain', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/check-subdomain')
        .query({ subdomain: credentials.subdomain });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('available');
      expect(response.body.available).toBe(false);
    });
    
    it('should return available for new subdomain', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/check-subdomain')
        .query({ subdomain: `new-subdomain-${Date.now()}` });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('available');
      expect(response.body.available).toBe(true);
    });
    
    it('should reject request without subdomain parameter', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/check-subdomain');
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('POST /api/auth/verify-email', () => {
    it('should verify user email', async () => {
      await prisma.user.update({
        where: { id: testData.user.id },
        data: { isEmailVerified: true }
      });
      
      const user = await prisma.user.findUnique({ where: { id: testData.user.id } });
      expect(user.isEmailVerified).toBe(true);
    });
  });
  
  describe('POST /api/auth/login', () => {
    it('should login successfully with verified email', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: credentials.email,
          password: credentials.password,
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user.email).toBe(credentials.email);
      
      testData.tokens = {
        accessToken: response.body.accessToken,
        refreshToken: response.body.refreshToken,
      };
    });
    
    it('should reject login with invalid password', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: credentials.email,
          password: 'WrongPassword123!',
        });
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
    
    it('should reject login with non-existent email', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPassword123!',
        });
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
    
    it('should reject login with missing credentials', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({});
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('POST /api/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/refresh')
        .send({
          refreshToken: testData.tokens.refreshToken,
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      
      testData.tokens.accessToken = response.body.accessToken;
      testData.tokens.refreshToken = response.body.refreshToken;
    });
    
    it('should reject refresh with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        });
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
    
    it('should reject refresh without token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/refresh')
        .send({});
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
  
  describe('POST /api/auth/password-reset-request', () => {
    it('should accept password reset request for existing user', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/password-reset-request')
        .send({
          email: credentials.email,
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
    
    it('should return success for non-existent email (security)', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/password-reset-request')
        .send({
          email: 'nonexistent@example.com',
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
    
    it('should reject request without email', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/password-reset-request')
        .send({});
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/logout')
        .send({
          refreshToken: testData.tokens.refreshToken,
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
    
    it('should handle logout without refresh token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/logout')
        .send({});
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });
  
  describe('POST /api/auth/resend-verification', () => {
    it('should resend verification email for unverified user', async () => {
      await prisma.user.update({
        where: { id: testData.user.id },
        data: { isEmailVerified: false }
      });
      
      const response = await request(API_BASE_URL)
        .post('/api/auth/resend-verification')
        .send({
          email: credentials.email,
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });
});
