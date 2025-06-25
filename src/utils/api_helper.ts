import * as Sentry from '@sentry/nextjs'
import { DAVCalendar } from 'tsdav'

import { Account, MeetingType, SimpleAccountInfo } from '@/types/Account'
import { AccountNotifications } from '@/types/AccountNotifications'
import {
  CalendarSyncInfo,
  ConnectedCalendar,
  ConnectedCalendarCore,
  ConnectResponse,
} from '@/types/CalendarConnections'
import { ConditionRelation, SuccessResponse } from '@/types/common'
import {
  Contact,
  ContactInvite,
  ContactSearch,
  DBContact,
  LeanContact,
} from '@/types/Contacts'
import { InviteType } from '@/types/Dashboard'
import { DiscordAccount } from '@/types/Discord'
import { DiscordUserInfo } from '@/types/DiscordUserInfo'
import {
  EmptyGroupsResponse,
  GetGroupsFullResponse,
  GetGroupsResponse,
  Group,
  GroupInvitePayload,
  GroupMember,
} from '@/types/Group'
import {
  ConferenceMeeting,
  DBSlot,
  GroupMeetingRequest,
  GuestMeetingCancel,
  MeetingDecrypted,
  MeetingInfo,
  TimeSlot,
  TimeSlotSource,
} from '@/types/Meeting'
import {
  ChangeGroupAdminRequest,
  MeetingCancelRequest,
  MeetingCreationRequest,
  MeetingUpdateRequest,
  UrlCreationRequest,
} from '@/types/Requests'
import { Coupon, Subscription } from '@/types/Subscription'
import { TelegramConnection } from '@/types/Telegram'
import { GateConditionObject } from '@/types/TokenGating'

import { apiUrl } from './constants'
import {
  AccountNotFoundError,
  ApiFetchError,
  CantInviteYourself,
  ContactAlreadyExists,
  ContactInviteAlreadySent,
  ContactInviteNotForAccount,
  ContactInviteNotFound,
  ContactNotFound,
  CouponAlreadyUsed,
  CouponExpired,
  CouponNotValid,
  GateConditionNotValidError,
  GateInUseError,
  GoogleServiceUnavailable,
  GroupCreationError,
  Huddle01ServiceUnavailable,
  InvalidSessionError,
  IsGroupAdminError,
  MeetingChangeConflictError,
  MeetingCreationError,
  MeetingNotFoundError,
  NoActiveSubscription,
  OwnInviteError,
  SubscriptionNotCustom,
  TimeNotAvailableError,
  UnauthorizedError,
  UrlCreationError,
  ZoomServiceUnavailable,
} from './errors'
import QueryKeys from './query_keys'
import { queryClient } from './react_query'
import { POAP, POAPEvent } from './services/poap.helper'
import { getSignature } from './storage'
import { safeConvertConditionFromAPI } from './token.gate.service'

export const internalFetch = async <T>(
  path: string,
  method = 'GET',
  body?: unknown,
  options = {},
  headers = {}
) => {
  try {
    const response = await fetch(`${apiUrl}${path}`, {
      method,
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        ...headers,
      },
      ...options,
      body: (!!body && (JSON.stringify(body) as string)) || null,
    })
    if (response.status >= 200 && response.status < 300) {
      return (await response.json()) as T
    }

    throw new ApiFetchError(response.status, await response.text())
  } catch (e: any) {
    // Exclude account not found error on sentry
    if (!path.includes('accounts') && e.status === 404) {
      Sentry.captureException(e)
    }
    throw e
  }
}

export const getAccount = async (identifier: string): Promise<Account> => {
  try {
    const account = await internalFetch(`/accounts/${identifier}`)
    if (!account) throw new AccountNotFoundError(identifier)
    return account as Account
  } catch (e: any) {
    if (e.status && e.status === 404) {
      throw new AccountNotFoundError(identifier)
    }
    throw e
  }
}

export const getOwnAccount = async (identifier: string): Promise<Account> => {
  try {
    const account = await internalFetch('/secure/accounts')
    return account as Account
  } catch (e: any) {
    if (e.status && e.status === 404) {
      throw new AccountNotFoundError(identifier)
    }
    throw e
  }
}

export const getAccountByDomain = async (
  domain: string
): Promise<Subscription | null> => {
  try {
    return (await internalFetch(
      `/accounts/subscriptions/check/${domain}`
    )) as Subscription
  } catch (e: any) {
    if (e.status && e.status === 404) {
      return null
    }
    throw e
  }
}

export const getExistingAccountsSimple = async (
  addresses: string[]
): Promise<SimpleAccountInfo[]> => {
  try {
    return (await internalFetch(`/accounts/existing`, 'POST', {
      addresses,
      fullInformation: false,
    })) as SimpleAccountInfo[]
  } catch (e: any) {
    throw e
  }
}

export const getExistingAccounts = async (
  addresses: string[],
  fullInformation = true
): Promise<Account[]> => {
  try {
    return (await internalFetch(`/accounts/existing`, 'POST', {
      addresses,
      fullInformation: true,
    })) as Account[]
  } catch (e: any) {
    throw e
  }
}

export const saveAccountChanges = async (
  account: Account
): Promise<Account> => {
  const response = (await internalFetch(
    `/secure/accounts`,
    'POST',
    account
  )) as Account
  await queryClient.invalidateQueries(
    QueryKeys.account(account.address?.toLowerCase())
  )
  return response
}

export const scheduleMeetingFromServer = async (
  scheduler_address: string,
  meeting: MeetingCreationRequest
): Promise<DBSlot> => {
  try {
    return (await internalFetch(
      `/server/meetings`,
      'POST',
      { scheduler_address, ...meeting },
      {},
      {
        'X-Server-Secret': process.env.SERVER_SECRET!,
      }
    )) as DBSlot
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

export const getFullAccountInfo = async (
  identifier: string
): Promise<Account> => {
  try {
    return (await internalFetch(
      `/server/accounts/${identifier}`,
      'GET',
      null,
      {},
      {
        'X-Server-Secret': process.env.SERVER_SECRET!,
      }
    )) as Account
  } catch (e: any) {
    if (e.status && e.status === 404) {
      throw new AccountNotFoundError(identifier)
    }
    throw e
  }
}

export const scheduleMeeting = async (
  meeting: MeetingCreationRequest
): Promise<DBSlot> => {
  try {
    return (await internalFetch(`/secure/meetings`, 'POST', meeting)) as DBSlot
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
  meeting: MeetingCreationRequest
): Promise<DBSlot> => {
  try {
    return (await internalFetch(`/meetings/guest`, 'POST', meeting)) as DBSlot
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

export const updateMeeting = async (
  slotId: string,
  meeting: MeetingUpdateRequest
): Promise<DBSlot> => {
  try {
    return (await internalFetch(
      `/secure/meetings/${slotId}`,
      'POST',
      meeting
    )) as DBSlot
  } catch (e: any) {
    if (e.status && e.status === 409) {
      throw new TimeNotAvailableError()
    } else if (e.status && e.status === 412) {
      throw new MeetingCreationError()
    } else if (e.status && e.status === 417) {
      throw new MeetingChangeConflictError()
    }
    throw e
  }
}

export const cancelMeeting = async (
  meeting: MeetingDecrypted,
  currentTimezone: string
): Promise<{ removed: string[] }> => {
  const body: MeetingCancelRequest = {
    meeting,
    currentTimezone,
  }
  try {
    return (await internalFetch(
      `/secure/meetings/${meeting.id}`,
      'DELETE',
      body
    )) as { removed: string[] }
  } catch (e: any) {
    if (e.status && e.status === 409) {
      throw new TimeNotAvailableError()
    } else if (e.status && e.status === 412) {
      throw new MeetingCreationError()
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

export const removeMeetingType = async (typeId: string): Promise<Account> => {
  return (await internalFetch(`/secure/meetings/type`, 'DELETE', {
    typeId,
  })) as Account
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
  const response = await queryClient.fetchQuery(
    QueryKeys.busySlots({
      id: accountIdentifier?.toLowerCase(),
      start,
      end,
      limit,
      offset,
    }),
    () =>
      internalFetch(
        `/meetings/busy/${accountIdentifier}?limit=${
          limit || undefined
        }&offset=${offset || 0}&start=${start?.getTime() || undefined}&end=${
          end?.getTime() || undefined
        }`
      ) as Promise<Interval[]>
  )
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
export const fetchBusySlotsRawForMultipleAccounts = async (
  addresses: string[],
  start: Date,
  end: Date,
  limit?: number,
  offset?: number
): Promise<TimeSlot[]> => {
  const response = (await internalFetch(`/meetings/busy/team`, 'POST', {
    addresses,
    start,
    end,
    limit,
    offset,
    isRaw: true,
  })) as TimeSlot[]

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
  return response?.map(slot => ({
    ...slot,
    start: new Date(slot.start),
    end: new Date(slot.end),
    created_at: slot.created_at ? new Date(slot.created_at) : undefined,
  }))
}
export const syncMeeting = async (
  decryptedMeetingData: MeetingInfo
): Promise<void> => {
  try {
    await internalFetch(`/secure/meetings/sync`, 'PATCH', {
      decryptedMeetingData,
    })
  } catch (e) {}
}
export const getGroups = async (
  limit?: number,
  offset?: number
): Promise<Array<GetGroupsResponse>> => {
  const response = await internalFetch<Array<GetGroupsResponse>>(
    `/secure/group/user?limit=${limit}&offset=${offset}`
  )
  return response
}
export const getGroupsFull = async (
  limit?: number,
  offset?: number
): Promise<Array<GetGroupsFullResponse>> => {
  const response = await internalFetch<Array<GetGroupsFullResponse>>(
    `/secure/group/full?limit=${limit}&offset=${offset}`
  )
  return response
}
export const getGroupsEmpty = async (): Promise<Array<EmptyGroupsResponse>> => {
  const response = (await internalFetch(
    `/secure/group/empty`
  )) as Array<GetGroupsResponse>
  return response
}

export const getGroupsInvites = async (address: string) => {
  const response = await internalFetch<Array<EmptyGroupsResponse>>(
    `/secure/group/user/${address}`
  )
  return response
}

export const getGroupsMembers = async (
  group_id: string,
  limit?: number,
  offset?: number
): Promise<Array<GroupMember>> => {
  const response = await internalFetch<Array<GroupMember>>(
    `/secure/group/${group_id}/users?limit=${limit}&offset=${offset}`
  )
  return response || []
}
export const updateGroupRole = async (
  group_id: string,
  data: ChangeGroupAdminRequest
) => {
  const response = await internalFetch<SuccessResponse>(
    `/secure/group/${group_id}/admin`,
    'PATCH',
    data
  )
  return !!response?.success
}

export const joinGroup = async (
  group_id: string,
  email_address?: string,
  type?: InviteType
) => {
  const response = await internalFetch<{ success: true }>(
    `/secure/group/${group_id}/join?type=${type || InviteType.PRIVATE}${
      email_address ? `&email_address=${email_address}` : ''
    }`,
    'POST'
  )
  return response?.success
}

export const rejectGroup = async (group_id: string, email_address?: string) => {
  const response = await internalFetch<{ success: true }>(
    `/secure/group/${group_id}/reject${
      email_address ? `?email_address=${email_address}` : ''
    }`,
    'POST'
  )
  return response?.success
}

export const leaveGroup = async (group_id: string) => {
  try {
    const response = await internalFetch<{ success: true }>(
      `/secure/group/${group_id}/leave`,
      'POST'
    )
    return response?.success
  } catch (e: any) {
    if (e.status && e.status === 403) {
      throw new IsGroupAdminError()
    } else {
      throw e
    }
  }
}
export const removeGroupMember = async (
  group_id: string,
  member_id: string,
  invite_pending: boolean
) => {
  const response = await internalFetch<{ success: true }>(
    `/secure/group/${group_id}/remove`,
    'DELETE',
    { member_id, invite_pending }
  )
  return response?.success
}
export const editGroup = async (
  group_id: string,
  name?: string,
  slug?: string
) => {
  const response = await internalFetch<{ success: true }>(
    `/secure/group/${group_id}`,
    'PUT',
    { name, slug }
  )
  return response?.success
}
export const deleteGroup = async (group_id: string) => {
  const response = await internalFetch<{ success: true }>(
    `/secure/group/${group_id}`,
    'DELETE'
  )
  return response?.success
}
export const getGroup = async (group_id: string) => {
  const response = await internalFetch<Group>(`/secure/group/${group_id}`)
  return response
}

export const getGroupExternal = async (group_id: string) => {
  const response = await internalFetch<Group>(`/group/${group_id}`)
  return response
}

export const subscribeToWaitlist = async (
  email: string,
  plan?: string
): Promise<boolean> => {
  const result = await internalFetch<SuccessResponse>(`/subscribe`, 'POST', {
    email,
    plan,
  })
  return !!result?.success
}

export const getMeeting = async (slot_id: string): Promise<DBSlot> => {
  const response = await queryClient.fetchQuery(
    QueryKeys.meeting(slot_id),
    () => internalFetch(`/meetings/meeting/${slot_id}`) as Promise<DBSlot>
  )
  return {
    ...response,
    start: new Date(response.start),
    end: new Date(response.end),
  }
}
export const getMeetingGuest = async (slot_id: string): Promise<DBSlot> => {
  const response = await queryClient.fetchQuery(
    QueryKeys.meeting(slot_id),
    () => internalFetch(`/meetings/guest/${slot_id}`) as Promise<DBSlot>
  )
  return {
    ...response,
    start: new Date(response.start),
    end: new Date(response.end),
  }
}

export const guestMeetingCancel = async (
  slot_id: string,
  payload: GuestMeetingCancel
) => {
  try {
    const response = await internalFetch<{ success: true }>(
      `/meetings/guest/${slot_id}`,
      'DELETE',
      payload
    )
    return response
  } catch (e) {
    if (e instanceof ApiFetchError) {
      if (e.status === 404) {
        throw new MeetingNotFoundError(slot_id)
      } else if (e.status === 401) {
        throw new UnauthorizedError()
      } else {
        throw e
      }
    }
  }
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

export const getGoogleAuthConnectUrl = async (state?: string | null) => {
  return await internalFetch<ConnectResponse>(
    `/secure/calendar_integrations/google/connect${
      state ? `?state=${state}` : ''
    }`
  )
}

export const getOffice365ConnectUrl = async (state?: string | null) => {
  return await internalFetch<ConnectResponse>(
    `/secure/calendar_integrations/office365/connect${
      state ? `?state=${state}` : ''
    }`
  )
}

export const addOrUpdateICloud = async (body: {
  url: string
  username: string
  password: string
  calendars: CalendarSyncInfo[]
}) => {
  return await internalFetch<{ connected: boolean }>(
    `/secure/calendar_integrations/icloud`,
    'POST',
    body
  )
}

export const addOrUpdateWebdav = async (body: {
  url: string
  username: string
  password: string
  calendars: CalendarSyncInfo[]
}) => {
  return await internalFetch<void>(
    `/secure/calendar_integrations/webdav`,
    'POST',
    body
  )
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
  syncOnly = false
): Promise<ConnectedCalendarCore[]> => {
  return await queryClient.fetchQuery(
    QueryKeys.connectedCalendars(syncOnly),
    () =>
      internalFetch<ConnectedCalendarCore[]>(
        `/secure/calendar_integrations?syncOnly=${syncOnly}`
      )
  )
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

export const updateConnectedCalendar = async (
  email: string,
  provider: TimeSlotSource,
  calendars: CalendarSyncInfo[]
): Promise<ConnectedCalendar> => {
  return (await internalFetch(`/secure/calendar_integrations`, 'PUT', {
    email,
    provider,
    calendars,
  })) as ConnectedCalendar
}

export const syncSubscriptions = async (): Promise<Subscription[]> => {
  return (await internalFetch(`/secure/subscriptions/sync`)) as Subscription[]
}

export const getSubscriptionByDomain = async (
  domain: string
): Promise<Subscription | undefined> => {
  return (await internalFetch(`/subscriptions/check/${domain}`)) as Subscription
}

export const validateWebdav = async (
  url: string,
  username: string,
  password: string
) => {
  return await internalFetch<
    (DAVCalendar & {
      calendarColor?: {
        _cdata?: string
      }
    })[]
  >('/secure/calendar_integrations/webdav', 'PUT', {
    url,
    username,
    password,
  })
}

export const generateDiscordAccount = async (
  discordCode: string
): Promise<DiscordAccount> => {
  return (await internalFetch(`/secure/discord`, 'POST', {
    discordCode,
  })) as DiscordAccount
}

export const getDiscordInfo = async (): Promise<DiscordUserInfo | null> => {
  return (await internalFetch(`/secure/discord`)) as DiscordUserInfo | null
}

export const deleteDiscordIntegration = async (): Promise<void> => {
  return await internalFetch(`/secure/discord`, 'DELETE')
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

export const getSuggestedSlots = async (
  addresses: string[],
  startDate: Date,
  endDate: Date,
  duration: number,
  includePast = false
): Promise<Interval[]> => {
  try {
    return (
      (await internalFetch(`/meetings/busy/suggest`, 'POST', {
        addresses,
        startDate,
        endDate,
        duration,
        includePast,
      })) as any[]
    ).map(slot => ({
      start: new Date(slot.start),
      end: new Date(slot.end),
    })) as Interval[]
  } catch (e) {
    if (e instanceof ApiFetchError) {
      if (e.status === 404) {
        return []
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

export const createHuddleRoom = async (
  title?: string
): Promise<{ url: string }> => {
  try {
    return (await internalFetch('/integrations/huddle/create', 'POST', {
      title,
    })) as { url: string }
  } catch (e) {
    if (e instanceof ApiFetchError) {
      if (e.status === 503) {
        throw new Huddle01ServiceUnavailable()
      }
    }
    throw e
  }
}
export const createGoogleRoom = async (): Promise<{ url: string }> => {
  try {
    return (await internalFetch('/integrations/google/create', 'POST', {})) as {
      url: string
    }
  } catch (e) {
    if (e instanceof ApiFetchError) {
      if (e.status === 503) {
        throw new GoogleServiceUnavailable()
      }
    }
    throw e
  }
}
export const createZoomMeeting = async (
  payload: UrlCreationRequest
): Promise<{ url: string }> => {
  try {
    return (await internalFetch(
      '/integrations/zoom/create',
      'POST',
      payload
    )) as { url: string }
  } catch (e) {
    if (e instanceof ApiFetchError) {
      if (e.status === 503) {
        throw new ZoomServiceUnavailable()
      }
    }
    throw e
  }
}
export const generateMeetingUrl = async (
  payload: UrlCreationRequest
): Promise<{ url: string }> => {
  try {
    return (await internalFetch('/meetings/url', 'POST', payload)) as {
      url: string
    }
  } catch (e) {
    if (e instanceof ApiFetchError) {
      if (e.message === GoogleServiceUnavailable.name) {
        throw new GoogleServiceUnavailable()
      }
      if (e.message === ZoomServiceUnavailable.name) {
        throw new ZoomServiceUnavailable()
      }
      if (e.message === Huddle01ServiceUnavailable.name) {
        throw new Huddle01ServiceUnavailable()
      }
      if (e.message === 'UrlCreationError') {
        throw new UrlCreationError()
      }
    }
    throw e
  }
}

export const getConferenceMeeting = async (
  meetingId: string
): Promise<ConferenceMeeting> => {
  const response = (await internalFetch(
    `/meetings/conference/${meetingId}`
  )) as ConferenceMeeting
  return {
    ...response,
    start: new Date(response.start),
    end: new Date(response.end),
  }
}

export const createGroup = async (name: string): Promise<GetGroupsResponse> => {
  try {
    const response = await internalFetch<GetGroupsResponse>(
      '/secure/group',
      'POST',
      {
        name,
      }
    )

    return response
  } catch (e: unknown) {
    if (e instanceof ApiFetchError) {
      if (e.status === 400) {
        throw new GroupCreationError('Invalid input data')
      } else if (e.status === 500) {
        throw new GroupCreationError(e.message)
      }
    }

    Sentry.captureException(e)
    throw e
  }
}

export const inviteUsers = async (
  groupId: string,
  payload: GroupInvitePayload
): Promise<void> => {
  try {
    await internalFetch<void>(
      `/secure/group/${groupId}/invite`,
      'POST',
      payload
    )
  } catch (e: unknown) {
    if (e instanceof ApiFetchError) {
      if (e.status === 404) {
        throw new ContactNotFound()
      }
    }

    Sentry.captureException(e)
    throw e
  }
}

export const createTelegramHash = async () => {
  return (
    await internalFetch<{ data: TelegramConnection }>(
      '/secure/telegram',
      'POST'
    )
  ).data
}

export const getPendingTgConnection = async () => {
  return (
    await internalFetch<{ data?: TelegramConnection }>(
      '/secure/telegram',
      'GET'
    )
  ).data
}

export const subscribeWithCoupon = async (
  coupon: string,
  domain?: string
): Promise<Subscription> => {
  try {
    return (await internalFetch(`/secure/subscriptions/custom`, 'POST', {
      coupon,
      domain,
    })) as Subscription
  } catch (e: unknown) {
    if (e instanceof ApiFetchError) {
      if (e.status && e.status === 400) {
        throw new CouponNotValid()
      } else if (e.status && e.status === 410) {
        throw new CouponExpired()
      } else if (e.status && e.status === 409) {
        throw new CouponAlreadyUsed()
      }
    }
    throw e
  }
}

export const updateCustomSubscriptionDomain = async (
  domain: string
): Promise<Subscription> => {
  try {
    return await internalFetch<Subscription>(
      `/secure/subscriptions/custom`,
      'PATCH',
      {
        domain,
      }
    )
  } catch (e: unknown) {
    if (e instanceof ApiFetchError) {
      if (e.status && e.status === 400) {
        throw new NoActiveSubscription()
      } else if (e.status && e.status === 410) {
        throw new SubscriptionNotCustom()
      }
    }
    throw e
  }
}

export const getNewestCoupon = async (
  signal?: AbortSignal
): Promise<Coupon> => {
  return await internalFetch<Coupon>(
    `/subscriptions/custom`,
    'GET',
    undefined,
    { signal }
  )
}

export const searchForAccounts = async (query: string, offset = 0) => {
  return await internalFetch<ContactSearch>(
    `/secure/accounts/search?q=${query}&offset=${offset}`
  )
}

export const sendContactListInvite = async (
  address?: string,
  email?: string
) => {
  try {
    return await internalFetch<{ success: boolean; message: string }>(
      `/secure/contact/invite`,
      'POST',
      {
        address,
        email,
      }
    )
  } catch (e: unknown) {
    if (e instanceof ApiFetchError) {
      if (e.status && e.status === 400) {
        throw new ContactAlreadyExists()
      }
      if (e.status && e.status === 403) {
        throw new CantInviteYourself()
      } else if (e.status && e.status === 409) {
        throw new ContactInviteAlreadySent()
      }
    }
  }
}

export const getContacts = async (limit = 10, offset = 0, query = '') => {
  return await internalFetch<Array<Contact>>(
    `/secure/contact?limit=${limit}&offset=${offset}&q=${query}`
  )
}
export const getContactsLean = async (limit = 10, offset = 0, query = '') => {
  return await internalFetch<Array<LeanContact>>(
    `/secure/contact?type=lean&limit=${limit}&offset=${offset}&q=${query}`
  )
}

export const getContactInviteRequests = async (
  limit = 10,
  offset = 0,
  query = ''
) => {
  return await internalFetch<Array<ContactInvite>>(
    `/secure/contact/requests?limit=${limit}&offset=${offset}&q=${query}`
  )
}

export const getContactInviteRequestCount = async () => {
  return await internalFetch<number>(`/secure/contact/requests/metrics`)
}

export const acceptContactInvite = async (identifier: string) => {
  try {
    return await internalFetch<{ success: boolean }>(
      `/secure/contact/requests/${identifier}`,
      'POST'
    )
  } catch (e) {
    if (e instanceof ApiFetchError) {
      if (e.status && e.status === 400) {
        throw new ContactAlreadyExists()
      } else if (e.status && e.status === 403) {
        throw new ContactInviteNotForAccount()
      } else if (e.status && e.status === 404) {
        throw new ContactInviteNotFound()
      } else if (e.status && e.status === 409) {
        throw new OwnInviteError()
      }
    }
    throw e
  }
}

export const rejectContactInvite = async (identifier: string) => {
  try {
    return await internalFetch<{ success: boolean }>(
      `/secure/contact/requests/${identifier}`,
      'DELETE'
    )
  } catch (e) {
    if (e instanceof ApiFetchError) {
      if (e.status && e.status === 400) {
        throw new ContactAlreadyExists()
      } else if (e.status && e.status === 403) {
        throw new ContactInviteNotForAccount()
      } else if (e.status && e.status === 404) {
        throw new ContactInviteNotFound()
      } else if (e.status && e.status === 409) {
        throw new OwnInviteError()
      }
    }
    throw e
  }
}

export const getContactById = async (identifier: string) => {
  return await internalFetch<Contact>(`/secure/contact/${identifier}`)
}

export const removeContact = async (contact_address: string) => {
  return await internalFetch<{ success: boolean }>(
    `/secure/contact/${contact_address}`,
    'DELETE'
  )
}

export const getContactInviteById = async (identifier: string) => {
  try {
    return await internalFetch<ContactInvite>(
      `/secure/contact/requests/${identifier}`
    )
  } catch (e) {
    if (e instanceof ApiFetchError) {
      if (e.status && e.status === 400) {
        throw new ContactAlreadyExists()
      } else if (e.status && e.status === 404) {
        throw new ContactInviteNotFound()
      }
    }
    throw e
  }
}

export const doesContactExist = async (identifier: string) => {
  return await internalFetch<boolean>(`/secure/contact/${identifier}/exist`)
}
