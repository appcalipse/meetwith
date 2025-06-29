import { createThirdwebClient } from 'thirdweb'
import { Wallet } from 'thirdweb/wallets'

import { GroupInvitesResponse } from '@/types/Group'

import { Account } from '../types/Account'
import {
  InvitedUser,
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
export const thirdWebClient = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_ID!,
  config: {
    storage: {
      gatewayUrl: 'https://mww.infura-ipfs.io',
    },
  },
})

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

  const generateSignature = async () => {
    const nonce = Number(Math.random().toString(8).substring(2, 10))

    const signature = await signDefaultMessage(wallet, nonce)
    return { signature, nonce }
  }

  let signedUp = false
  const walletAccount = wallet.getAccount()
  if (!walletAccount) {
    throw new Error('Account not found')
  }
  const address = walletAccount.address.toLowerCase()
  try {
    // preload account data
    account = await getAccount(address)

    if (account.is_invited) {
      const { signature, nonce } = await generateSignature()

      account = await signup(address, signature, timezone, nonce)
    }
  } catch (e) {
    if (e instanceof AccountNotFoundError) {
      const { signature, nonce } = await generateSignature()
      account = await signup(address, signature, timezone, nonce)
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

export const getInvitedUserDisplayName = (invitedUser: InvitedUser): string => {
  if (invitedUser.name) {
    return invitedUser.name
  } else if (invitedUser.guest_email) {
    return invitedUser.guest_email
  } else {
    return ellipsizeAddress(invitedUser.account_address)
  }
}

const getAddressDisplayForInput = (input: string) => {
  if (isValidEVMAddress(input)) {
    return ellipsizeAddress(input)
  }
  return input
}

const ellipsizeAddress = (address?: string) =>
  `${address?.substring(0, 5)}...${address?.substring(address.length - 5)}`

const getParticipantDisplay = (
  participant: ParticipantInfo,
  noScheduler: boolean,
  currentAccountAddress?: string
): string => {
  let display: string

  if (
    participant.account_address?.toLowerCase() ===
      currentAccountAddress?.toLowerCase() &&
    participant.account_address
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
  currentAccountAddress?: string,
  canSeeGuestList = true
): string => {
  let displayNames: string[] = []
  const noScheduler =
    !participants.some(
      participant => participant.type === ParticipantType.Scheduler
    ) && participants.length > 1 // avoid case when guest is scheduling

  for (const participant of participants) {
    displayNames.push(
      getParticipantDisplay(participant, noScheduler, currentAccountAddress)
    )
  }

  displayNames = displayNames.sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  )

  // Move "You" to the front if present
  const youIndex = displayNames.findIndex(name => name === 'You')
  if (youIndex > 0) {
    const [youName] = displayNames.splice(youIndex, 1)
    displayNames.unshift(youName)
  }

  if (canSeeGuestList) {
    return displayNames.join(', ')
  } else {
    // Show "You" (if present) and the scheduler (if present and not "You")
    const you = displayNames.find(name => name === 'You')
    const scheduler = displayNames.find(
      name => name !== 'You' && name.includes('(Scheduler)')
    )

    // Count other participants (excluding "You" and scheduler)
    const othersCount = displayNames.filter(
      name => name !== 'You' && name !== scheduler
    ).length

    const result = []
    if (you) result.push(you)
    if (scheduler) result.push(scheduler)
    if (othersCount > 0) {
      result.push(
        `+ ${othersCount} other participant${
          othersCount > 1 ? 's' : ''
        } retracted`
      )
    }
    return result.join(', ')
  }
}

export const validateUserPermissions = (
  user: Account,
  params: {
    group_id?: string
    user_id?: string
    email?: string
    discord_id?: string
  },
  groupInvites: GroupInvitesResponse[]
) => {
  const { group_id, user_id, email, discord_id } = params

  if (user_id && user_id !== user.id) {
    return false
  }

  if (email) {
    const invite = groupInvites.find(invite => invite.email === email)
    if (!invite || invite.userId !== user.id) {
      return false
    }
  }

  if (discord_id) {
    const invite = groupInvites.find(invite => invite.discordId === discord_id)
    if (!invite || invite.userId !== user.id) {
      return false
    }
  }

  // Add additional checks for group_id if necessary
  // For example, you may want to check if the user is a member of the group

  return true
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
