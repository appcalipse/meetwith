import { configureSynpressForMetaMask } from '@synthetixio/synpress/cypress'
import * as dotenv from 'dotenv'

dotenv.config({
  path: '../.env.test.local',
})
import { defineConfig } from 'cypress'
export default defineConfig({
  e2e: {
    baseUrl: process.env.NEXT_PUBLIC_HOSTED_AT,
    setupNodeEvents(on, config) {
      configureSynpressForMetaMask(on, config)
      return config
    },
    experimentalStudio: true,
  },

  env: {
    ...process.env,
  },
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
  },
})
