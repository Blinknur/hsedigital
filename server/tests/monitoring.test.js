import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

describe('Monitoring Integration Tests', () => {
  let prisma;
  let redis;

  beforeAll(() => {
    prisma = new PrismaClient();
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      lazyConnect: true
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });

  describe('Health Endpoints', () => {
    it('should have health check endpoint available', async () => {
      const response = await fetch('http://localhost:3001/api/health');
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('checks');
    });

    it('should have readiness endpoint available', async () => {
      const response = await fetch('http://localhost:3001/api/ready');
      expect([200, 503]).toContain(response.status);
    });

    it('should have liveness endpoint available', async () => {
      const response = await fetch('http://localhost:3001/api/live');
      expect(response.status).toBe(200);
    });
  });

  describe('Metrics Endpoint', () => {
    it('should expose Prometheus metrics', async () => {
      const response = await fetch('http://localhost:3001/metrics');
      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toContain('hse_digital_http_requests_total');
      expect(text).toContain('hse_digital_http_request_duration_seconds');
    });
  });

  describe('Database Connectivity', () => {
    it('should connect to database', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as value`;
      expect(result).toBeDefined();
    });
  });

  describe('Redis Connectivity', () => {
    it('should connect to Redis', async () => {
      await redis.connect();
      const pong = await redis.ping();
      expect(pong).toBe('PONG');
    });
  });
});

console.log('✅ Monitoring integration tests configured');
console.log('ℹ️  Run tests with: npm test');
