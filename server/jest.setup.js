import { jest } from '@jest/globals';

jest.setTimeout(30000);

const originalError = console.error;
const originalWarn = console.warn;

global.console = {
  ...console,
  error: jest.fn((...args) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (
      msg.includes('Warning: ReactDOM') ||
      msg.includes('Warning: useLayoutEffect') ||
      msg.includes('[ioredis] Unhandled error event') ||
      msg.includes('connect ECONNREFUSED') ||
      msg.includes('connect ETIMEDOUT') ||
      msg.includes('Redis connection error') ||
      msg.includes('Database error occurred')
    ) {
      return;
    }
    if (process.env.NODE_ENV !== 'test') {
      originalError(...args);
    }
  }),
  warn: jest.fn((...args) => {
    if (process.env.NODE_ENV !== 'test') {
      originalWarn(...args);
    }
  }),
};

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';
process.env.REFRESH_SECRET = process.env.REFRESH_SECRET || 'test-refresh-secret-key-for-testing';
process.env.OTEL_ENABLED = 'false';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
