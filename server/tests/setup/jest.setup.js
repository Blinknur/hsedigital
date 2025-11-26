import { jest } from '@jest/globals';

jest.setTimeout(30000);

global.console = {
  ...console,
  error: jest.fn((...args) => {
    if (
      args[0]?.includes?.('deprecated') ||
      args[0]?.includes?.('ExperimentalWarning')
    ) {
      return;
    }
    return console.error(...args);
  }),
  warn: jest.fn((...args) => {
    if (
      args[0]?.includes?.('deprecated') ||
      args[0]?.includes?.('ExperimentalWarning')
    ) {
      return;
    }
    return console.warn(...args);
  }),
};

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
