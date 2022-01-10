import { Account, MeetingType } from '../types/Account'
import {
  AccountNotifications,
} from '../types/AccountNotifications'
import { DBSlot, DBSlotEnhanced } from '../types/Meeting'
import { apiUrl } from './constants'
import { AccountNotFoundError, ApiFetchError } from './errors'
import { getCurrentAccount, getSignature } from './storage'
import * as Sentry from '@sentry/browser'

export const internalFetch = async (
  path: string,
  method = 'GET',
  body?: any,
  options = {}
): Promise<object> => {
  const account = getCurrentAccount()
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      account: account,
      signature: getSignature(account) || '',
    },
    ...options,
    body: (body && JSON.stringify(body)) || null,
  })
  if (response.status === 200) {
    return await response.json()
  }

  throw new ApiFetchError(response.status, response.statusText)
}

export const getAccount = async (identifer: string): Promise<Account> => {
  try {
    return (await internalFetch(`/accounts/${identifer}`)) as Account
  } catch (e) {
    if (e instanceof TypeError) {
      throw e
    }
    throw new AccountNotFoundError('User not found')
  }
}

export const createAccount = async (
  address: string,
  signature: string,
  timezone: string,
  nonce: number
): Promise<Account> => {
  return (await internalFetch(`/accounts`, 'POST', {
    address,
    signature,
    timezone,
    nonce,
  })) as Account
}

export const saveAccountChanges = async (
  account: Account
): Promise<Account> => {
  return (await internalFetch(`/secure/accounts`, 'POST', account)) as Account
}

export const createMeeting = async (meeting: any): Promise<DBSlotEnhanced> => {
  return (await internalFetch(
    `/secure/meetings`,
    'POST',
    meeting
  )) as DBSlotEnhanced
}

export const isSlotFree = async (
  account_id: string,
  start: Date,
  end: Date,
  meetingTypeId?: string
): Promise<{ isFree: boolean }> => {
  try {
    return (await internalFetch(
      `/meetings/slot/${account_id}?start=${start.getTime()}&end=${end.getTime()}&meetingTypeId=${meetingTypeId}`
    )) as { isFree: boolean }
  } catch (e) {
    return { isFree: false }
  }
}

export const saveMeetingType = async (type: MeetingType): Promise<Account> => {
  return (await internalFetch(`/secure/meetings/type`, 'POST', type)) as Account
}

export const getMeetings = async (
  accountIdentifier: string,
  start?: Date,
  end?: Date,
  limit?: number,
  offset?: number
): Promise<DBSlot[]> => {
  const response = (await internalFetch(
    `/meetings/${accountIdentifier}?limit=${limit || undefined}&offset=${
      offset || 0
    }&start=${start?.getTime() || undefined}&end=${end?.getTime() || undefined}`
  )) as DBSlot[]
  return response.map(slot => ({
    ...slot,
    start: new Date(slot.start),
    end: new Date(slot.end),
  }))
}

export const getMeetingsForDashboard = async (
  accountIdentifier: string,
  end: Date,
  limit: number,
  offset: number
): Promise<DBSlot[]> => {
  const response = (await internalFetch(
    `/meetings/${accountIdentifier}?upcoming=true&limit=${
      limit || undefined
    }&offset=${offset || 0}&end=${end.getTime()}`
  )) as DBSlot[]
  return response.map(slot => ({
    ...slot,
    start: new Date(slot.start),
    end: new Date(slot.end),
    created_at: slot.created_at ? new Date(slot.created_at) : undefined,
  }))
}

export const subscribeToWaitlist = async (
  email: string,
  plan?: string
): Promise<boolean> => {
  const result = await internalFetch(`/subscribe`, 'POST', { email, plan })
  return (result as any).success
}

export const getMeeting = async (slot_id: string): Promise<DBSlotEnhanced> => {
  return (await internalFetch(`/meetings/meeting/${slot_id}`)) as DBSlotEnhanced
}

export const getNotificationSubscriptions =
  async (): Promise<AccountNotifications> => {
    return (await internalFetch(
      `/secure/notifications`
    )) as AccountNotifications
  }

export const setNotificationSubscriptions = async (
  notifications: AccountNotifications
): Promise<AccountNotifications> => {
  return (await internalFetch(
    `/secure/notifications`,
    'POST',
    notifications
  )) as AccountNotifications
}

export const fetchContentFromIPFSFromBrowser = async (
  hash: string
): Promise<object | undefined> => {
  try {
    return await (await fetch(`https://ipfs.infura.io/ipfs/${hash}`)).json()
  } catch (err) {
    Sentry.captureException(err)
    return undefined
  }
}
