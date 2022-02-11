import { StringOrNumber } from '@chakra-ui/utils'
import epnsHelper, {
  EPNSSettings,
  InfuraSettings,
  NetWorkSettings,
} from '@epnsproject/backend-sdk'

const infuraSettings: InfuraSettings = {
  projectID: process.env.NEXT_INFURA_ID!,
  projectSecret: process.env.NEXT_INFURA_SECRET!,
}

const networkSettings: NetWorkSettings = {
  infura: infuraSettings,
}

const epnsCoreSettings: EPNSSettings = {
  network: 'kovan',
  contractAddress: '0xb3971BCef2D791bc4027BbfedFb47319A4AAaaAa',
  contractABI: '',
}
// EPNS Communicator settings contains details on EPNS Communicator contract network, address and contract ABI
const epnsCommSettings: EPNSSettings = {
  network: 'kovan',
  contractAddress: '0xb3971BCef2D791bc4027BbfedFb47319A4AAaaAa',
  contractABI: '',
}

//     core https://etherscan.io/address/0x66329Fdd4042928BfCAB60b179e1538D56eeeeeE#code
// comm https://etherscan.io/address/0xb3971BCef2D791bc4027BbfedFb47319A4AAaaAa#code

export const sendEPNSNotification = async (
  destination_addresses: string[],
  title: string,
  message: string
) => {
  const sdk = new epnsHelper(
    'kovan',
    '',
    '',
    networkSettings,
    epnsCoreSettings,
    epnsCommSettings
  )
  for (const address of destination_addresses) {
    await sdk.sendNotification(
      address,
      title,
      message,
      title,
      message,
      0,
      undefined,
      undefined,
      false
    )
  }
}
