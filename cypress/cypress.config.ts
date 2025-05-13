import { configureSynpressForMetaMask } from '@synpress-cypress/synpress/cypress'
import { defineConfig } from 'cypress'
import dotenv from 'dotenv'
dotenv.config({
  path: '../.env.test.local',
})

const getBrowser = () => {}
// Define Cypress configuration
export default defineConfig({
  chromeWebSecurity: true,
  userAgent: 'synpress',
  e2e: {
    baseUrl: 'http://localhost:3000',
    testIsolation: true,
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: '**/e2e.{js,jsx,ts,tsx}',
    setupNodeEvents(on, config) {
      config.browsers = [
        {
          name: 'chrome',
          family: 'chromium',
          channel: 'stable',
          displayName: 'Chrome',
          version: '116.0.5793.0',
          path: '/Users/mac/Desktop/meet-with-wallet/chrome/mac-116.0.5793.0/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
          minSupportedVersion: 64,
          majorVersion: '116',
        },
      ] as any
      return configureSynpressForMetaMask(on, config, true) as any
    },
    experimentalInteractiveRunEvents: true,
  },
  env: process.env,
  defaultCommandTimeout: 12_000,
  taskTimeout: 60_000,
})
