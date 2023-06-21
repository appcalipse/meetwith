import UAuthSPA from '@uauth/js'
import { UAuthWagmiConnector } from '@uauth/wagmi'
import { signMessage } from '@wagmi/core'
import WalletConnectProvider from '@walletconnect/web3-provider'
import {
  ConnectKitButton,
  ConnectKitProvider,
  getDefaultConfig,
} from 'connectkit'
import {
  goerli,
  harmonyOne,
  mainnet,
  metis,
  metisGoerli,
  polygon,
  polygonMumbai,
} from 'viem/chains'
import {
  configureChains,
  createConfig,
  useDisconnect,
  useSignMessage,
  WagmiConfigProps,
} from 'wagmi'
import { infuraProvider } from 'wagmi/providers/infura'
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc'

import { Account } from '../types/Account'
import { supportedChains } from '../types/chains'
import {
  ParticipantBaseInfo,
  ParticipantInfo,
  ParticipantType,
} from '../types/ParticipantInfo'
import { getAccount, login, signup } from './api_helper'
import { DEFAULT_MESSAGE } from './constants'
import { AccountNotFoundError } from './errors'
import { resolveExtraInfo } from './rpc_helper_front'
import { getSignature, saveSignature } from './storage'
import { isValidEVMAddress } from './validations'

// Add your custom chains to the list of wagmi configured chains
const { publicClient, chains } = configureChains(
  [mainnet, polygon, polygonMumbai, goerli],
  [
    infuraProvider({ apiKey: process.env.NEXT_PUBLIC_INFURA_RPC_PROJECT_ID! }),
    // ,
    // jsonRpcProvider({
    //   rpc: chain => {
    //     return {
    //       http:
    //         supportedChains.filter(_chain => _chain.id === chain.id)[0]
    //           ?.rpcUrl || '',
    //     }
    //   },
    // }),
  ]
)

export const wagmiConfig = createConfig(
  getDefaultConfig({
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
    appName: 'Meet with Wallet',
    appDescription: 'Your App Description',
    appUrl: 'https://meetwithwallet.xyz',
    chains,
    publicClient,
  })
)

const uauthClient = new UAuthSPA({
  clientID: process.env.NEXT_PUBLIC_UD_CLIENT_ID!,
  redirectUri: typeof window === 'undefined' ? '' : window.location.origin,
  scope: 'openid wallet',
})

// const uauthConnector = new UAuthWagmiConnector({
//   chains,
//   options: {
//     uauth: uauthClient,
//     metaMaskConnector,
//     walletConnectConnector,
//   },
// });

// const wagmiClient = createClient({
//   autoConnect: true,
//   connectors: [uauthConnector, metaMaskConnector, walletConnectConnector],
//   provider,
// });

// 'custom-uauth': {
//   display: UAuthWeb3Modal.display,
//   connector: UAuthWeb3Modal.connector,
//   package: UAuthSPA,
//   options: uauthOptions,
// },
// }

let connectedProvider: any

export const loginWithAddress = async (
  address: string,
  setLoginIn: (loginIn: boolean) => void
) => {
  setLoginIn(true)
  try {
    const account = await loginOrSignup(
      address,
      Intl.DateTimeFormat().resolvedOptions().timeZone
    )
    return account
  } catch (err) {
    console.error(err)
    return undefined
  } finally {
    setLoginIn(false)
  }
}

const signDefaultMessage = async (
  accountAddress: string,
  nonce: number
): Promise<string> => {
  const signature = await signMessage({
    message: DEFAULT_MESSAGE(nonce),
  })

  saveSignature(accountAddress, signature)
  return signature
}

const loginOrSignup = async (
  accountAddress: string,
  timezone: string
): Promise<Account> => {
  let account: Account
  const generateSignature = async () => {
    const nonce = Number(Math.random().toString(8).substring(2, 10))
    const signature = await signDefaultMessage(
      accountAddress.toLowerCase(),
      nonce
    )
    return { signature, nonce }
  }

  let signedUp = false

  try {
    // preload account data
    account = await getAccount(accountAddress.toLowerCase())

    if (account.is_invited) {
      const { signature, nonce } = await generateSignature()

      account = await signup(
        accountAddress.toLowerCase(),
        signature,
        timezone,
        nonce
      )
    }
  } catch (e) {
    if (e instanceof AccountNotFoundError) {
      const { signature, nonce } = await generateSignature()
      account = await signup(
        accountAddress.toLowerCase(),
        signature,
        timezone,
        nonce
      )
      signedUp = true
    } else {
      throw e
    }
  }

  const signature = getSignature(account.address)
  const extraInfo = await resolveExtraInfo(account.address)

  if (!signature) {
    await signDefaultMessage(account.address, account.nonce)
  }

  if (!signedUp) {
    // now that we have the signature, we need to check login agains the user signature
    // and only then generate the session
    account = await login(accountAddress.toLowerCase())
  }

  return { ...account, ...extraInfo }
}

const getAccountDisplayName = (account: Account): string => {
  return account.preferences?.name || ellipsizeAddress(account.address)
}

const getAddressDisplayForInput = (input: string) => {
  if (isValidEVMAddress(input)) {
    return ellipsizeAddress(input)
  }
  return input
}

const ellipsizeAddress = (address: string) =>
  `${address?.substring(0, 5)}...${address?.substring(address.length - 5)}`

const getParticipantDisplay = (
  participant: ParticipantInfo,
  noScheduler: boolean,
  currentAccountAddress?: string
): string => {
  let display: string

  if (
    participant.account_address?.toLowerCase() ===
    currentAccountAddress?.toLowerCase()
  ) {
    display = 'You'
  } else if (participant.guest_email) {
    if (participant.name) {
      display = `${participant.name} - ${participant.guest_email}`
    } else {
      display = `${participant.guest_email}`
    }
  } else {
    display = participant.name || ellipsizeAddress(participant.account_address!)
  }

  if (
    participant.type === ParticipantType.Scheduler ||
    (!!noScheduler && participant.type === ParticipantType.Owner)
  ) {
    display = `${display} (Scheduler)`
  }

  return display
}

export const getParticipantBaseInfoFromAccount = (
  account: Account
): ParticipantBaseInfo => {
  return {
    account_address: account.address,
    name: getAccountDisplayName(account),
  }
}

const getAllParticipantsDisplayName = (
  participants: ParticipantInfo[],
  currentAccountAddress?: string
): string => {
  let displayNames = []
  const noScheduler =
    !participants.some(
      participant => participant.type === ParticipantType.Scheduler
    ) && participants.length > 1 //avoid case when guest is scheduling
  for (const participant of participants) {
    displayNames.push(
      getParticipantDisplay(participant, noScheduler, currentAccountAddress)
    )
  }

  displayNames = displayNames.sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  )
  const youIndex = displayNames.findIndex(name => name.includes('You'))
  const element = displayNames.splice(youIndex, 1)[0]
  displayNames.splice(0, 0, element)
  return displayNames.join(', ')
}

export {
  connectedProvider,
  ellipsizeAddress,
  getAccountDisplayName,
  getAddressDisplayForInput,
  getAllParticipantsDisplayName,
  getParticipantDisplay,
  loginOrSignup,
  signDefaultMessage,
}
