import { jest } from '@jest/globals';

jest.setTimeout(30000);

global.console = {
  ...console,
  error: jest.fn((...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM') ||
       args[0].includes('Warning: useLayoutEffect'))
    ) {
      return;
    }
    console.error(...args);
  }),
};

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';
process.env.REFRESH_SECRET = process.env.REFRESH_SECRET || 'test-refresh-secret-key-for-testing';
