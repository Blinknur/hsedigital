export default {
  testEnvironment: 'node',
  
  transform: {},
  
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  
  testMatch: [
    '**/tests/**/*.test.js',
    '**/src/tests/**/*.test.js',
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
  
  coverageReporters: ['html', 'text', 'lcov', 'json-summary'],
  
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  

  
  testTimeout: 30000,
  
  maxWorkers: '50%',
  
  verbose: true,
  
  detectOpenHandles: true,
  
  forceExit: true,
  
  clearMocks: true,
  
  resetMocks: false,
  
  restoreMocks: false,
  
  bail: false,
  
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'HSE Digital - Test Report',
        outputPath: 'test-results/index.html',
        includeFailureMsg: true,
        includeConsoleLog: true,
        sort: 'status',
        executionTimeWarningThreshold: 5,
        dateFormat: 'yyyy-mm-dd HH:MM:ss'
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: 'test-results',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ],
};
