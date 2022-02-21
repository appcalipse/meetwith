import epnsHelper, {
  EPNSSettings,
  InfuraSettings,
  NetWorkSettings,
} from '@epnsproject/backend-sdk'
import * as Sentry from '@sentry/node'

import { CommABI, CoreABI } from './abis/epns'

const networkToMonitor = 'homestead'

const infuraSettings: InfuraSettings = {
  projectID: process.env.NEXT_INFURA_ID!,
  projectSecret: process.env.NEXT_INFURA_SECRET!,
}

const networkSettings: NetWorkSettings = {
  infura: infuraSettings,
}

const epnsCoreSettings: EPNSSettings = {
  network: 'homestead',
  contractAddress: '0x66329Fdd4042928BfCAB60b179e1538D56eeeeeE',
  contractABI: JSON.stringify(CoreABI),
}

const epnsCommSettings: EPNSSettings = {
  network: 'homestead',
  contractAddress: '0xb3971BCef2D791bc4027BbfedFb47319A4AAaaAa',
  contractABI: JSON.stringify(CommABI),
}

export const sendEPNSNotification = async (
  destination_addresses: string[],
  title: string,
  message: string
) => {
  const sdk = new epnsHelper(
    networkToMonitor,
    process.env.BACKEND_WALLET_PVT_KEY!,
    '0xe5b06bfd663C94005B8b159Cd320Fd7976549f9b',
    networkSettings,
    epnsCoreSettings,
    epnsCommSettings
  )
  for (const address of destination_addresses) {
    try {
      await sdk.sendNotification(
        address,
        title,
        message,
        title,
        message,
        3,
        'https://meetwithwallet.xyz',
        undefined,
        false,
        { offChain: true }
      )
    } catch (error) {
      Sentry.captureException(error)
    }
  }
}
