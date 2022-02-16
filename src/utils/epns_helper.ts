import epnsHelper, {
  EPNSSettings,
  InfuraSettings,
  NetWorkSettings,
} from '@epnsproject/backend-sdk'

import { CommABI, CoreABI } from './abis/epns'

const infuraSettings: InfuraSettings = {
  projectID: process.env.NEXT_INFURA_ID!,
  projectSecret: process.env.NEXT_INFURA_SECRET!,
}

const networkSettings: NetWorkSettings = {
  infura: infuraSettings,
}

const epnsCoreSettings: EPNSSettings = {
  network: process.env.NEXT_PUBLIC_ENV === 'production' ? 'homestead' : 'kovan',
  contractAddress:
    process.env.NEXT_PUBLIC_ENV === 'production'
      ? '0x66329Fdd4042928BfCAB60b179e1538D56eeeeeE'
      : '0x97D7c5f14B8fe94Ef2b4bA589379f5Ec992197dA',
  contractABI: JSON.stringify(CoreABI),
}
// EPNS Communicator settings contains details on EPNS Communicator contract network, address and contract ABI
const epnsCommSettings: EPNSSettings = {
  network: process.env.NEXT_PUBLIC_ENV === 'production' ? 'homestead' : 'kovan',
  contractAddress:
    process.env.NEXT_PUBLIC_ENV === 'production'
      ? '0xb3971bcef2d791bc4027bbfedfb47319a4aaaaaa'
      : '0x87da9Af1899ad477C67FeA31ce89c1d2435c77DC',
  contractABI: JSON.stringify(CommABI),
}

export const sendEPNSNotification = async (
  destination_addresses: string[],
  title: string,
  message: string
) => {
  const sdk = new epnsHelper(
    'homestead',
    //'4ca2cb4a1be2c78b731ae696fc5789523d25cba7a6967689e5110e93ec01a32d', //9tails
    '49748cc7ffbbdbf3640655fbbb5956ec5374942a5697e3470f6e2f6a279896b8',
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
        { offChain: false }
      )
      console.log('sent')
    } catch (error) {
      console.log(error)
    }
  }
}
