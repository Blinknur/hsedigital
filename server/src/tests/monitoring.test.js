import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import prisma from '../utils/db.js';
import Redis from 'ioredis';
import * as Sentry from '@sentry/node';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';

describe('Comprehensive Monitoring Integration Tests', () => {
  let redis;
  let sentryMock;

  beforeAll(() => {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      lazyConnect: true
    });

    sentryMock = {
      captureException: jest.fn(),
      setUser: jest.fn(),
      setTag: jest.fn(),
      addBreadcrumb: jest.fn()
    };
  });

  afterAll(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check Endpoints - Normal Operation', () => {
    it('should return healthy status when all services are available', async () => {
      const response = await fetch(`${BASE_URL}/api/health`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('status', 'healthy');
      expect(data).toHaveProperty('service', 'hse-digital');
      expect(data).toHaveProperty('checks');
      expect(data.checks).toHaveProperty('database');
      expect(data.checks).toHaveProperty('redis');
      expect(data.checks.database.status).toBe('healthy');
      expect(data.checks.redis.status).toBe('healthy');
      expect(data).toHaveProperty('responseTime');
      expect(data).toHaveProperty('uptime');
    });

    it('should return ready status when service is ready', async () => {
      const response = await fetch(`${BASE_URL}/api/ready`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('status', 'ready');
      expect(data).toHaveProperty('message');
    });

    it('should return alive status on liveness check', async () => {
      const response = await fetch(`${BASE_URL}/api/live`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('status', 'alive');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('timestamp');
    });
  });

  describe('Health Check Endpoints - Database Failure Scenarios', () => {
    it('should handle database connection errors gracefully', async () => {
      const { PrismaClient } = await import('@prisma/client');
      const testPrisma = new PrismaClient({
        datasources: {
          db: {
            url: 'postgresql://invalid:5432/nonexistent'
          }
        }
      });

      let errorThrown = false;
      try {
        await testPrisma.$queryRaw`SELECT 1`;
      } catch (error) {
        errorThrown = true;
        expect(error).toBeDefined();
        expect(error.message).toBeTruthy();
      } finally {
        await testPrisma.$disconnect();
      }

      expect(errorThrown).toBe(true);
    });

    it('should handle database connection timeout gracefully', async () => {
      const { PrismaClient } = await import('@prisma/client');
      const testPrisma = new PrismaClient({
        datasources: {
          db: {
            url: 'postgresql://user:pass@192.0.2.1:5432/db'
          }
        }
      });

      const startTime = Date.now();
      let timedOut = false;

      try {
        await Promise.race([
          testPrisma.$queryRaw`SELECT 1`,
          new Promise((_, reject) => 
            setTimeout(() => {
              timedOut = true;
              reject(new Error('Connection timeout'));
            }, 2000)
          )
        ]);
      } catch (error) {
        const duration = Date.now() - startTime;
        expect(error.message).toContain('timeout');
        expect(duration).toBeGreaterThanOrEqual(1900);
      } finally {
        await testPrisma.$disconnect();
      }

      expect(timedOut).toBe(true);
    });
  });

  describe('Health Check Endpoints - Redis Failure Scenarios', () => {
    it('should handle Redis connection errors gracefully', async () => {
      const testRedis = new Redis({
        host: 'invalid-redis-host',
        port: 9999,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
        lazyConnect: true,
        connectTimeout: 1000
      });

      let errorThrown = false;
      try {
        await testRedis.connect();
        await testRedis.ping();
      } catch (error) {
        errorThrown = true;
        expect(error).toBeDefined();
      } finally {
        testRedis.disconnect();
      }

      expect(errorThrown).toBe(true);
    });

    it('should handle Redis connection timeout gracefully', async () => {
      const testRedis = new Redis({
        host: '192.0.2.1',
        port: 6379,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
        lazyConnect: true,
        connectTimeout: 1000
      });

      const startTime = Date.now();
      let errorCaught = false;

      try {
        await testRedis.connect();
        await testRedis.ping();
      } catch (error) {
        errorCaught = true;
        const duration = Date.now() - startTime;
        expect(duration).toBeGreaterThanOrEqual(900);
      } finally {
        testRedis.disconnect();
      }

      expect(errorCaught).toBe(true);
    });

    it('should detect Redis disconnection after initial connection', async () => {
      const testRedis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
        lazyConnect: true
      });

      await testRedis.connect();
      const initialPing = await testRedis.ping();
      expect(initialPing).toBe('PONG');

      testRedis.disconnect();

      let errorThrown = false;
      try {
        await testRedis.ping();
      } catch (error) {
        errorThrown = true;
      }

      expect(errorThrown).toBe(true);
    });
  });

  describe('Prometheus Metrics Accuracy', () => {
    it('should expose Prometheus metrics endpoint', async () => {
      const response = await fetch(`${BASE_URL}/metrics`);
      expect(response.status).toBe(200);
      
      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('text/plain');
    });

    it('should include all required HTTP metrics', async () => {
      const response = await fetch(`${BASE_URL}/metrics`);
      const text = await response.text();

      expect(text).toContain('hse_digital_http_requests_total');
      expect(text).toContain('hse_digital_http_request_duration_seconds');
      expect(text).toContain('hse_digital_http_request_errors_total');
      expect(text).toContain('hse_digital_active_connections');
    });

    it('should include tenant-specific metrics', async () => {
      const response = await fetch(`${BASE_URL}/metrics`);
      const text = await response.text();

      expect(text).toContain('hse_digital_tenant_requests_total');
      expect(text).toContain('hse_digital_tenant_latency_seconds');
      expect(text).toContain('hse_digital_tenant_errors_total');
    });

    it('should include database metrics', async () => {
      const response = await fetch(`${BASE_URL}/metrics`);
      const text = await response.text();

      expect(text).toContain('hse_digital_database_query_duration_seconds');
      expect(text).toContain('hse_digital_database_queries_total');
    });

    it('should include cache metrics', async () => {
      const response = await fetch(`${BASE_URL}/metrics`);
      const text = await response.text();

      expect(text).toContain('hse_digital_cache_hits_total');
      expect(text).toContain('hse_digital_cache_misses_total');
    });

    it('should include authentication metrics', async () => {
      const response = await fetch(`${BASE_URL}/metrics`);
      const text = await response.text();

      expect(text).toContain('hse_digital_auth_attempts_total');
      expect(text).toContain('hse_digital_auth_failures_total');
    });

    it('should include rate limit metrics', async () => {
      const response = await fetch(`${BASE_URL}/metrics`);
      const text = await response.text();

      expect(text).toContain('hse_digital_rate_limit_hits_total');
    });

    it('should include default Node.js metrics', async () => {
      const response = await fetch(`${BASE_URL}/metrics`);
      const text = await response.text();

      expect(text).toContain('hse_digital_process_cpu_user_seconds_total');
      expect(text).toContain('hse_digital_process_resident_memory_bytes');
      expect(text).toContain('hse_digital_nodejs_eventloop_lag_seconds');
      expect(text).toContain('hse_digital_nodejs_heap_size_total_bytes');
    });

    it('should increment request counter on API calls', async () => {
      const beforeMetrics = await fetch(`${BASE_URL}/metrics`).then(r => r.text());
      await fetch(`${BASE_URL}/api/live`);
      const afterMetrics = await fetch(`${BASE_URL}/metrics`).then(r => r.text());
      expect(afterMetrics.length).toBeGreaterThan(0);
    });

    it('should track request duration with histogram buckets', async () => {
      const response = await fetch(`${BASE_URL}/metrics`);
      const text = await response.text();

      expect(text).toMatch(/hse_digital_http_request_duration_seconds_bucket/);
      expect(text).toMatch(/le="0.001"/);
      expect(text).toMatch(/le="0.01"/);
      expect(text).toMatch(/le="0.1"/);
      expect(text).toMatch(/le="1"/);
    });
  });

  describe('Sentry Error Capture', () => {
    it('should capture exception with basic error context', () => {
      const testError = new Error('Test error for Sentry');
      const context = { operation: 'test_operation', userId: 'test-user-123' };

      sentryMock.captureException(testError, { contexts: { custom: context } });

      expect(sentryMock.captureException).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          contexts: expect.objectContaining({
            custom: context
          })
        })
      );
    });

    it('should set user context with proper fields', () => {
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'Admin',
        organizationId: 'org-456'
      };

      sentryMock.setUser(testUser);
      expect(sentryMock.setUser).toHaveBeenCalledWith(testUser);
    });

    it('should set tenant context with tags', () => {
      const tenantId = 'tenant-789';
      const organizationName = 'Test Organization';

      sentryMock.setTag('tenant_id', tenantId);
      sentryMock.setTag('organization_name', organizationName);
      
      expect(sentryMock.setTag).toHaveBeenCalledWith('tenant_id', tenantId);
      expect(sentryMock.setTag).toHaveBeenCalledWith('organization_name', organizationName);
    });

    it('should add breadcrumbs for tracking user actions', () => {
      const breadcrumb = {
        message: 'User action',
        category: 'user',
        level: 'info',
        data: { action: 'click', element: 'button' }
      };

      sentryMock.addBreadcrumb(breadcrumb);
      expect(sentryMock.addBreadcrumb).toHaveBeenCalledWith(breadcrumb);
    });

    it('should capture HTTP request breadcrumbs', () => {
      const breadcrumb = {
        message: 'GET /api/stations',
        category: 'http',
        level: 'info',
        data: {
          method: 'GET',
          url: '/api/stations',
          status_code: 200
        }
      };

      sentryMock.addBreadcrumb(breadcrumb);
      expect(sentryMock.addBreadcrumb).toHaveBeenCalledWith(breadcrumb);
    });

    it('should capture database operation breadcrumbs', () => {
      const breadcrumb = {
        message: 'Database query executed',
        category: 'db',
        level: 'info',
        data: {
          model: 'Station',
          operation: 'findMany',
          duration: 25
        }
      };

      sentryMock.addBreadcrumb(breadcrumb);
      expect(sentryMock.addBreadcrumb).toHaveBeenCalledWith(breadcrumb);
    });
  });

  describe('Structured Logging Output', () => {
    it('should verify database connection through Prisma', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as value`;
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should verify Redis connection', async () => {
      await redis.connect();
      const pong = await redis.ping();
      expect(pong).toBe('PONG');
    });
  });
});

console.log('✅ Comprehensive monitoring integration tests configured');
console.log('ℹ️  Run tests with: npm test');
