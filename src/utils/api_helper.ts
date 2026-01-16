import { ConnectedAccountInfo, StripeCountry } from '@meta/ConnectedAccounts'
import {
  Address,
  ICoinConfig,
  MeetingSession,
  Transaction,
} from '@meta/Transactions'
import * as Sentry from '@sentry/nextjs'
import { DateTime } from 'luxon'
import { DAVCalendar } from 'tsdav'

import {
  Account,
  GetMeetingTypesResponseWithMetadata,
  MeetingType,
  PaidMeetingTypes,
  PaymentPreferences,
  PublicAccount,
  SimpleAccountInfo,
} from '@/types/Account'
import { AccountNotifications } from '@/types/AccountNotifications'
import { AvailabilityBlock } from '@/types/availability'
import {
  CancelSubscriptionResponse,
  GetPlansResponse,
  GetSubscriptionHistoryResponse,
  GetSubscriptionResponse,
  SubscribeRequest,
  SubscribeRequestCrypto,
  SubscribeResponse,
  SubscribeResponseCrypto,
  TrialEligibilityResponse,
} from '@/types/Billing'
import {
  AttendeeStatus,
  CalendarEvents,
  DashBoardMwwEvents,
  ExtendedCalendarEvents,
  UnifiedEvent,
} from '@/types/Calendar'
import {
  CalendarSyncInfo,
  ConnectedCalendar,
  ConnectedCalendarCore,
  ConnectResponse,
  GetCalendarIntegrationsResponse,
  WebCalResponse,
} from '@/types/CalendarConnections'
import {
  Contact,
  ContactInvite,
  ContactSearch,
  InviteGroupMember,
  LeanContact,
} from '@/types/Contacts'
import { ConditionRelation, SuccessResponse } from '@/types/common'
import { InviteType } from '@/types/Dashboard'
import { DiscordAccount, DiscordUserInfo } from '@/types/Discord'
import {
  EmptyGroupsResponse,
  GetGroupsFullResponse,
  GetGroupsFullResponseWithMetadata,
  GetGroupsResponse,
  Group,
  GroupInvitePayload,
  GroupMember,
} from '@/types/Group'
import { UserLocale } from '@/types/Locale'
import {
  AccountSlot,
  ConferenceMeeting,
  DBSlot,
  ExtendedDBSlot,
  GroupMeetingRequest,
  GuestMeetingCancel,
  GuestSlot,
  MeetingDecrypted,
  MeetingInfo,
  SlotInstance,
  TimeSlot,
  TimeSlotSource,
} from '@/types/Meeting'
import { PaymentAccountStatus } from '@/types/PaymentAccount'
import {
  AddParticipantRequest,
  AvailabilitySlot,
  CancelQuickPollResponse,
  CreateQuickPollRequest,
  PollStatus,
  QuickPollBusyParticipant,
  QuickPollListResponse,
  QuickPollParticipant,
  QuickPollParticipantStatus,
  QuickPollParticipantType,
  UpdateQuickPollRequest,
} from '@/types/QuickPoll'
import {
  ChangeGroupAdminRequest,
  ConfirmCryptoTransactionRequest,
  CreateAvailabilityBlockRequest,
  CreateMeetingTypeRequest,
  DuplicateAvailabilityBlockRequest,
  GuestMeetingCancelRequest,
  MeetingCancelRequest,
  MeetingCheckoutRequest,
  MeetingCreationRequest,
  MeetingInstanceUpdateRequest,
  MeetingUpdateRequest,
  ParseParticipantInfo,
  ParseParticipantsRequest,
  RequestInvoiceRequest,
  UpdateAvailabilityBlockMeetingTypesRequest,
  UpdateAvailabilityBlockRequest,
  UpdateMeetingTypeRequest,
  UrlCreationRequest,
} from '@/types/Requests'
import { Coupon, Subscription } from '@/types/Subscription'
import { TelegramConnection, TelegramUserInfo } from '@/types/Telegram'
import { GateConditionObject } from '@/types/TokenGating'

import { UpdateCalendarEventRequest } from '../types/Requests'
import { decodeMeeting, meetWithSeriesPreprocessors } from './calendar_manager'
import {
  apiUrl,
  QUICKPOLL_DEFAULT_LIMIT,
  QUICKPOLL_DEFAULT_OFFSET,
} from './constants'
import { PaymentStatus } from './constants/meeting-types'
import {
  AccountNotFoundError,
  AllMeetingSlotsUsedError,
  ApiFetchError,
  CantInviteYourself,
  ChainNotFound,
  ContactAlreadyExists,
  ContactInviteAlreadySent,
  ContactInviteNotForAccount,
  ContactInviteNotFound,
  ContactLimitExceededError,
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
  LastMeetingTypeError,
  MeetingChangeConflictError,
  MeetingCreationError,
  MeetingNotFoundError,
  MeetingSessionNotFoundError,
  MeetingSlugAlreadyExists,
  MemberDoesNotExist,
  NoActiveSubscription,
  OwnInviteError,
  ServiceUnavailableError,
  SubscriptionDomainUpdateNotAllowed,
  SubscriptionNotCustom,
  TimeNotAvailableError,
  TransactionCouldBeNotFoundError,
  TransactionIsRequired,
  TransactionNotFoundError,
  UnauthorizedError,
  UrlCreationError,
  ZoomServiceUnavailable,
} from './errors'
import QueryKeys from './query_keys'
import { queryClient } from './react_query'
import { POAP, POAPEvent } from './services/poap.helper'
import { getSignature } from './storage'
import { safeConvertConditionFromAPI } from './token.gate.service'

type RequestOption = {
  signal?: AbortSignal
}
type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
export const internalFetch = async <T, J = unknown>(
  path: string,
  method: Method = 'GET',
  body?: J,
  options: RequestInit = {},
  headers = {},
  isFormData = false,
  withRetry = true,
  remainingRetries = 3
): Promise<T> => {
  const baseDelay = 1000

  try {
    const response = await fetch(`${apiUrl}${path}`, {
      headers: isFormData
        ? undefined
        : {
            'Content-Type': 'application/json',
            ...headers,
          },
      method,
      mode: 'cors',
      ...options,
      body: isFormData
        ? (body as FormData)
        : (!!body && (JSON.stringify(body) as string)) || null,
    })
    if (response.status >= 200 && response.status < 300) {
      return (await response.json()) as T
    }

    throw new ApiFetchError(response.status, await response.text())
  } catch (e: unknown) {
    // Check if error is retryable
    const isRetryableError =
      withRetry &&
      remainingRetries > 0 &&
      ((e instanceof TypeError &&
        (e.message.includes('Failed to fetch') ||
          e.message.includes('Network request failed') ||
          e.message.includes('NetworkError') ||
          e.message.includes('timeout'))) ||
        (e instanceof ApiFetchError && e.status >= 500))

    if (isRetryableError) {
      const delay = Math.max(baseDelay / remainingRetries, 100)
      console.warn(`API call failed, retrying...`, e)
      await new Promise(resolve => setTimeout(resolve, delay))
      return internalFetch<T>(
        path,
        method,
        body,
        options,
        headers,
        isFormData,
        withRetry,
        remainingRetries - 1
      )
    }

    // Exclude account not found error on sentry
    if (
      e instanceof ApiFetchError &&
      !path.includes('accounts') &&
      e.status === 404
    ) {
      Sentry.captureException(e)
    } else if (e instanceof ApiFetchError && e.status === 504) {
      Sentry.captureException(e)
      throw new ServiceUnavailableError()
    }
    throw e
  }
}

export const getAccount = async (
  identifier: string
): Promise<PublicAccount> => {
  try {
    const account = await internalFetch<PublicAccount>(
      `/accounts/${identifier}`
    )
    if (!account) throw new AccountNotFoundError(identifier)
    return account
  } catch (e: unknown) {
    if (e instanceof ApiFetchError && e.status === 404) {
      throw new AccountNotFoundError(identifier)
    }
    throw e
  }
}

export const getOwnAccount = async (identifier: string): Promise<Account> => {
  try {
    const account = await internalFetch<Account>('/secure/accounts')
    return account
  } catch (e: unknown) {
    if (e instanceof ApiFetchError && e.status === 404) {
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
  } catch (e: unknown) {
    if (e instanceof ApiFetchError && e.status === 404) {
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
  } catch (e: unknown) {
    throw e
  }
}

export const getExistingAccounts = async (
  addresses: string[],
  fullInformation = true,
  options?: RequestOption
): Promise<Account[]> => {
  try {
    return await queryClient.fetchQuery(
      QueryKeys.existingAccounts(addresses, fullInformation),
      () =>
        internalFetch(
          `/accounts/existing`,
          'POST',
          {
            addresses,
            fullInformation,
          },
          options
        ) as Promise<Account[]>
    )
  } catch (e: unknown) {
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
export const saveAvatar = async (
  formData: FormData,
  address: string
): Promise<string> => {
  const response = await internalFetch<string>(
    `/secure/accounts/avatar`,
    'POST',
    formData,
    {},
    {
      'Content-Type': 'multipart/form-data',
    },
    true
  )
  await queryClient.invalidateQueries(QueryKeys.account(address?.toLowerCase()))
  return response
}
export const saveBanner = async (
  formData: FormData,
  address: string
): Promise<string> => {
  const response = await internalFetch<string>(
    `/secure/accounts/banner`,
    'POST',
    formData,
    {},
    {
      'Content-Type': 'multipart/form-data',
    },
    true
  )
  await queryClient.invalidateQueries(QueryKeys.account(address?.toLowerCase()))
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
  } catch (e: unknown) {
    if (e instanceof ApiFetchError && e.status === 409) {
      throw new TimeNotAvailableError()
    } else if (e instanceof ApiFetchError && e.status === 412) {
      throw new MeetingCreationError()
    } else if (e instanceof ApiFetchError && e.status === 403) {
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
  } catch (e: unknown) {
    if (e instanceof ApiFetchError && e.status === 404) {
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
  } catch (e: unknown) {
    if (e instanceof ApiFetchError && e.status === 402) {
      throw new AllMeetingSlotsUsedError()
    } else if (e instanceof ApiFetchError && e.status === 400) {
      throw new TransactionIsRequired()
    } else if (e instanceof ApiFetchError && e.status === 409) {
      throw new TimeNotAvailableError()
    } else if (e instanceof ApiFetchError && e.status === 412) {
      throw new MeetingCreationError()
    } else if (e instanceof ApiFetchError && e.status === 403) {
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
  } catch (e: unknown) {
    if (e instanceof ApiFetchError && e.status === 402) {
      throw new AllMeetingSlotsUsedError()
    } else if (e instanceof ApiFetchError && e.status === 400) {
      throw new TransactionIsRequired()
    } else if (e instanceof ApiFetchError && e.status === 409) {
      throw new TimeNotAvailableError()
    } else if (e instanceof ApiFetchError && e.status === 412) {
      throw new MeetingCreationError()
    } else if (e instanceof ApiFetchError && e.status === 403) {
      throw new GateConditionNotValidError()
    }
    throw e
  }
}

export const updateMeetingAsGuest = async (
  slotId: string,
  meeting: MeetingUpdateRequest
): Promise<DBSlot> => {
  try {
    return (await internalFetch(
      `/meetings/guest/${slotId}`,
      'PUT',
      meeting
    )) as DBSlot
  } catch (e: unknown) {
    if (e instanceof ApiFetchError) {
      if (e.status && e.status === 409) {
        throw new TimeNotAvailableError()
      } else if (e.status === 400) {
        throw new TransactionIsRequired()
      } else if (e.status && e.status === 412) {
        throw new MeetingCreationError()
      } else if (e.status && e.status === 417) {
        throw new MeetingChangeConflictError()
      } else if (e.status && e.status === 404) {
        throw e.message === 'MeetingSessionNotFoundError'
          ? new MeetingSessionNotFoundError(slotId)
          : new MeetingNotFoundError(slotId)
      } else if (e.status && e.status === 401) {
        throw new UnauthorizedError()
      }
    }
    throw e
  }
}

export const apiUpdateMeeting = async (
  slotId: string,
  meeting: MeetingUpdateRequest,
  signal?: AbortSignal
): Promise<DBSlot> => {
  try {
    const response = await internalFetch<DBSlot>(
      `/secure/meetings/${slotId}`,
      'POST',
      meeting,
      { signal }
    )

    return response
  } catch (e: unknown) {
    if (e instanceof ApiFetchError) {
      if (e.status === 409) {
        throw new TimeNotAvailableError()
      } else if (e.status === 400) {
        throw new TransactionIsRequired()
      } else if (e.status === 412) {
        throw new MeetingCreationError()
      } else if (e.status === 417) {
        throw new MeetingChangeConflictError()
      } else if (e.status === 404) {
        throw new MeetingNotFoundError(slotId)
      } else if (e.status === 401) {
        throw new UnauthorizedError()
      }
    }
    throw e
  }
}
export const apiUpdateMeetingInstance = async (
  slotId: string,
  meeting: MeetingInstanceUpdateRequest,
  signal?: AbortSignal
): Promise<DBSlot> => {
  try {
    const response = await internalFetch<DBSlot>(
      `/secure/meetings/instances/${slotId}`,
      'POST',
      meeting,
      { signal }
    )
    return response
  } catch (e: unknown) {
    if (e instanceof ApiFetchError) {
      if (e.status === 409) {
        throw new TimeNotAvailableError()
      } else if (e.status === 400) {
        throw new TransactionIsRequired()
      } else if (e.status === 412) {
        throw new MeetingCreationError()
      } else if (e.status === 417) {
        throw new MeetingChangeConflictError()
      } else if (e.status === 404) {
        throw new MeetingNotFoundError(slotId)
      } else if (e.status === 401) {
        throw new UnauthorizedError()
      }
    }
    throw e
  }
}

export const cancelMeeting = async (
  meeting: MeetingDecrypted,
  currentTimezone: string
): Promise<{ removed: string[] }> => {
  const body: MeetingCancelRequest = {
    currentTimezone,
    meeting,
  }
  try {
    return (await internalFetch(
      `/secure/meetings/${meeting.id}`,
      'DELETE',
      body
    )) as { removed: string[] }
  } catch (e: unknown) {
    if (e instanceof ApiFetchError && e.status === 409) {
      throw new TimeNotAvailableError()
    } else if (e instanceof ApiFetchError && e.status === 412) {
      throw new MeetingCreationError()
    }
    throw e
  }
}
export const cancelMeetingInstance = async (
  meeting: MeetingDecrypted,
  currentTimezone: string
): Promise<{ removed: string[] }> => {
  const body: MeetingCancelRequest = {
    currentTimezone,
    meeting,
  }
  try {
    return (await internalFetch(
      `/secure/meetings/instances/${meeting.id}`,
      'DELETE',
      body
    )) as { removed: string[] }
  } catch (e: unknown) {
    if (e instanceof ApiFetchError && e.status === 409) {
      throw new TimeNotAvailableError()
    } else if (e instanceof ApiFetchError && e.status === 412) {
      throw new MeetingCreationError()
    }
    throw e
  }
}

export const cancelMeetingGuest = async (
  meeting: MeetingDecrypted,
  currentTimezone: string
): Promise<{ removed: string[] }> => {
  const body: MeetingCancelRequest = {
    currentTimezone,
    meeting,
  }
  try {
    return (await internalFetch(
      `/secure/meetings/${meeting.id}`,
      'DELETE',
      body
    )) as { removed: string[] }
  } catch (e: unknown) {
    if (e instanceof ApiFetchError && e.status === 409) {
      throw new TimeNotAvailableError()
    } else if (e instanceof ApiFetchError && e.status === 412) {
      throw new MeetingCreationError()
    }
    throw e
  }
}

export const isSlotFreeApiCall = async (
  account_id: string,
  start: Date,
  end: Date,
  meetingTypeId?: string,
  txHash?: Address | null
): Promise<{ isFree: boolean }> => {
  try {
    return (await internalFetch(
      `/meetings/slot/${account_id}?start=${start.getTime()}&end=${end.getTime()}&meetingTypeId=${meetingTypeId}&txHash=${
        txHash || ''
      }`
    )) as { isFree: boolean }
  } catch (e) {
    if (e instanceof ApiFetchError && e.status === 402) {
      throw new AllMeetingSlotsUsedError()
    } else if (e instanceof ApiFetchError && e.status === 400) {
      throw new TransactionIsRequired()
    } else {
      return { isFree: false }
    }
  }
}

export const saveMeetingType = async (
  type: CreateMeetingTypeRequest
): Promise<MeetingType> => {
  try {
    return await internalFetch<MeetingType>(
      `/secure/meetings/type`,
      'POST',
      type
    )
  } catch (e: unknown) {
    if (e instanceof ApiFetchError && e.status === 400) {
      throw new MeetingSlugAlreadyExists(type.slug)
    } else {
      throw e
    }
  }
}

export const updateMeetingType = async (
  type: UpdateMeetingTypeRequest
): Promise<MeetingType> => {
  try {
    return await internalFetch<MeetingType>(
      `/secure/meetings/type`,
      'PATCH',
      type
    )
  } catch (e: unknown) {
    if (e instanceof ApiFetchError && e.status === 400) {
      throw new MeetingSlugAlreadyExists(type.slug)
    } else {
      throw e
    }
  }
}

export const removeMeetingType = async (
  typeId: string
): Promise<MeetingType> => {
  try {
    return await internalFetch<MeetingType>(`/secure/meetings/type`, 'DELETE', {
      typeId,
    })
  } catch (e: unknown) {
    if (e instanceof ApiFetchError && e.status === 409) {
      throw new LastMeetingTypeError()
    } else {
      throw e
    }
  }
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
    end: new Date(slot.end),
    start: new Date(slot.start),
  }))
}

export const getBusySlots = async (
  accountIdentifier: string,
  start?: Date,
  end?: Date,
  limit?: number,
  offset?: number
): Promise<Interval[]> => {
  const url = `/meetings/busy/${accountIdentifier}?limit=${
    limit || undefined
  }&offset=${offset || 0}&start=${start?.getTime() || undefined}&end=${
    end?.getTime() || undefined
  }`
  const response = await queryClient.fetchQuery(
    QueryKeys.busySlots({
      end,
      id: accountIdentifier?.toLowerCase(),
      limit,
      offset,
      start,
    }),
    () => internalFetch(url) as Promise<Interval[]>
  )
  return response.map(slot => ({
    ...slot,
    end: new Date(slot.end),
    start: new Date(slot.start),
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
    end,
    limit,
    offset,
    relation,
    start,
  })) as Interval[]

  return response.map(slot => ({
    ...slot,
    end: new Date(slot.end),
    start: new Date(slot.start),
  }))
}
export const fetchBusySlotsRawForMultipleAccounts = async (
  addresses: string[],
  start: Date,
  end: Date,
  limit?: number,
  offset?: number,
  signal?: AbortSignal
): Promise<TimeSlot[]> => {
  const response = (await internalFetch(
    `/meetings/busy/team`,
    'POST',
    {
      addresses,
      end,
      isRaw: true,
      limit,
      offset,
      start,
    },
    {
      signal,
    }
  )) as TimeSlot[]

  return response.map(slot => ({
    ...slot,
    end: new Date(slot.end),
    start: new Date(slot.start),
  }))
}

export const fetchBusySlotsRawForQuickPollParticipants = async (
  participants: QuickPollBusyParticipant[],
  start: Date,
  end: Date,
  limit?: number,
  offset?: number
): Promise<TimeSlot[]> => {
  const response = (await internalFetch(
    `/quickpoll/busy/participants`,
    'POST',
    {
      end,
      isRaw: true,
      limit,
      offset,
      participants,
      start,
    }
  )) as TimeSlot[]

  return response.map(slot => ({
    ...slot,
    end: new Date(slot.end),
    start: new Date(slot.start),
  }))
}

export const getMeetingsForDashboard = async (
  accountIdentifier: string,
  end: Date,
  limit: number,
  offset: number
): Promise<ExtendedDBSlot[]> => {
  const response = await internalFetch<ExtendedDBSlot[]>(
    `/meetings/${accountIdentifier}?upcoming=true&limit=${
      limit || undefined
    }&offset=${offset || 0}&end=${end.getTime()}`
  )
  return response?.map(slot => ({
    ...slot,
    created_at: slot.created_at ? new Date(slot.created_at) : undefined,
    end: new Date(slot.end),
    start: new Date(slot.start),
  }))
}
export const syncMeeting = async (
  decryptedMeetingData: MeetingInfo,
  slotId: string
): Promise<void> => {
  try {
    await internalFetch(`/secure/meetings/sync`, 'PATCH', {
      decryptedMeetingData,
      slotId,
    })
  } catch (_e) {}
}

export const getGroupsFull = async (
  limit?: number,
  offset?: number,
  search?: string,
  includeInvites = true
): Promise<Array<GetGroupsFullResponse>> => {
  let url = `/secure/group/full?limit=${limit}&offset=${offset}&includeInvites=${includeInvites}`
  if (search) {
    url += `&search=${search}`
  }
  const response = await internalFetch<
    Array<GetGroupsFullResponse> | GetGroupsFullResponseWithMetadata
  >(url)

  // Handle new response format (with metadata) or legacy format (array)
  if (Array.isArray(response)) {
    return response
  }
  return response.groups
}

export const getGroupsFullWithMetadata = async (
  limit?: number,
  offset?: number,
  search?: string,
  includeInvites = true
): Promise<GetGroupsFullResponseWithMetadata> => {
  let url = `/secure/group/full?limit=${limit}&offset=${offset}&includeInvites=${includeInvites}`
  if (search) {
    url += `&search=${search}`
  }
  return await internalFetch<GetGroupsFullResponseWithMetadata>(url)
}
export const getGroupsEmpty = async (): Promise<Array<EmptyGroupsResponse>> => {
  const response = (await internalFetch(
    `/secure/group/empty`
  )) as Array<GetGroupsResponse>
  return response
}

export const getGroupsInvites = async (search?: string) => {
  let url = `/secure/group/invites`
  if (search) {
    url += `?search=${search}`
  }
  const response = await internalFetch<Array<EmptyGroupsResponse>>(url)
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
  } catch (e: unknown) {
    if (e instanceof ApiFetchError && e.status === 403) {
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
    { invite_pending, member_id }
  )
  return response?.success
}
export const editGroup = async (
  group_id: string,
  name?: string,
  slug?: string,
  avatar_url?: string,
  description?: string
) => {
  const response = await internalFetch<{ success: true }>(
    `/secure/group/${group_id}`,
    'PUT',
    { avatar_url, description, name, slug }
  )
  return response?.success
}

export const uploadGroupAvatar = async (
  groupId: string,
  formData: FormData
): Promise<string> => {
  const response = await internalFetch<string>(
    `/secure/group/${groupId}/avatar`,
    'POST',
    formData,
    {},
    {
      'Content-Type': 'multipart/form-data',
    },
    true
  )
  return response
}

export const getGroupMemberAvailabilities = async (
  groupId: string,
  memberAddress: string
): Promise<AvailabilityBlock[]> => {
  const response = await internalFetch<AvailabilityBlock[]>(
    `/secure/group/${groupId}/member/${memberAddress}/availabilities`
  )
  return response || []
}

export const updateGroupMemberAvailabilities = async (
  groupId: string,
  memberAddress: string,
  availabilityIds: string[]
): Promise<void> => {
  await internalFetch<{ success: true }>(
    `/secure/group/${groupId}/member/${memberAddress}/availabilities`,
    'PUT',
    { availability_ids: availabilityIds }
  )
}

export const getGroupMembersAvailabilities = async (
  groupId: string
): Promise<Record<string, AvailabilityBlock[]>> => {
  const response = await internalFetch<Record<string, AvailabilityBlock[]>>(
    `/secure/group/${groupId}/members/availabilities`
  )
  return response || {}
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

export const getMeeting = async (
  slot_id: string,
  signal?: AbortSignal
): Promise<DBSlot> => {
  const response = await internalFetch<DBSlot>(
    `/meetings/meeting/${slot_id}`,
    'GET',
    null,
    { signal }
  )
  return {
    ...response,
    end: new Date(response.end),
    start: new Date(response.start),
  }
}

export const getConferenceDataBySlotId = async (
  slotId: string
): Promise<ConferenceMeeting> => {
  const response = await internalFetch<ConferenceMeeting>(
    `/meetings/guest/${slotId}`
  )

  return {
    ...response,
    created_at: response.created_at
      ? new Date(response.created_at)
      : new Date(),
    end: new Date(response.end),
    start: new Date(response.start),
  }
}

export const getSlotsByIds = async (slotIds: string[]): Promise<DBSlot[]> => {
  if (!slotIds || slotIds.length === 0) {
    console.warn('getSlotsByIds called with empty slot IDs array')
    return []
  }

  const validSlotIds = slotIds.filter(id => id && id.trim() !== '')

  if (validSlotIds.length === 0) {
    console.warn('getSlotsByIds called with no valid slot IDs')
    return []
  }

  const response = (await internalFetch(
    `/meetings/slots?ids=${validSlotIds.join(',')}`
  )) as DBSlot[]
  return response.map(slot => ({
    ...slot,
    end: new Date(slot.end),
    start: new Date(slot.start),
  }))
}

export const getMeetingGuest = async (
  slot_id: string
): Promise<ConferenceMeeting> => {
  const response = await internalFetch<ConferenceMeeting>(
    `/meetings/guest/${slot_id}`
  )
  return {
    ...response,
    created_at: response.created_at
      ? new Date(response.created_at)
      : new Date(),
    end: new Date(response.end),
    start: new Date(response.start),
  }
}

export const guestMeetingCancel = async (
  slot_id: string,
  payload: GuestMeetingCancel
) => {
  try {
    return await internalFetch<{ success: true }>(
      `/meetings/guest/${slot_id}`,
      'DELETE',
      payload
    )
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

export const conferenceGuestMeetingCancel = async (
  meeting_id: string,
  payload: GuestMeetingCancelRequest
) => {
  try {
    return await internalFetch<{ removed: string[] }>(
      `/meetings/meeting/${meeting_id}/slot`,
      'DELETE',
      payload
    )
  } catch (e) {
    if (e instanceof ApiFetchError) {
      if (e.status === 404) {
        throw new MeetingNotFoundError(meeting_id)
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
  notifications: AccountNotifications,
  code?: string
): Promise<AccountNotifications> => {
  let url = `/secure/notifications`
  if (code && code.length > 0) {
    url += `?code=${code}`
  }
  return (await internalFetch(
    url,
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
  } catch (e: unknown) {
    if (e instanceof ApiFetchError && e.status === 404) {
      throw new AccountNotFoundError(accountAddress)
    } else if (e instanceof ApiFetchError && e.status === 401) {
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
): Promise<Account & { jti: string }> => {
  return await internalFetch<Account & { jti: string }>(
    `/auth/signup`,
    'POST',
    {
      address,
      nonce,
      signature,
      timezone,
    }
  )
}

export const listConnectedCalendars = async (
  syncOnly = false
): Promise<ConnectedCalendarCore[]> => {
  return await queryClient.fetchQuery(
    QueryKeys.connectedCalendars(syncOnly),
    async () => {
      const response = await internalFetch<GetCalendarIntegrationsResponse>(
        `/secure/calendar_integrations?syncOnly=${syncOnly}`
      )
      return response.calendars || []
    }
  )
}

export const getCalendarIntegrationsWithMetadata = async (
  syncOnly = false
): Promise<GetCalendarIntegrationsResponse> => {
  return await internalFetch<GetCalendarIntegrationsResponse>(
    `/secure/calendar_integrations?syncOnly=${syncOnly}`
  )
}

export const deleteConnectedCalendar = async (
  email: string,
  provider: TimeSlotSource
): Promise<ConnectedCalendarCore[]> => {
  await queryClient.invalidateQueries(QueryKeys.connectedCalendars(false))
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
  await queryClient.invalidateQueries(QueryKeys.connectedCalendars(false))
  return (await internalFetch(`/secure/calendar_integrations`, 'PUT', {
    calendars,
    email,
    provider,
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

export const hasActiveBillingSubscription = async (
  accountAddress: string
): Promise<boolean> => {
  try {
    const response = await internalFetch<{ hasActive: boolean }>(
      `/secure/billing/subscription/active`
    )
    return response.hasActive
  } catch (e) {
    if (e instanceof ApiFetchError && e.status === 404) {
      return false
    }
    throw e
  }
}

export const getActiveSubscription = async (
  accountAddress: string
): Promise<GetSubscriptionResponse | null> => {
  try {
    return (await internalFetch(
      `/secure/billing/subscription`
    )) as GetSubscriptionResponse
  } catch (e) {
    if (e instanceof ApiFetchError && e.status === 404) {
      return null
    }
    throw e
  }
}

export const getManageSubscriptionUrl = async (): Promise<string> => {
  const response = await internalFetch<{ url: string }>(
    `/secure/billing/manage`
  )
  return response.url
}

export const getSubscriptionHistory = async (
  limit = 10,
  offset = 0
): Promise<GetSubscriptionHistoryResponse> => {
  const response = await internalFetch<GetSubscriptionHistoryResponse>(
    `/secure/billing/subscription/history?limit=${limit}&offset=${offset}`
  )
  return response
}

export const getBillingPlans = async (): Promise<GetPlansResponse['plans']> => {
  const response = await internalFetch<GetPlansResponse>(
    '/secure/billing/plans',
    'GET'
  )
  return response.plans
}

export const subscribeToBillingPlan = async (
  request: SubscribeRequest
): Promise<SubscribeResponse> => {
  return await internalFetch<SubscribeResponse>(
    '/secure/billing/subscribe',
    'POST',
    request
  )
}

export const subscribeToBillingPlanCrypto = async (
  request: SubscribeRequestCrypto
): Promise<SubscribeResponseCrypto> => {
  return await internalFetch<SubscribeResponseCrypto>(
    '/secure/billing/subscribe-crypto',
    'POST',
    request
  )
}

export const getTrialEligibility =
  async (): Promise<TrialEligibilityResponse> =>
    await internalFetch<TrialEligibilityResponse>(
      '/secure/billing/trial/eligible',
      'GET'
    )

export const cancelCryptoSubscription =
  async (): Promise<CancelSubscriptionResponse> => {
    return await internalFetch<CancelSubscriptionResponse>(
      '/secure/billing/cancel-crypto',
      'POST'
    )
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
    password,
    url,
    username,
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
      await internalFetch<{ result: boolean }>(`/secure/gate`, 'DELETE', {
        id,
      })
    ).result
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
  duration: number
): Promise<Interval[]> => {
  try {
    return (
      await internalFetch<Interval[]>(`/meetings/busy/suggest`, 'POST', {
        addresses,
        duration,
        endDate,
        startDate,
      })
    )
      .map(slot => ({
        end: new Date(slot.end),
        start: new Date(slot.start),
      }))
      .sort((a, b) => a.start.getTime() - b.start.getTime()) as Interval[]
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
    end: new Date(response.end),
    start: new Date(response.start),
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

export const getGroupInviteCount = async () => {
  return await internalFetch<number>(`/secure/group/invites/metrics`)
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

export const getTelegramUserInfo =
  async (): Promise<TelegramUserInfo | null> => {
    return await internalFetch(`/secure/telegram/user-info`)
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
        if (e.message.includes('Subscription is not custom')) {
          throw new SubscriptionNotCustom()
        }
        throw new SubscriptionDomainUpdateNotAllowed()
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
        if (e.message.includes('Free tier allows only')) {
          throw new ContactLimitExceededError()
        }
        throw new CantInviteYourself()
      } else if (e.status && e.status === 409) {
        throw new ContactInviteAlreadySent()
      }
    }
    throw e
  }
}
export const addGroupMemberToContact = async (payload: InviteGroupMember) => {
  try {
    return await internalFetch<{ success: boolean; message: string }>(
      `/secure/contact/add-group-member`,
      'POST',
      payload
    )
  } catch (e: unknown) {
    if (e instanceof ApiFetchError) {
      if (e.status && e.status === 400) {
        throw new ContactAlreadyExists()
      } else if (e.status && e.status === 403) {
        if (e.message.includes('Free tier allows only')) {
          throw new ContactLimitExceededError()
        }
        throw new CantInviteYourself()
      } else if (e.status && e.status === 404) {
        throw new MemberDoesNotExist()
      } else if (e.status && e.status === 409) {
        throw new ContactInviteAlreadySent()
      }
    }
    throw e
  }
}

export const getContacts = async (limit = 10, offset = 0, query = '') => {
  return await internalFetch<Array<Contact>>(
    `/secure/contact?limit=${limit}&offset=${offset}&q=${query}`
  )
}
export const getContactsLean = async (limit = 10, offset = 0, query = '') => {
  return await queryClient.fetchQuery(
    QueryKeys.groupFull(limit, offset, query),
    () =>
      internalFetch<Array<LeanContact>>(
        `/secure/contact?type=lean&limit=${limit}&offset=${offset}&q=${query}`
      )
  )
}

export const getContactsMetadata = async () => {
  return await internalFetch<{
    upgradeRequired: boolean
    contactsAddedThisMonth: number
    limit: number
  }>(`/secure/contact?metadata=true`)
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

export const getAvailabilityBlocks = async (): Promise<AvailabilityBlock[]> => {
  return await internalFetch<AvailabilityBlock[]>(`/secure/availabilities`)
}

export const createAvailabilityBlock = async ({
  title,
  timezone,
  weekly_availability,
  is_default,
}: CreateAvailabilityBlockRequest): Promise<AvailabilityBlock> => {
  return await internalFetch<AvailabilityBlock>(
    `/secure/availabilities`,
    'POST',
    {
      is_default,
      timezone,
      title,
      weekly_availability,
    }
  )
}

export const getAvailabilityBlock = async (
  id: string
): Promise<AvailabilityBlock> => {
  return await internalFetch<AvailabilityBlock>(`/secure/availabilities/${id}`)
}

export const updateAvailabilityBlock = async ({
  id,
  title,
  timezone,
  weekly_availability,
  is_default,
}: UpdateAvailabilityBlockRequest): Promise<AvailabilityBlock> => {
  return await internalFetch<AvailabilityBlock>(
    `/secure/availabilities/${id}`,
    'PUT',
    {
      is_default,
      timezone,
      title,
      weekly_availability,
    }
  )
}

export const deleteAvailabilityBlock = async (id: string): Promise<void> => {
  return await internalFetch<void>(`/secure/availabilities/${id}`, 'DELETE')
}

export const duplicateAvailabilityBlock = async ({
  id,
  modifiedData,
}: DuplicateAvailabilityBlockRequest): Promise<AvailabilityBlock> => {
  return await internalFetch<AvailabilityBlock>(
    `/secure/availabilities/${id}`,
    'POST',
    modifiedData
  )
}

export const getMeetingTypes = async (
  limit = 10,
  offset = 0
): Promise<MeetingType[]> => {
  const response = await internalFetch<
    MeetingType[] | GetMeetingTypesResponseWithMetadata
  >(`/secure/meetings/type?limit=${limit}&offset=${offset}`)

  // Handle new response format (with metadata) or legacy format (array)
  if (Array.isArray(response)) {
    return response
  }
  return response.meetingTypes
}

export const getMeetingTypesWithMetadata = async (
  limit = 10,
  offset = 0
): Promise<GetMeetingTypesResponseWithMetadata> => {
  return await internalFetch<GetMeetingTypesResponseWithMetadata>(
    `/secure/meetings/type?limit=${limit}&offset=${offset}`
  )
}

export const getMeetingType = async (id: string): Promise<MeetingType> => {
  return await internalFetch<MeetingType>(`/secure/meetings/type/${id}`)
}

export const createCryptoTransaction = async (
  transaction: ConfirmCryptoTransactionRequest
): Promise<{ success: true }> => {
  try {
    return await internalFetch<{ success: true }>(
      `/secure/transactions/crypto`,
      'POST',
      transaction
    )
  } catch (e: unknown) {
    if (e instanceof ApiFetchError && e.status === 402) {
      throw new TransactionCouldBeNotFoundError(transaction.transaction_hash)
    } else if (e instanceof ApiFetchError && e.status === 404) {
      throw new ChainNotFound(transaction.chain)
    }
    throw e
  }
}

export const getTransactionByTxHash = async (
  tx: Address
): Promise<MeetingSession[]> => {
  try {
    return await queryClient.fetchQuery(QueryKeys.transactionHash(tx), () =>
      internalFetch<MeetingSession[]>(`/transactions/meeting-sessions?tx=${tx}`)
    )
  } catch (e: unknown) {
    if (e instanceof ApiFetchError && e.status === 400) {
      throw new TransactionIsRequired()
    } else if (e instanceof ApiFetchError && e.status === 404) {
      throw new TransactionNotFoundError(tx)
    }
    throw e
  }
}

export const getPaidSessions = async (
  account_address: string
): Promise<PaidMeetingTypes[]> => {
  return await internalFetch<PaidMeetingTypes[]>(
    `/secure/transactions/meeting-sessions?account_address=${account_address}`
  )
}

export const updateAvailabilityBlockMeetingTypes = async ({
  availability_block_id,
  meeting_type_ids,
}: UpdateAvailabilityBlockMeetingTypesRequest): Promise<void> => {
  return await internalFetch<void>(
    `/secure/availabilities/${availability_block_id}/meeting-types`,
    'PATCH',
    { meeting_type_ids }
  )
}

export const getMeetingTypesForAvailabilityBlock = async (
  availability_block_id: string
): Promise<MeetingType[]> => {
  return await internalFetch<MeetingType[]>(
    `/secure/availabilities/${availability_block_id}/meeting-types`
  )
}

export const requestInvoice = async (
  payload: RequestInvoiceRequest
): Promise<{ success: true }> => {
  return await internalFetch<{ success: true }>(
    `/transactions/invoice`,
    'POST',
    payload
  )
}

export const getWalletTransactions = async (
  wallet_address: string,
  token_address?: string,
  chain_id?: number,
  limit?: number,
  offset?: number,
  search_query?: string
) => {
  return await internalFetch(`/secure/transactions/wallet`, 'POST', {
    chain_id,
    limit,
    offset,
    search_query,
    token_address,
    wallet_address,
  })
}

export const getPaymentPreferences =
  async (): Promise<PaymentPreferences | null> => {
    try {
      return await internalFetch<PaymentPreferences>(
        '/secure/preferences/payment'
      )
    } catch (e) {
      if (e instanceof ApiFetchError && e.status === 404) {
        return null
      }
      throw e
    }
  }

export const createPaymentPreferences = async (
  owner_account_address: string,
  data: Partial<
    Omit<PaymentPreferences, 'id' | 'created_at' | 'owner_account_address'>
  >
): Promise<PaymentPreferences> => {
  return await internalFetch<PaymentPreferences>(
    '/secure/preferences/payment',
    'POST',
    { data }
  )
}

export const updatePaymentPreferences = async (
  owner_account_address: string,
  data: Partial<
    Omit<PaymentPreferences, 'id' | 'created_at' | 'owner_account_address'>
  >,
  oldPin?: string
): Promise<PaymentPreferences> => {
  const requestBody: { updates: typeof data; oldPin?: string } = {
    updates: data,
  }

  if (oldPin) {
    requestBody.oldPin = oldPin
  }

  return await internalFetch<PaymentPreferences>(
    '/secure/preferences/payment',
    'PATCH',
    requestBody
  )
}

export const verifyPin = async (pin: string): Promise<{ valid: boolean }> => {
  return await internalFetch<{ valid: boolean }>(
    '/secure/payments/pin/verify',
    'POST',
    {
      pin,
    }
  )
}

export const sendResetPinLink = async (
  email: string
): Promise<{ success: boolean; message: string }> => {
  return await internalFetch<{ success: boolean; message: string }>(
    '/secure/notifications/pin/reset',
    'POST',
    {
      email,
    }
  )
}

export const sendChangeEmailLink = async (
  currentEmail: string
): Promise<{ success: boolean; message: string }> => {
  return await internalFetch<{ success: boolean; message: string }>(
    '/secure/notifications/email/change',
    'POST',
    {
      currentEmail,
    }
  )
}

export const sendEnablePinLink = async (
  email: string
): Promise<{ success: boolean; message: string }> => {
  return await internalFetch<{ success: boolean; message: string }>(
    '/secure/notifications/pin/enable',
    'POST',
    {
      email,
    }
  )
}

export const changeEmailWithToken = async (
  newEmail: string,
  token: string
): Promise<{ success: boolean; message: string; account: Account }> => {
  return await internalFetch(`/secure/accounts/change-email`, 'POST', {
    newEmail,
    token,
  })
}

export const enablePinWithToken = async (
  pin: string,
  token: string
): Promise<PaymentPreferences> => {
  return await internalFetch(`/secure/preferences/payment/enable-pin`, 'POST', {
    pin,
    token,
  })
}

export const resetPinWithToken = async (
  newPin: string,
  token: string
): Promise<PaymentPreferences> => {
  return await internalFetch(`/secure/preferences/payment/reset-pin`, 'POST', {
    newPin,
    token,
  })
}

export const sendVerificationCode = async (
  email: string
): Promise<{ success: boolean; message: string }> => {
  return await internalFetch<{ success: boolean; message: string }>(
    '/secure/notifications/email/verification',
    'POST',
    { email }
  )
}

export const verifyVerificationCode = async (
  code: string
): Promise<{ success: boolean; message: string }> => {
  return await internalFetch<{ success: boolean; message: string }>(
    '/secure/notifications/email/verify',
    'POST',
    { code }
  )
}

export const getCoinConfig = async (): Promise<ICoinConfig> => {
  return await queryClient.fetchQuery(QueryKeys.coinConfig(), () =>
    internalFetch<ICoinConfig>('/integrations/onramp-money/all-config', 'GET')
  )
}
export const getUserLocale = async (): Promise<UserLocale> => {
  return (await fetch('https://ipapi.co/json/').then(res =>
    res.json()
  )) as UserLocale
}

export const createQuickPoll = async (pollData: CreateQuickPollRequest) => {
  return await internalFetch('/secure/quickpoll', 'POST', pollData)
}

export const getQuickPollById = async (pollId: string) => {
  return await internalFetch(`/secure/quickpoll/${pollId}`)
}
export const updateQuickPoll = async (
  pollId: string,
  updates: UpdateQuickPollRequest
) => {
  return await internalFetch(`/secure/quickpoll/${pollId}`, 'PUT', updates)
}

export const deleteQuickPoll = async (pollId: string) => {
  return await internalFetch(`/secure/quickpoll/${pollId}`, 'DELETE')
}

export const getQuickPollParticipants = async (pollId: string) => {
  return await internalFetch(`/secure/quickpoll/${pollId}/participants`)
}

export const addQuickPollParticipant = async (
  participantData: AddParticipantRequest
) => {
  return await internalFetch(
    `/secure/quickpoll/${participantData.poll_id}/participants`,
    'POST',
    participantData
  )
}

export interface BulkAddParticipantsRequest {
  participants: Array<{
    account_address?: string
    guest_name?: string
    guest_email: string
    participant_type: QuickPollParticipantType
    status?: QuickPollParticipantStatus
  }>
}

export const addQuickPollParticipants = async (
  pollId: string,
  participants: BulkAddParticipantsRequest['participants']
) => {
  return await internalFetch(
    `/secure/quickpoll/${pollId}/participants/bulk`,
    'POST',
    { participants }
  )
}

export const getQuickPollBySlug = async (slug: string) => {
  return await internalFetch(`/quickpoll/${slug}`)
}

export const cancelQuickPoll = async (
  pollId: string
): Promise<CancelQuickPollResponse> => {
  return await internalFetch(`/secure/quickpoll/${pollId}`, 'PATCH')
}

export const updatePollParticipantAvailability = async (
  participantId: string,
  availableSlots: AvailabilitySlot[],
  timezone?: string
) => {
  return await internalFetch(
    `/quickpoll/participants/${participantId}/availability`,
    'PATCH',
    {
      available_slots: availableSlots,
      timezone,
    }
  )
}

export const updateGuestParticipantDetails = async (
  participantId: string,
  guestName: string,
  guestEmail: string
) => {
  return await internalFetch(
    `/quickpoll/participants/${participantId}/details`,
    'PATCH',
    {
      guest_email: guestEmail,
      guest_name: guestName,
    }
  )
}

export const addOrUpdateGuestParticipantWithAvailability = async (
  pollSlug: string,
  guestEmail: string,
  availableSlots: AvailabilitySlot[],
  timezone: string,
  guestName?: string
): Promise<{ participant: QuickPollParticipant }> => {
  return await internalFetch<{ participant: QuickPollParticipant }>(
    `/quickpoll/${pollSlug}/guest-participant`,
    'POST',
    {
      available_slots: availableSlots,
      guest_email: guestEmail,
      guest_name: guestName,
      timezone,
    }
  )
}

export const getPollParticipantById = async (
  participantId: string
): Promise<QuickPollParticipant> => {
  return await internalFetch(`/quickpoll/participants/${participantId}`)
}

export const savePollParticipantCalendar = async (
  participantId: string,
  email: string,
  provider: string,
  payload?: Record<string, unknown>
) => {
  return await internalFetch(
    `/quickpoll/participants/${participantId}/calendar`,
    'POST',
    {
      email,
      payload,
      provider,
    }
  )
}

export const getPollParticipantCalendars = async (
  participantId: string
): Promise<ConnectedCalendar[]> => {
  return await internalFetch(
    `/quickpoll/participants/${participantId}/calendar`,
    'GET'
  )
}

export const getPollParticipantByIdentifier = async (
  slug: string,
  identifier: string
): Promise<QuickPollParticipant> => {
  return await internalFetch(
    `/quickpoll/${slug}/participant/${encodeURIComponent(identifier)}`
  )
}

export const getQuickPollGoogleAuthConnectUrl = async (
  state?: string | null
) => {
  return await internalFetch<ConnectResponse>(
    `/quickpoll/calendar/google/connect${state ? `?state=${state}` : ''}`
  )
}

export const getQuickPollOffice365ConnectUrl = async (
  state?: string | null
) => {
  return await internalFetch<ConnectResponse>(
    `/quickpoll/calendar/office365/connect${state ? `?state=${state}` : ''}`
  )
}

export const getQuickPolls = async (
  limit = QUICKPOLL_DEFAULT_LIMIT,
  offset = QUICKPOLL_DEFAULT_OFFSET,
  searchQuery?: string,
  ...status: PollStatus[]
): Promise<QuickPollListResponse> => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  })

  if (status.length > 0) {
    status.forEach(s => params.append('status', s))
  }

  if (searchQuery && searchQuery.trim()) {
    params.append('searchQuery', searchQuery.trim())
  }

  return await internalFetch(`/secure/quickpoll?${params}`)
}

export const getConnectedAccounts = async (): Promise<
  ConnectedAccountInfo[]
> => {
  return await internalFetch<ConnectedAccountInfo[]>(
    `/secure/accounts/connected`
  )
}

export const getStripeOnboardingLink = async (countryCode?: string) => {
  let url = `/secure/stripe/connect`
  if (countryCode) {
    url += `?country_code=${countryCode}`
  }
  return await internalFetch<{ url: string }>(url).then(res => res.url)
}

export const disconnectStripeAccount = async () => {
  return await internalFetch(`/secure/stripe/disconnect`, 'PATCH')
}

export const generateDashboardLink = async () => {
  return await internalFetch<{ url: string }>(`/secure/stripe/login`).then(
    res => res.url
  )
}

export const generateCheckoutLink = async (payload: MeetingCheckoutRequest) => {
  return await internalFetch<{ url: string }>(
    `/transactions/checkout`,
    'POST',
    payload
  ).then(res => res.url)
}

export const getTransactionById = async (
  transactionId: string
): Promise<Transaction> => {
  return await internalFetch<Transaction>(`/transactions/${transactionId}`)
}

export const getTransactionStatus = async (
  transactionId: string
): Promise<PaymentStatus> => {
  return await internalFetch<PaymentStatus>(
    `/transactions/${transactionId}/status`
  )
}

export const getStripeStatus = async (): Promise<PaymentAccountStatus> => {
  return await internalFetch<PaymentAccountStatus>(`/secure/stripe/status`)
}

export const getStripeSupportedCountries = async () => {
  return await internalFetch<StripeCountry[]>(
    `/secure/stripe/supported-countries`
  ).then(countries =>
    countries.map(country => ({
      label: country.name,
      value: country.id,
    }))
  )
}
export const getAccountPrimaryCalendarEmail = async (targetAccount: string) => {
  try {
    return await internalFetch<{ email: string }>(
      `/accounts/calendar/primary?targetAccount=${targetAccount}`
    ).then(account => account.email)
  } catch (_e) {
    return undefined
  }
}

export const getSlotByMeetingId = async (meetingId: string) => {
  try {
    const slot = await internalFetch<AccountSlot | GuestSlot>(
      `/meetings/meeting/${meetingId}/slot`
    )
    return slot
  } catch (e) {
    if (e instanceof ApiFetchError && e.status === 404) {
      return null
    }
    throw e
  }
}

export const decodeMeetingGuest = async (
  payload: GuestSlot
): Promise<MeetingDecrypted | null> => {
  try {
    return await internalFetch<MeetingDecrypted>(
      '/meetings/meeting/decrypt',
      'POST',
      payload
    ).then(res => ({
      ...res,
      created_at: new Date(res.created_at),
      end: new Date(res.end),
      start: new Date(res.start),
    }))
  } catch (_e) {
    return null
  }
}

export const getGuestSlotById = async (slotId: string) => {
  const response = await internalFetch<GuestSlot | null>(
    `/meetings/guest/${slotId}/slot`
  )
  if (!response) return null
  return {
    ...response,
    end: new Date(response.end),
    start: new Date(response.start),
  }
}

export const getEvents = async (
  referenceDate: DateTime
): Promise<CalendarEvents> => {
  return await internalFetch<CalendarEvents>(
    `/secure/calendar_events?startDate=${encodeURIComponent(
      referenceDate.startOf('month').startOf('week').toISO() || ''
    )}&endDate=${encodeURIComponent(
      referenceDate.endOf('month').endOf('week').toISO() || ''
    )}`
  )
}
export const getCalendarEvents = async (
  startDate: DateTime,
  endDate: DateTime,
  currentAccount: Account,
  onlyMeetings = true
): Promise<ExtendedCalendarEvents> => {
  const events = await internalFetch<CalendarEvents>(
    `/secure/calendar_events?startDate=${encodeURIComponent(
      startDate.toISO() || ''
    )}&endDate=${encodeURIComponent(
      endDate.toISO() || ''
    )}&onlyMeetings=${onlyMeetings}`
  )
  const preProcessedMeetWithEvents = meetWithSeriesPreprocessors(
    events.mwwEvents,
    startDate,
    endDate
  )
  const decryptedMwwEvents = await Promise.all(
    preProcessedMeetWithEvents.map(async slot => {
      try {
        const decrypted = await decodeMeeting(slot, currentAccount)
        return { ...slot, decrypted }
      } catch (_e) {
        return { ...slot, decrypted: null }
      }
    })
  )
  return {
    calendarEvents: events.calendarEvents.map(event => ({
      ...event,
      end: new Date(event.end),
      start: new Date(event.start),
    })),
    mwwEvents: decryptedMwwEvents.filter(
      (event): event is DashBoardMwwEvents => event.decrypted !== null
    ),
  }
}

export const getSlotInstanceById = async (
  slotId: string,
  signal?: AbortSignal
): Promise<SlotInstance | null> => {
  try {
    return await internalFetch<SlotInstance>(
      `/meetings/slot/instance/${slotId}`,
      'GET',
      undefined,
      { signal }
    ).then(slot => ({
      ...slot,
      end: new Date(slot.end),
      start: new Date(slot.start),
    }))
  } catch (e) {
    if (e instanceof ApiFetchError && e.status === 404) {
      return null
    }
    throw e
  }
}

export const addOrUpdateWebcal = async (
  url: string
): Promise<WebCalResponse> => {
  return await internalFetch<WebCalResponse>(
    `/secure/calendar_integrations/webcal`,
    'POST',
    {
      url,
    }
  )
}

export const updateCalendarRsvpStatus = async (
  calendarId: string,
  eventId: string,
  rsvpStatus: AttendeeStatus,
  attendeeEmail: string,
  abortSignal?: AbortSignal
) => {
  return await internalFetch(
    `/secure/calendar/${calendarId}/${eventId}/rsvp`,
    'PATCH',
    {
      attendee_email: attendeeEmail,
      rsvp_status: rsvpStatus,
    } as UpdateCalendarEventRequest,
    {
      signal: abortSignal,
    }
  )
}

export const updateCalendarEvent = async (
  event: UnifiedEvent
): Promise<UnifiedEvent> => {
  return await internalFetch<UnifiedEvent, UnifiedEvent>(
    `/secure/calendar/event`,
    'PATCH',
    event
  )
}

export const deleteCalendarEvent = async (
  calendarId: string,
  eventId: string
) => {
  return await internalFetch(
    `/secure/calendar/${calendarId}/${eventId}`,
    'DELETE',
    undefined
  )
}

export const parsedDecryptedParticipants = async (
  instance_id: string,
  participants: ParseParticipantInfo[]
) => {
  return internalFetch<ParseParticipantInfo[], ParseParticipantsRequest>(
    `/secure/meetings/instances/${instance_id}/participants`,
    'POST',
    { participants }
  )
}
