// eslint-disable-next-line @typescript-eslint/no-var-requires
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

const esModules = ['@wagmi'].join('|')

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
  collectCoverageFrom: ['./src/**'],
  verbose: true,
  resolver: `./resolver.js`,
  transform: {
    '\\.m?[j|t]sx?$': 'jest-esm-transformer',
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
  },
  testTimeout: 30000,
  preset: 'ts-jest/presets/default-esm',
  globals: {
    Uint8Array,
    ArrayBuffer,
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
