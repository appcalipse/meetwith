import WalletConnectProvider from '@walletconnect/web3-provider'
import Web3 from 'web3'
import Web3Modal from 'web3modal'

import { Account } from '../types/Account'
import { supportedChains } from '../types/chains'
import { ParticipantInfo, ParticipantType } from '../types/Meeting'
import { getAccount, login, signup } from './api_helper'
import { DEFAULT_MESSAGE } from './constants'
import { AccountNotFoundError } from './errors'
import { resolveExtraInfo } from './rpc_helper_front'
import { getSignature, saveSignature } from './storage'
import { getActiveProSubscription } from './subscription_manager'
import { isValidEVMAddress } from './validations'

const providerOptions = {
  walletconnect: {
    package: WalletConnectProvider, // required
    options: {
      infuraId: process.env.NEXT_PUBLIC_INFURA_RPC_PROJECT_ID,
      rpc: supportedChains.reduce(
        (obj, item) => Object.assign(obj, { [item.id]: item.rpcUrl }),
        {}
      ),
    },
  },
}

let web3: Web3
let connectedProvider: any

const loginWithWallet = async (
  setLoginIn: (loginIn: boolean) => void
): Promise<Account | undefined> => {
  const web3Modal = new Web3Modal({
    cacheProvider: true, // optional
    providerOptions, // required
  })

  try {
    connectedProvider = await web3Modal.connect()
    web3 = new Web3(connectedProvider)
    setLoginIn(true)

    const accounts = await web3.eth.getAccounts()

    const account = await loginOrSignup(
      accounts[0].toLowerCase(),
      Intl.DateTimeFormat().resolvedOptions().timeZone
    )
    return account
  } catch (err) {
    return undefined
  } finally {
    setLoginIn(false)
  }
}

const signDefaultMessage = async (
  accountAddress: string,
  nonce: number
): Promise<string> => {
  const signature = await web3.eth.personal.sign(
    DEFAULT_MESSAGE(nonce),
    accountAddress,
    'meetwithwallet.xyz'
  )
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
  // }

  // return (
  //   getActiveProSubscription(account)?.domain ||
  //   ellipsizeAddress(account.address)
  // )
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

  if (participant.account_address === currentAccountAddress) {
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

const getAllParticipantsDisplayName = (
  participants: ParticipantInfo[],
  currentAccountAddress?: string
): string => {
  let displayNames = []
  const noScheduler = !participants.some(
    participant => participant.type === ParticipantType.Scheduler
  )
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
  loginWithWallet,
  signDefaultMessage,
  web3,
}
