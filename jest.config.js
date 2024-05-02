// eslint-disable-next-line @typescript-eslint/no-var-requires
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

const esModules = ['@wagmi'].join('|')

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Add more setup options before each test is run
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // if using TypeScript with a baseUrl set to the root directory then you need the below for alias' to work
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: ['./src/**'],
  verbose: true,
  resolver: `./resolver.js`,
  // transform: {
  //   '\\.m?[j|t]sx?$': 'jest-esm-transformer',

  // },
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
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = async () => ({
  /**
   * Using ...(await createJestConfig(customJestConfig)()) to override transformIgnorePatterns
   * provided byt next/jest.
   *
   * @link https://github.com/vercel/next.js/issues/36077#issuecomment-1096635363
   */
  ...(await createJestConfig(customJestConfig)()),
  /**
   * Swiper use ECMAScript Modules (ESM) and Jest provides some experimental support for it
   * but "node_modules" are not transpiled by next/jest yet.
   *
   * The "transformIgnorePatterns" on "jest.config.js" prevents the Swiper files from being
   * transformed by Jest but it affects the CSS files that are provided by this package.
   * Mocking these CSS files is the solution that demands the smallest configuration.
   *
   * @link https://github.com/vercel/next.js/issues/36077#issuecomment-1096698456
   * @link https://jestjs.io/docs/ecmascript-modules
   */
  collectCoverageFrom: [
    'pages/**/*.{js,jsx,ts,tsx}',
    'features/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/reportWebVitals.ts',
    '!**/node_modules/**',
  ],
  verbose: true,
  testPathIgnorePatterns: ['<rootDir>/src/__tests__/tofix'],
  transformIgnorePatterns: [`node_modules/(?!(${esModules})/)`],
})
