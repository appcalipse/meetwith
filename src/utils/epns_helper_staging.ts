import epnsHelper, {
  EPNSSettings,
  InfuraSettings,
  NetWorkSettings,
} from '@epnsproject/backend-sdk-staging'
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
  network: 'kovan',
  contractAddress: '0x97D7c5f14B8fe94Ef2b4bA589379f5Ec992197dA',
  contractABI: JSON.stringify(CoreABI),
}

const epnsCommSettings: EPNSSettings = {
  network: 'kovan',
  contractAddress: '0x87da9Af1899ad477C67FeA31ce89c1d2435c77DC',
  contractABI: JSON.stringify(CommABI),
}

export const sendEPNSNotificationStaging = async (
  destination_addresses: string[],
  title: string,
  message: string
) => {
  const sdk = new epnsHelper(
    networkToMonitor,
    process.env.BACKEND_NOTIFIER_WALLET_PVT_KEY!,
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
