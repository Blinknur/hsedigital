export default {
  testEnvironment: 'node',
  
  transform: {},
  
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.test.js',
  ],
  
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/load-testing/',
    '/dist/',
    '/build/',
  ],
  
  coverageDirectory: 'coverage',
  
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/coverage/',
    '/dist/',
    'jest.config.js',
  ],
  
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/tests/**',
    '!src/**/index.js',
    '!src/**/*.config.js',
  ],
  
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
  
  globalSetup: '<rootDir>/tests/setup/global-setup.js',
  
  globalTeardown: '<rootDir>/tests/setup/global-teardown.js',
  
  testTimeout: 30000,
  
  maxWorkers: '50%',
  
  verbose: true,
  
  detectOpenHandles: true,
  
  forceExit: true,
  
  clearMocks: true,
  
  resetMocks: false,
  
  restoreMocks: false,
};
