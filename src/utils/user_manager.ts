import { Wallet } from 'thirdweb/wallets'

import { Account } from '../types/Account'
import {
  ParticipantBaseInfo,
  ParticipantInfo,
  ParticipantType,
} from '../types/ParticipantInfo'
import { getAccount, login, signup } from './api_helper'
import { DEFAULT_MESSAGE } from './constants'
import { AccountNotFoundError } from './errors'
import QueryKeys from './query_keys'
import { queryClient } from './react_query'
import { resolveExtraInfo } from './rpc_helper_front'
import { getSignature, saveSignature } from './storage'
import { isValidEVMAddress } from './validations'

export const loginWithAddress = async (
  wallet: Wallet,
  setLoginIn: (loginIn: boolean) => void
): Promise<Account | undefined> => {
  setLoginIn(true)
  try {
    const account = await queryClient.fetchQuery(
      QueryKeys.account(wallet.getAccount()!.address.toLowerCase()),
      () =>
        loginOrSignup(
          wallet,
          Intl.DateTimeFormat().resolvedOptions().timeZone
        ) ?? null
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
  wallet: Wallet,
  nonce: number
): Promise<string> => {
  const signature = await wallet.getAccount()?.signMessage({
    message: DEFAULT_MESSAGE(nonce),
  })

  saveSignature(wallet.getAccount()!.address, signature!.toString())
  return signature!.toString()
}

const loginOrSignup = async (
  wallet: Wallet,
  timezone: string
): Promise<Account> => {
  let account: Account

  await new Promise(resolve => setTimeout(resolve, 3000))

  const generateSignature = async () => {
    const nonce = Number(Math.random().toString(8).substring(2, 10))

    const signature = await signDefaultMessage(wallet, nonce)
    return { signature, nonce }
  }

  let signedUp = false

  try {
    // preload account data
    account = await getAccount(wallet.getAccount()!.address.toLowerCase())

    if (account.is_invited) {
      const { signature, nonce } = await generateSignature()

      account = await signup(
        wallet.getAccount()!.address.toLowerCase(),
        signature,
        timezone,
        nonce
      )
    }
  } catch (e) {
    if (e instanceof AccountNotFoundError) {
      const { signature, nonce } = await generateSignature()
      account = await signup(
        wallet.getAccount()!.address.toLowerCase(),
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
    await signDefaultMessage(wallet, account.nonce)
  }

  if (!signedUp) {
    // now that we have the signature, we need to check login against the user signature
    // and only then generate the session
    account = await login(wallet.getAccount()!.address.toLowerCase())
  }

  return {
    ...account,
    preferences: { ...account.preferences, ...extraInfo },
    signedUp,
  }
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
  ellipsizeAddress,
  getAccountDisplayName,
  getAddressDisplayForInput,
  getAllParticipantsDisplayName,
  getParticipantDisplay,
  loginOrSignup,
  signDefaultMessage,
}
