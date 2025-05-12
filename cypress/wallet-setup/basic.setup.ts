import { defineWalletSetup } from '@synpress-cypress/synpress'
import { MetaMask } from '@synpress-cypress/synpress/cypress'

const SEED_PHRASE =
  'test test test test test test test test test test test junk'
const PASSWORD = 'SynpressIsAwesomeNow!!!'

export default defineWalletSetup(PASSWORD, async (context, walletPage) => {
  const metamask = new MetaMask(context, walletPage, PASSWORD)

  await metamask.importWallet(SEED_PHRASE)
})
