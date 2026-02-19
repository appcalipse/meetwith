// eslint-disable-next-line @typescript-eslint/no-var-requires
/** biome-ignore-all lint/style/noCommonJs: config file */
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

const esModules = [
  '@wagmi',
  'html-tags',
  '@walletconnect',
  'viem',
  '@tanstack',
].join('|')

// Add any custom config to be passed to Jest

/** @type {import('jest').Config} */
const customJestConfig = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  // Add more setup options before each test is run
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // if using TypeScript with a baseUrl set to the root directory then you need the below for alias' to work
  moduleDirectories: ['node_modules', __dirname],
  moduleFileExtensions: ['js', 'jsx', 'tsx', 'ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '**/__tests__/**/*.(spec|test).(ts|tsx|js|jsx)',
    '**/*.(spec|test).(ts|tsx|js|jsx)',
  ],
  collectCoverageFrom: [
    './src/**',
    '!./src/__tests__/**',
    '!./src/**/*.d.ts',
    '!./src/utils/services/calendar.service.types.ts',
    '!./src/instrumentation*.ts',
    '!./src/testing/**',
    '!./src/**/*.test.ts',
    '!./src/**/*.spec.ts',
    '!./src/**/*.test.tsx',
    '!./src/**/*.spec.tsx',
    // Exclude non-testable framework boilerplate and CSS-in-JS
    '!./src/styles/**',
    '!./src/pages/**',
  ],
  verbose: true,
  resolver: `./resolver.js`,
  transform: {
    '^.+\\.(ts|tsx)?$': 'ts-jest',
  },
  moduleNameMapper: {
    '@/(.*)': 'src/$1',
    'swiper/react': 'swiper/react/swiper-react.js',
    'swiper/css': '<rootDir>/__mocks__/jestMock.js',
    '(.*)PlansMobileSlider': '<rootDir>/__mocks__/jestMock.js',
    '(.*)Features': '<rootDir>/__mocks__/jestMock.js',
    'swiper/css/pagination': '<rootDir>/__mocks__/jestMock.js',
    'react-intersection-observer': '<rootDir>/__mocks__/intersection.js',
    'html-tags': '<rootDir>/__mocks__/htmlTags.js',
  },
  testTimeout: 30000,
  preset: 'ts-jest/presets/default-esm',
  transformIgnorePatterns: [`node_modules/(?!(${esModules})/)`],
  globals: {
    Uint8Array,
    ArrayBuffer,
  },
  coverageThreshold: {
    global: {
      statements: 40,
      branches: 40,
      functions: 40,
      lines: 40,
    },
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
