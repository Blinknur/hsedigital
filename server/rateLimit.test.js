import { jest } from '@jest/globals';
import { rateLimitMiddleware, getRateLimitStatus, getRateLimitAnalytics } from './rateLimit.js';

const mockRedis = {
  eval: jest.fn(),
  get: jest.fn(),
  incr: jest.fn()
};

const mockPrisma = {
  organization: {
    findUnique: jest.fn()
  }
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis);
});

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
}));

describe('Rate Limiting Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: {
        id: 'user-123',
        organizationId: 'org-456'
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('should allow request when under rate limit', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      subscriptionTier: 'Pro'
    });

    mockRedis.eval.mockResolvedValue([1, 4999, 5000, 60000]);
    mockRedis.incr.mockResolvedValue(1);

    await rateLimitMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'X-RateLimit-Limit': '5000',
        'X-RateLimit-Remaining': '4999'
      })
    );
  });

  test('should block request when rate limit exceeded', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      subscriptionTier: 'Free'
    });

    mockRedis.eval.mockResolvedValue([0, 0, 100, 30000]);

    await rateLimitMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('Rate limit exceeded')
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 401 when user not authenticated', async () => {
    req.user = null;

    await rateLimitMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('should use default plan when organization not found', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(null);
    mockRedis.eval.mockResolvedValue([1, 99, 100, 60000]);
    mockRedis.incr.mockResolvedValue(1);

    await rateLimitMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'X-RateLimit-Limit': '100'
      })
    );
  });
});

describe('Rate Limit Status Endpoint', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: {
        id: 'user-123',
        organizationId: 'org-456'
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  test('should return rate limit status', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      subscriptionTier: 'Pro'
    });

    mockRedis.get.mockResolvedValueOnce('4500')
      .mockResolvedValueOnce('45000')
      .mockResolvedValueOnce('450');

    await getRateLimitStatus(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: expect.objectContaining({
          requestsPerHour: 5000,
          requestsPerDay: 50000
        }),
        tenant: expect.objectContaining({
          hourly: expect.objectContaining({
            remaining: 4500,
            limit: 5000
          })
        })
      })
    );
  });
});

describe('Rate Limit Analytics Endpoint', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: {
        id: 'user-123',
        organizationId: 'org-456',
        role: 'Admin'
      },
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  test('should return analytics for admin user', async () => {
    mockRedis.get.mockResolvedValue('150');

    await getRateLimitAnalytics(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-456',
        analytics: expect.arrayContaining([
          expect.objectContaining({
            date: expect.any(String),
            requests: expect.any(Number)
          })
        ])
      })
    );
  });

  test('should deny access for non-admin user', async () => {
    req.user.role = 'User';

    await getRateLimitAnalytics(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Admin access required'
      })
    );
  });
});
