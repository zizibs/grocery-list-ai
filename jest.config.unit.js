const baseConfig = require('./jest.config.base')

module.exports = {
  ...baseConfig,
  testMatch: ['**/__tests__/**/*.unit.test.[jt]s?(x)'],
  collectCoverage: true,
  collectCoverageFrom: [
    'app/components/**/*.{js,jsx,ts,tsx}',
    '!app/components/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
} 