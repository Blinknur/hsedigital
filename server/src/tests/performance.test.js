import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { getRedisClient, closeRedis } from '../shared/utils/redis.js';
import { cacheManager } from '../shared/utils/cache.js';
import { buildCursorPagination, formatCursorResponse, encodeCursor, decodeCursor } from '../shared/utils/pagination.js';

describe('Performance Optimizations', () => {
  let redis;

  beforeAll(async () => {
    redis = getRedisClient();
    await redis.ping();
  });

  afterAll(async () => {
    await closeRedis();
  });

  describe('Redis Connection', () => {
    test('should connect to Redis', async () => {
      const pong = await redis.ping();
      expect(pong).toBe('PONG');
    });

    test('should set and get values', async () => {
      await redis.set('test:key', 'test-value');
      const value = await redis.get('test:key');
      expect(value).toBe('test-value');
      await redis.del('test:key');
    });
  });

  describe('Cache Manager', () => {
    test('should generate proper cache keys', () => {
      const key = cacheManager.generateKey('test', 'identifier');
      expect(key).toBe('cache:test:identifier');
    });

    test('should generate tenant-specific keys', () => {
      const key = cacheManager.getTenantKey('tenant123', 'stations', 'all');
      expect(key).toBe('cache:tenant:tenant123:stations:all');
    });

    test('should set and get cached values', async () => {
      const testData = { id: '123', name: 'Test' };
      await cacheManager.set('test:data', testData, 60);
      const cached = await cacheManager.get('test:data');
      expect(cached).toEqual(testData);
      await cacheManager.del('test:data');
    });

    test('should handle cache misses', async () => {
      const cached = await cacheManager.get('test:nonexistent');
      expect(cached).toBeNull();
    });

    test('should use getOrFetch pattern', async () => {
      let fetchCalled = false;
      const fetchFn = async () => {
        fetchCalled = true;
        return { data: 'fetched' };
      };

      const result1 = await cacheManager.getOrFetch('test:fetch', fetchFn, 60);
      expect(fetchCalled).toBe(true);
      expect(result1).toEqual({ data: 'fetched' });

      fetchCalled = false;
      const result2 = await cacheManager.getOrFetch('test:fetch', fetchFn, 60);
      expect(fetchCalled).toBe(false);
      expect(result2).toEqual({ data: 'fetched' });

      await cacheManager.del('test:fetch');
    });

    test('should handle batch operations', async () => {
      const entries = [
        ['test:batch:1', { id: 1 }],
        ['test:batch:2', { id: 2 }],
        ['test:batch:3', { id: 3 }]
      ];

      await cacheManager.mset(entries, 60);
      const values = await cacheManager.mget(['test:batch:1', 'test:batch:2', 'test:batch:3']);
      
      expect(values).toHaveLength(3);
      expect(values[0]).toEqual({ id: 1 });
      expect(values[1]).toEqual({ id: 2 });
      expect(values[2]).toEqual({ id: 3 });

      await Promise.all([
        cacheManager.del('test:batch:1'),
        cacheManager.del('test:batch:2'),
        cacheManager.del('test:batch:3')
      ]);
    });

    test('should invalidate by pattern', async () => {
      await cacheManager.set('test:pattern:1', { id: 1 }, 60);
      await cacheManager.set('test:pattern:2', { id: 2 }, 60);
      await cacheManager.set('test:other:1', { id: 3 }, 60);

      await cacheManager.invalidatePattern('cache:test:pattern:*');

      const val1 = await cacheManager.get('test:pattern:1');
      const val2 = await cacheManager.get('test:pattern:2');
      const val3 = await cacheManager.get('test:other:1');

      expect(val1).toBeNull();
      expect(val2).toBeNull();
      expect(val3).toEqual({ id: 3 });

      await cacheManager.del('test:other:1');
    });
  });

  describe('Pagination', () => {
    test('should encode and decode cursors', () => {
      const data = { id: 'cltxyz123', createdAt: '2024-01-01' };
      const cursor = encodeCursor(data);
      expect(typeof cursor).toBe('string');

      const decoded = decodeCursor(cursor);
      expect(decoded).toEqual(data);
    });

    test('should build cursor pagination options', () => {
      const options = buildCursorPagination({
        cursor: null,
        limit: 50,
        orderBy: { createdAt: 'desc' },
        cursorField: 'id'
      });

      expect(options).toHaveProperty('take', 51);
      expect(options).toHaveProperty('orderBy');
      expect(options).not.toHaveProperty('cursor');
    });

    test('should build cursor pagination with cursor', () => {
      const cursor = encodeCursor({ id: 'test123' });
      const options = buildCursorPagination({
        cursor,
        limit: 50,
        orderBy: { createdAt: 'desc' },
        cursorField: 'id'
      });

      expect(options).toHaveProperty('take', 51);
      expect(options).toHaveProperty('cursor');
      expect(options).toHaveProperty('skip', 1);
    });

    test('should format cursor response without more items', () => {
      const items = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
        { id: '3', name: 'Item 3' }
      ];

      const response = formatCursorResponse(items, 50, 'id');

      expect(response.data).toHaveLength(3);
      expect(response.pagination.hasMore).toBe(false);
      expect(response.pagination.nextCursor).toBeNull();
      expect(response.pagination.count).toBe(3);
    });

    test('should format cursor response with more items', () => {
      const items = Array.from({ length: 51 }, (_, i) => ({
        id: `id-${i}`,
        name: `Item ${i}`
      }));

      const response = formatCursorResponse(items, 50, 'id');

      expect(response.data).toHaveLength(50);
      expect(response.pagination.hasMore).toBe(true);
      expect(response.pagination.nextCursor).not.toBeNull();
      expect(response.pagination.count).toBe(50);

      const decoded = decodeCursor(response.pagination.nextCursor);
      expect(decoded.id).toBe('id-49');
    });

    test('should enforce maximum limit', () => {
      const options = buildCursorPagination({
        cursor: null,
        limit: 200,
        orderBy: { createdAt: 'desc' },
        cursorField: 'id'
      });

      expect(options.take).toBeLessThanOrEqual(101);
    });
  });

  describe('Tenant Cache Operations', () => {
    test('should set and get tenant data', async () => {
      const tenantId = 'tenant-test-123';
      const data = { id: 'station-1', name: 'Test Station' };

      await cacheManager.setTenantData(tenantId, 'stations', 'station-1', data);
      const cached = await cacheManager.getTenantData(tenantId, 'stations', 'station-1');

      expect(cached).toEqual(data);

      await cacheManager.invalidateTenantCache(tenantId, 'stations');
    });

    test('should invalidate all tenant caches', async () => {
      const tenantId = 'tenant-test-456';

      await cacheManager.setTenantData(tenantId, 'stations', 'all', []);
      await cacheManager.setTenantData(tenantId, 'audits', 'all', []);
      await cacheManager.setTenantData(tenantId, 'incidents', 'all', []);

      await cacheManager.invalidateTenantCache(tenantId);

      const stations = await cacheManager.getTenantData(tenantId, 'stations', 'all');
      const audits = await cacheManager.getTenantData(tenantId, 'audits', 'all');
      const incidents = await cacheManager.getTenantData(tenantId, 'incidents', 'all');

      expect(stations).toBeNull();
      expect(audits).toBeNull();
      expect(incidents).toBeNull();
    });

    test('should invalidate specific resource caches', async () => {
      const tenantId = 'tenant-test-789';

      await cacheManager.setTenantData(tenantId, 'stations', 'all', []);
      await cacheManager.setTenantData(tenantId, 'audits', 'all', []);

      await cacheManager.invalidateTenantCache(tenantId, 'stations');

      const stations = await cacheManager.getTenantData(tenantId, 'stations', 'all');
      const audits = await cacheManager.getTenantData(tenantId, 'audits', 'all');

      expect(stations).toBeNull();
      expect(audits).toEqual([]);

      await cacheManager.invalidateTenantCache(tenantId);
    });
  });
});
