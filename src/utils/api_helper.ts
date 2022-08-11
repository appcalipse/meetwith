import * as Sentry from '@sentry/browser'

import { ConditionRelation } from '@/types/common'
import { GateConditionObject } from '@/types/TokenGating'

import { Account, MeetingType, SimpleAccountInfo } from '../types/Account'
import {
  AccountNotifications,
  DiscordNotificationType,
} from '../types/AccountNotifications'
import {
  ConnectedCalendarCore,
  ConnectedCalendarCorePayload,
  ConnectResponse,
} from '../types/CalendarConnections'
import {
  DBSlot,
  DBSlotEnhanced,
  GroupMeetingRequest,
  TimeSlotSource,
  VideoMeeting,
} from '../types/Meeting'
import { Subscription } from '../types/Subscription'
import { apiUrl } from './constants'
import {
  AccountNotFoundError,
  ApiFetchError,
  GateConditionNotValidError,
  GateInUseError,
  Huddle01ServiceUnavailable,
  InvalidSessionError,
  MeetingCreationError,
  TimeNotAvailableError,
} from './errors'
import { POAP, POAPEvent } from './services/poap.helper'
import { getSignature } from './storage'
import { safeConvertConditionFromAPI } from './token.gate.service'

export const internalFetch = async (
  path: string,
  method = 'GET',
  body?: any,
  options = {}
): Promise<object> => {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    ...options,
    body: (body && JSON.stringify(body)) || null,
  })
  if (response.status >= 200 && response.status < 300) {
    return await response.json()
  }

  throw new ApiFetchError(response.status, response.statusText)
}

export const getAccount = async (identifier: string): Promise<Account> => {
  try {
    return (await internalFetch(`/accounts/${identifier}`)) as Account
  } catch (e: any) {
    if (e.status && e.status === 404) {
      throw new AccountNotFoundError(identifier)
    }
    throw e
  }
}

export const getExistingAccounts = async (
  addresses: string[]
): Promise<SimpleAccountInfo[]> => {
  try {
    return (await internalFetch(`/accounts/simple`, 'POST', {
      addresses,
    })) as SimpleAccountInfo[]
  } catch (e: any) {
    throw e
  }
}

export const saveAccountChanges = async (
  account: Account
): Promise<Account> => {
  return (await internalFetch(`/secure/accounts`, 'POST', account)) as Account
}

export const scheduleMeeting = async (
  meeting: any
): Promise<DBSlotEnhanced> => {
  try {
    return (await internalFetch(
      `/secure/meetings`,
      'POST',
      meeting
    )) as DBSlotEnhanced
  } catch (e: any) {
    if (e.status && e.status === 409) {
      throw new TimeNotAvailableError()
    } else if (e.status && e.status === 412) {
      throw new MeetingCreationError()
    } else if (e.status && e.status === 403) {
      throw new GateConditionNotValidError()
    }
    throw e
  }
}

export const scheduleMeetingAsGuest = async (
  meeting: any
): Promise<DBSlotEnhanced> => {
  try {
    return (await internalFetch(
      `/meetings/guest`,
      'POST',
      meeting
    )) as DBSlotEnhanced
  } catch (e: any) {
    if (e.status && e.status === 409) {
      throw new TimeNotAvailableError()
    } else if (e.status && e.status === 412) {
      throw new MeetingCreationError()
    } else if (e.status && e.status === 403) {
      throw new GateConditionNotValidError()
    }
    throw e
  }
}

export const isSlotFreeApiCall = async (
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

export const getBusySlots = async (
  accountIdentifier: string,
  start?: Date,
  end?: Date,
  limit?: number,
  offset?: number
): Promise<Interval[]> => {
  const response = (await internalFetch(
    `/meetings/busy/${accountIdentifier}?limit=${limit || undefined}&offset=${
      offset || 0
    }&start=${start?.getTime() || undefined}&end=${end?.getTime() || undefined}`
  )) as Interval[]
  return response.map(slot => ({
    ...slot,
    start: new Date(slot.start),
    end: new Date(slot.end),
  }))
}

export const fetchBusySlotsForMultipleAccounts = async (
  addresses: string[],
  start: Date,
  end: Date,
  relation: ConditionRelation,
  limit?: number,
  offset?: number
): Promise<Interval[]> => {
  const response = (await internalFetch(`/meetings/busy/team`, 'POST', {
    addresses,
    start,
    end,
    relation,
    limit,
    offset,
  })) as Interval[]

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
    return await (await fetch(`https://mww.infura-ipfs.io/ipfs/${hash}`)).json()
  } catch (err) {
    Sentry.captureException(err)
    return undefined
  }
}

export const getGoogleAuthConnectUrl = async (): Promise<ConnectResponse> => {
  return (await internalFetch(
    `/secure/calendar_integrations/google/connect`
  )) as ConnectResponse
}

export const getOffice365ConnectUrl = async (): Promise<ConnectResponse> => {
  return (await internalFetch(
    `/secure/calendar_integrations/office365/connect`
  )) as ConnectResponse
}

export const addOrUpdateICloud = async (details: any): Promise<any> => {
  return (await internalFetch(`/secure/calendar_integrations/icloud`, 'POST', {
    ...details,
  })) as any
}

export const addOrUpdateWebdav = async (details: any): Promise<any> => {
  return (await internalFetch(`/secure/calendar_integrations/webdav`, 'POST', {
    ...details,
  })) as any
}

export const login = async (accountAddress: string): Promise<Account> => {
  try {
    const signature = getSignature(accountAddress) || ''
    return (await internalFetch(`/auth/login`, 'POST', {
      identifier: accountAddress,
      signature,
    })) as Account
  } catch (e: any) {
    if (e.status && e.status === 404) {
      throw new AccountNotFoundError(accountAddress)
    } else if (e.status && e.status === 401) {
      throw new InvalidSessionError()
    }
    throw e
  }
}

export const signup = async (
  address: string,
  signature: string,
  timezone: string,
  nonce: number
): Promise<Account> => {
  return (await internalFetch(`/auth/signup`, 'POST', {
    address,
    signature,
    timezone,
    nonce,
  })) as Account
}

export const listConnectedCalendars = async (
  syncOnly?: boolean
): Promise<ConnectedCalendarCore[]> => {
  return (await internalFetch(
    `/secure/calendar_integrations?syncOnly=${syncOnly ? 'true' : 'false'}`
  )) as ConnectedCalendarCore[]
}

export const deleteConnectedCalendar = async (
  email: string,
  provider: TimeSlotSource
): Promise<ConnectedCalendarCore[]> => {
  return (await internalFetch(`/secure/calendar_integrations`, 'DELETE', {
    email,
    provider,
  })) as ConnectedCalendarCore[]
}

export const updateConnectedCalendarSync = async (
  email: string,
  provider: TimeSlotSource,
  sync: boolean
): Promise<ConnectedCalendarCore[]> => {
  return (await internalFetch(`/secure/calendar_integrations`, 'PUT', {
    email,
    provider,
    sync,
  })) as ConnectedCalendarCore[]
}

export const updateConnectedCalendarPayload = async (
  email: string,
  provider: TimeSlotSource,
  payload: ConnectedCalendarCorePayload['payload']
): Promise<ConnectedCalendarCore[]> => {
  return (await internalFetch(`/secure/calendar_integrations`, 'PUT', {
    email,
    provider,
    payload,
  })) as ConnectedCalendarCore[]
}

export const syncSubscriptions = async (): Promise<Subscription[]> => {
  return (await internalFetch(`/secure/subscriptions/sync`)) as Subscription[]
}

export const getSubscriptionForDomain = async (
  domain: string
): Promise<Subscription | undefined> => {
  return (await internalFetch(
    `/secure/subscriptions/check/${domain}`
  )) as Subscription
}

export const validateWebdav = async (
  url: string,
  username: string,
  password: string
): Promise<any> => {
  return fetch(`${apiUrl}/secure/calendar_integrations/webdav`, {
    method: 'PROPFIND',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      url,
      username,
      password,
    }),
  })
    .then(res => res.status >= 200 && res.status < 300)
    .catch(() => false)
}

export const generateDiscordNotification = async (
  discordCode: string
): Promise<DiscordNotificationType> => {
  return (await internalFetch(`/secure/discord`, 'POST', {
    discordCode,
  })) as DiscordNotificationType
}

export const getGateCondition = async (
  id: string
): Promise<GateConditionObject | null> => {
  const result = (await internalFetch(
    `/gate/${id}`
  )) as GateConditionObject | null
  if (result) {
    result.definition = safeConvertConditionFromAPI(result.definition)
  }
  return result
}

export const getGateConditionsForAccount = async (
  accountAddress: string
): Promise<GateConditionObject[]> => {
  const result = (await internalFetch(
    `/gate/account/${accountAddress}`
  )) as GateConditionObject[]

  return result.map(gateCondition => {
    return {
      ...gateCondition,
      definition: safeConvertConditionFromAPI(gateCondition.definition),
    }
  })
}

export const saveGateCondition = async (
  gateCondition: GateConditionObject
): Promise<GateConditionObject> => {
  return (await internalFetch(`/secure/gate`, 'POST', {
    gateCondition,
  })) as GateConditionObject
}

export const deleteGateCondition = async (id: string): Promise<boolean> => {
  try {
    return (
      (await internalFetch(`/secure/gate`, 'DELETE', {
        id,
      })) as any
    ).result as boolean
  } catch (e) {
    if (e instanceof ApiFetchError) {
      if (e.status === 409) {
        throw new GateInUseError()
      }
    }
    throw e
  }
}

export const getWalletPOAPs = async (
  accountAddress: string
): Promise<POAP[]> => {
  const result = (await internalFetch(
    `/integrations/poap/${accountAddress}`
  )) as POAP[]

  return result
}

export const getWalletPOAP = async (
  accountAddress: string,
  eventId: number
): Promise<POAP | null> => {
  const result = (await internalFetch(
    `/integrations/poap/${accountAddress}?eventId=${eventId}`
  )) as POAP[]

  if (result.length > 0) {
    return result[0] as POAP
  }
  return null
}

export const getPOAPEvent = async (
  eventId: number
): Promise<POAPEvent | null> => {
  const event = (await internalFetch(
    `/integrations/poap/event/${eventId}`
  )) as POAPEvent
  if (!event.id) {
    return null
  }
  return event
}

export const getTeamMeetingRequest = async (
  id: string
): Promise<GroupMeetingRequest | null> => {
  try {
    return (await internalFetch(`/groupSchedule/${id}`)) as GroupMeetingRequest
  } catch (e) {
    if (e instanceof ApiFetchError) {
      if (e.status === 404) {
        return null
      }
    }
    throw e
  }
}

export const createHuddleRoom = async (
  title?: string
): Promise<VideoMeeting> => {
  try {
    return (await internalFetch('/integrations/huddle/createroom', 'POST', {
      title,
    })) as VideoMeeting
  } catch (e) {
    if (e instanceof ApiFetchError) {
      if (e.status === 503) {
        throw new Huddle01ServiceUnavailable()
      }
    }
    throw e
  }
}

export const joinHuddleRoom = async (
  name: string,
  roomId: string
): Promise<string> => {
  try {
    const response = await internalFetch('/integrations/huddle/join', 'POST', {
      name,
      roomId,
    })
    return (response as any).joinUrl as string
  } catch (e) {
    if (e instanceof ApiFetchError) {
      if (e.status === 503) {
        throw new Huddle01ServiceUnavailable()
      }
    }
    throw e
  }
}
export const getUnstoppableDomainsForAddress = async (
  address: string
): Promise<{ name: string }[]> => {
  try {
    return (await internalFetch(
      `/integrations/unstoppable?address=${address}`
    )) as { name: string }[]
  } catch (e) {
    if (e instanceof ApiFetchError) {
      if (e.status === 404) {
        return []
      }
    }
    throw e
  }
}
