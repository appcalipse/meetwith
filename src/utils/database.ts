import * as Sentry from '@sentry/nextjs'
import { type SupabaseClient, createClient } from '@supabase/supabase-js'
import {
  currenciesMap,
  Currency,
  extractOnRampStatus,
  getOnrampMoneyTokenAddress,
} from '@utils/services/onramp.money'
import * as argon2 from 'argon2'
import CryptoJS from 'crypto-js'
import { add, addMinutes, addMonths, isAfter, sub } from 'date-fns'
import EthCrypto, {
  decryptWithPrivateKey,
  Encrypted,
  encryptWithPublicKey,
} from 'eth-crypto'
import { GaxiosError } from 'gaxios'
import { calendar_v3 } from 'googleapis'
import { DateTime, Interval } from 'luxon'
import { validate } from 'uuid'

import {
  Account,
  AccountPreferences,
  BaseMeetingType,
  DiscordConnectedAccounts,
  MeetingType,
  PaidMeetingTypes,
  PaymentPreferences,
  PublicAccount,
  SimpleAccountInfo,
  TgConnectedAccounts,
  TimeRange,
} from '@/types/Account'
import {
  AccountNotifications,
  NotificationChannel,
  VerificationChannel,
} from '@/types/AccountNotifications'
import { AvailabilityBlock } from '@/types/availability'
import {
  CalendarSyncInfo,
  ConnectedCalendar,
  ConnectedCalendarCore,
} from '@/types/CalendarConnections'
import {
  getChainDisplayName,
  getChainInfo,
  getTokenAddress,
  resolveTokenSymbolFromAddress,
  SupportedChain,
} from '@/types/chains'
import {
  ContactSearch,
  DBContact,
  DBContactInvite,
  DBContactLean,
  SingleDBContact,
  SingleDBContactInvite,
} from '@/types/Contacts'
import { DiscordAccount } from '@/types/Discord'
import {
  CreateGroupsResponse,
  EmptyGroupsResponse,
  GetGroupsFullRawResponse,
  GetGroupsFullResponse,
  Group,
  GroupInviteFilters,
  GroupInvites,
  GroupInvitesResponse,
  GroupMemberQuery,
  GroupUsers,
  MemberType,
  UpdateGroupPayload,
  UserGroups,
} from '@/types/Group'
import {
  ConferenceMeeting,
  DBSlot,
  ExtendedDBSlot,
  GroupMeetingRequest,
  GroupNotificationType,
  MeetingAccessType,
  MeetingInfo,
  MeetingProvider,
  MeetingRepeat,
  MeetingVersion,
  ParticipantMappingType,
  TimeSlotSource,
} from '@/types/Meeting'
import {
  ParticipantBaseInfo,
  ParticipantInfo,
  ParticipantType,
} from '@/types/ParticipantInfo'
import {
  ConfirmCryptoTransactionRequest,
  CreateMeetingTypeRequest,
  GroupInviteNotifyRequest,
  MeetingCancelSyncRequest,
  MeetingCreationRequest,
  MeetingCreationSyncRequest,
  MeetingUpdateRequest,
} from '@/types/Requests'
import { Subscription } from '@/types/Subscription'
import { GroupMembersRow, Row, TablesInsert } from '@/types/supabase'
import { TelegramConnection } from '@/types/Telegram'
import {
  GateConditionObject,
  GateUsage,
  GateUsageType,
} from '@/types/TokenGating'
import {
  Address,
  BaseMeetingSession,
  BaseTransaction,
  MeetingSession,
  OnrampMoneyWebhook,
  Transaction,
} from '@/types/Transactions'
import { PaymentNotificationType } from '@/utils/constants'
import {
  NO_MEETING_TYPE,
  PaymentDirection,
  PaymentStatus,
  PaymentType,
  TokenType,
} from '@/utils/constants/meeting-types'
import {
  AccountNotFoundError,
  AdminBelowOneError,
  AllMeetingSlotsUsedError,
  AlreadyGroupMemberError,
  AvailabilityBlockNotFoundError,
  ChainNotFound,
  ContactAlreadyExists,
  ContactInviteNotForAccount,
  ContactInviteNotFound,
  ContactNotFound,
  CouponAlreadyUsed,
  CouponExpired,
  CouponNotValid,
  DefaultAvailabilityBlockError,
  GateConditionNotValidError,
  GateInUseError,
  GroupCreationError,
  GroupNotExistsError,
  InvalidAvailabilityBlockError,
  IsGroupAdminError,
  LastMeetingTypeError,
  MeetingChangeConflictError,
  MeetingCreationError,
  MeetingDetailsModificationDenied,
  MeetingNotFoundError,
  MeetingSessionNotFoundError,
  MeetingSlugAlreadyExists,
  MeetingTypeNotFound,
  NoActiveSubscription,
  NotGroupAdminError,
  NotGroupMemberError,
  OwnInviteError,
  SubscriptionNotCustom,
  TimeNotAvailableError,
  TransactionIsRequired,
  TransactionNotFoundError,
  UnauthorizedError,
  UploadError,
} from '@/utils/errors'
import { ParticipantInfoForNotification } from '@/utils/notification_helper'
import { getTransactionFeeThirdweb } from '@/utils/transaction.helper'
import { thirdWebClient } from '@/utils/user_manager'

import {
  generateDefaultAvailabilities,
  generateDefaultMeetingType,
  generateEmptyAvailabilities,
  noNoReplyEmailForAccount,
} from './calendar_manager'
import {
  extractMeetingDescription,
  getBaseEventId,
  updateMeetingServer,
} from './calendar_sync_helpers'
import { apiUrl, appUrl, isProduction, WEBHOOK_URL } from './constants'
import { ChannelType, ContactStatus } from './constants/contact'
import { decryptContent, encryptContent } from './cryptography'
import { addRecurrence } from './date_helper'
import {
  sendCryptoDebitEmail,
  sendReceiptEmail,
  sendSessionBookingIncomeEmail,
} from './email_helper'
import { CalendarBackendHelper } from './services/calendar.backend.helper'
import { CalendarService } from './services/calendar.service.types'
import { getConnectedCalendarIntegration } from './services/connected_calendars.factory'
import { isTimeInsideAvailabilities } from './slots.helper'
import { isProAccount } from './subscription_manager'
import { isConditionValid } from './token.gate.service'
import { ellipsizeAddress } from './user_manager'
import { isValidEVMAddress } from './validations'

const PIN_SALT = process.env.PIN_SALT

// TODO: better typing
type SupabaseRecords = { ready: boolean } & Record<string, SupabaseClient>
const db: SupabaseRecords = {
  ready: false,
} as SupabaseRecords

const initDB = () => {
  if (!db.ready) {
    db.supabase = createClient(
      process.env.NEXT_SUPABASE_URL!,
      process.env.NEXT_SUPABASE_KEY!
    )
    db.ready = true
  }

  return db
}

initDB()

const initAccountDBForWallet = async (
  address: string,
  signature: string,
  timezone: string,
  nonce: number,
  is_invited?: boolean
): Promise<Account> => {
  if (!isValidEVMAddress(address)) {
    throw new Error('Invalid address')
  }

  try {
    //make sure account doesn't exist
    const account = await getAccountFromDB(address)
    if (!account.is_invited) {
      return account
    }
    return await updateAccountFromInvite(address, signature, timezone, nonce)
  } catch (error) {}

  const newIdentity = EthCrypto.createIdentity()

  const encryptedPvtKey = encryptContent(signature, newIdentity.privateKey)

  const createdUserAccount = await db.supabase.from('accounts').insert([
    {
      address: address.toLowerCase(),
      internal_pub_key: is_invited
        ? process.env.NEXT_PUBLIC_SERVER_PUB_KEY!
        : newIdentity.publicKey,
      encoded_signature: encryptedPvtKey,
      nonce,
      is_invited: is_invited || false,
    },
  ])

  if (createdUserAccount.error) {
    throw new Error(createdUserAccount.error.message)
  }
  const defaultMeetingType = generateDefaultMeetingType()
  const defaultAvailabilities = generateEmptyAvailabilities()

  const preferences: AccountPreferences = {
    availableTypes: [defaultMeetingType],
    description: '',
    availabilities: defaultAvailabilities,
    socialLinks: [],
    timezone,
    meetingProviders: [MeetingProvider.GOOGLE_MEET],
  }

  if (!createdUserAccount.data || createdUserAccount.data.length === 0) {
    throw new Error('User account not created')
  }
  const user_account = createdUserAccount.data[0]

  try {
    const responsePrefs = await db.supabase.from('account_preferences').insert({
      ...preferences,
      owner_account_address: user_account.address,
    })

    if (responsePrefs.error) {
      Sentry.captureException(responsePrefs.error)
      throw new Error("Account preferences couldn't be created")
    }

    // Create default availability block for new users
    const defaultWeeklyAvailability = generateDefaultAvailabilities()

    const defaultBlock = await createAvailabilityBlock(
      user_account.address,
      'Default',
      timezone,
      defaultWeeklyAvailability,
      true // Set as default
    )

    // Update account preferences to reference the default availability block
    await db.supabase
      .from('account_preferences')
      .update({
        availaibility_id: defaultBlock.id,
      })
      .eq('owner_account_address', user_account.address)

    user_account.preferences = preferences
    user_account.is_invited = is_invited || false

    return user_account
  } catch (error) {
    Sentry.captureException(error)
    throw new Error("Account couldn't be created")
  }
}

const updateAccountFromInvite = async (
  account_address: string,
  signature: string,
  timezone: string,
  nonce: number
): Promise<Account> => {
  const existingAccount = await getAccountFromDB(account_address)
  if (!existingAccount.is_invited) {
    // do not screw up accounts that already have been set up
    return existingAccount
  }

  //fetch this before changing internal pub key
  const currentMeetings = await getSlotsForAccount(account_address)

  const newIdentity = EthCrypto.createIdentity()

  const encryptedPvtKey = encryptContent(signature, newIdentity.privateKey)

  const { error } = await db.supabase.from<Account>('accounts').upsert(
    [
      {
        address: account_address.toLowerCase(),
        internal_pub_key: newIdentity.publicKey,
        encoded_signature: encryptedPvtKey,
        nonce,
        is_invited: false,
      },
    ],
    { onConflict: 'address' }
  )

  if (error) {
    throw new Error(error.message)
  }

  const account = await getAccountFromDB(account_address)
  account.preferences.timezone = timezone

  await updateAccountPreferences(account)

  for (const slot of currentMeetings) {
    try {
      const encrypted = slot.meeting_info_encrypted as Encrypted

      const privateInfo = await decryptWithPrivateKey(
        process.env.NEXT_SERVER_PVT_KEY!,
        encrypted
      )
      const newPvtInfo = await encryptWithPublicKey(
        newIdentity.publicKey,
        privateInfo
      )

      const { error } = await db.supabase
        .from('slots')
        .update({
          meeting_info_encrypted: newPvtInfo,
        })
        .match({ id: slot.id })

      if (error) {
        throw new Error(error.message)
      }
    } catch (err) {
      //if any fail, don't fail them all
    }
  }

  return account
}

const workMeetingTypeGates = async (meetingTypes: MeetingType[]) => {
  const toAdd: GateUsage[] = []
  const toRemove = []

  for (const meetingType of meetingTypes) {
    // clean all gate usages for the meeting types
    toRemove.push(meetingType.id)

    // re add for those who were defined in the request
    if (meetingType.scheduleGate) {
      toAdd.push({
        type: GateUsageType.MeetingSchedule,
        gate_id: meetingType.scheduleGate,
        gated_entity_id: meetingType.id,
      })
    } else {
    }
  }

  if (toRemove.length > 0) {
    const removal = await db.supabase
      .from('gate_usage')
      .delete()
      .match({ type: GateUsageType.MeetingSchedule })
      .or(toRemove.map(id => `gated_entity_id.eq.${id}`).join(','))

    if (removal.error) {
      Sentry.captureException(removal.error)
      //TODO: handle error
    }
  }

  if (toAdd.length > 0) {
    const additions = await db.supabase.from('gate_usage').insert(toAdd)

    if (additions.error) {
      Sentry.captureException(additions.error)
      //TODO: handle error
    }
  }
}

const findAccountByIdentifier = async (
  identifier: string
): Promise<Array<Account>> => {
  const { data, error } = await db.supabase.rpc<Account>('find_account', {
    identifier: identifier,
  })
  if (error) {
    Sentry.captureException(error)
    return []
  }
  return data?.length > 0
    ? await Promise.all(
        data?.map(async account => {
          account.preferences = await getAccountPreferences(
            account.address.toLowerCase()
          )
          return account
        })
      )
    : []
}

const updateAccountPreferences = async (account: Account): Promise<Account> => {
  const preferences = { ...account.preferences! }
  preferences.name = preferences.name?.trim()
  preferences.description = preferences.description?.trim()
  preferences.socialLinks = preferences.socialLinks?.map(link => ({
    ...link,
    url: link.url?.trim(),
  }))

  await workMeetingTypeGates(account.preferences.availableTypes || [])

  const responsePrefsUpdate = await db.supabase
    .from('account_preferences')
    .update({
      description: preferences.description,
      timezone: preferences.timezone,
      availabilities: preferences.availabilities,
      name: preferences.name,
      socialLinks: preferences.socialLinks,
      availableTypes: preferences.availableTypes,
      meetingProviders: preferences.meetingProviders,
    })
    .match({ owner_account_address: account.address.toLowerCase() })

  if (responsePrefsUpdate.error) {
    Sentry.captureException(responsePrefsUpdate.error)
    throw new Error("Account preferences couldn't be updated")
  }

  account.preferences = responsePrefsUpdate.data?.[0] as AccountPreferences

  account.subscriptions = await getSubscriptionFromDBForAccount(account.address)

  return account
}

const updatePreferenceAvatar = async (
  address: string,
  filename: string,
  buffer: Buffer,
  mimeType: string
) => {
  const contentType = mimeType
  const file = `uploads/${Date.now()}-${filename}`
  const { error } = await db.supabase.storage
    .from('avatars')
    .upload(file, buffer, {
      contentType,
      upsert: true,
    })

  if (error) {
    Sentry.captureException(error)
    throw new UploadError(
      'Unable to upload avatar. Please try again or contact support if the problem persists.'
    )
  }

  const { data } = db.supabase.storage.from('avatars').getPublicUrl(file)

  const publicUrl = data?.publicURL
  if (!publicUrl) {
    Sentry.captureException(new Error('Public URL is undefined after upload'))
    throw new UploadError(
      "Avatar upload completed but couldn't generate preview URL. Please refresh and try again."
    )
  }

  const { error: updateError } = await db.supabase
    .from('account_preferences')
    .update({ avatar_url: publicUrl })
    .eq('owner_account_address', address.toLowerCase())
  if (updateError) {
    Sentry.captureException(updateError)
    throw new UploadError(
      "Avatar uploaded successfully but couldn't update your profile. Please refresh and try again."
    )
  }

  return publicUrl
}

const getAccountNonce = async (identifier: string): Promise<number> => {
  const query = validate(identifier)
    ? `id.eq.${identifier}`
    : `address.ilike.${identifier.toLowerCase()},internal_pub_key.eq.${identifier}`

  const { data, error } = await db.supabase
    .from('accounts')
    .select('nonce')
    .or(query)
  if (!error && data.length > 0) {
    return data[0].nonce
  }

  throw new AccountNotFoundError(identifier)
}

export const getAccountPreferences = async (
  owner_account_address: string
): Promise<AccountPreferences> => {
  const { data: account_preferences, error: account_preferences_error } =
    await db.supabase
      .from('account_preferences')
      .select(
        `
        *,
        default_availability:availabilities!account_preferences_availaibility_id_fkey(
          id,
          title,
          timezone,
          weekly_availability,
          created_at,
          updated_at
        )
      `
      )
      .eq('owner_account_address', owner_account_address.toLowerCase())
      .single()
  if (account_preferences_error || !account_preferences) {
    console.error(account_preferences_error)
    throw new Error("Couldn't get account's preferences")
  }

  // Transform the joined data to match the expected format
  const { default_availability, ...preferences } = account_preferences

  if (default_availability) {
    preferences.availabilities = default_availability.weekly_availability
    preferences.timezone = default_availability.timezone
  } else {
    preferences.availabilities = generateEmptyAvailabilities()
  }

  return preferences as AccountPreferences
}

async function getExistingAccountsFromDB(
  addresses: string[],
  fullInformation: true
): Promise<Account[]>
async function getExistingAccountsFromDB(
  addresses: string[],
  fullInformation?: false
): Promise<SimpleAccountInfo[]>
async function getExistingAccountsFromDB(
  addresses: string[],
  fullInformation?: boolean
): Promise<SimpleAccountInfo[] | Account[]> {
  let queryString = `
      address,
      internal_pub_key
    `
  if (fullInformation) {
    queryString += `
      ,calendars: connected_calendars(provider),
      preferences: account_preferences(
      *,
      default_availability:availabilities!account_preferences_availaibility_id_fkey(
          id,
          title,
          timezone,
          weekly_availability,
          created_at,
          updated_at
        )
      )
      `
  }

  const { data, error } = await db.supabase
    .from('accounts')
    .select(queryString)
    .in(
      'address',
      addresses.map(address => address.toLowerCase())
    )
  if (error) {
    throw new Error(error.message)
  }

  for (const account of data) {
    if (account.calendars) {
      account.isCalendarConnected = account?.calendars?.length > 0
      const { default_availability, ...preferences } = account.preferences
      if (default_availability) {
        preferences.availabilities = default_availability.weekly_availability
        preferences.timezone = default_availability.timezone
      }
      account.preferences = preferences
      delete account.calendars
    }
  }

  return data
}

const getAccountFromDB = async (
  identifier: string,
  includePrivateInformation?: boolean
): Promise<Account> => {
  const { data, error } = await db.supabase.rpc<Account>('fetch_account', {
    identifier: identifier.toLowerCase(),
  })
  if (data) {
    const account = Array.isArray(data) ? data[0] : data
    try {
      account.preferences = await getAccountPreferences(
        account.address.toLowerCase()
      )
    } catch (e) {
      Sentry.captureException(e)
      throw new Error("Couldn't get account's preferences")
    }
    account.subscriptions = await getSubscriptionFromDBForAccount(
      account.address
    )
    if (includePrivateInformation) {
      account.discord_account = await getDiscordAccount(account.address)
    }
    return account
  } else if (error) {
    throw new Error(error.message)
  }
  throw new AccountNotFoundError(identifier)
}

const getAccountFromDBPublic = async (
  identifier: string
): Promise<PublicAccount> => {
  const account: PublicAccount = await getAccountFromDB(identifier)
  const meetingTypes = await getMeetingTypes(account.address, 100, 0)
  account.meetingTypes = meetingTypes.map(val => ({
    ...val,
    calendars: undefined,
  }))
  return account
}

const getSlotsForAccount = async (
  account_address: string,
  start?: Date,
  end?: Date,
  limit?: number,
  offset?: number
): Promise<DBSlot[]> => {
  const account = await getAccountFromDB(account_address)

  const _start = start ? start.toISOString() : '1970-01-01'
  const _end = end ? end.toISOString() : '2500-01-01'
  const { data, error } = await db.supabase
    .from('slots')
    .select()
    .eq('account_address', account.address)
    .or(
      `and(start.gte.${_start},end.lte.${_end}),and(start.lte.${_start},end.gte.${_end}),and(start.gt.${_start},end.lte.${_end}),and(start.gte.${_start},end.lt.${_end})`
    )
    .range(offset || 0, (offset || 0) + (limit ? limit - 1 : 999999999999999))
    .order('start')

  if (error) {
    throw new Error(error.message)
    // //TODO: handle error
  }

  return data || []
}

const getSlotsForAccountMinimal = async (
  account_address: string,
  start?: Date,
  end?: Date,
  limit?: number,
  offset?: number
): Promise<DBSlot[]> => {
  const _start = start ? start.toISOString() : '1970-01-01'
  const _end = end ? end.toISOString() : '2500-01-01'
  const { data, error } = await db.supabase
    .from('slots')
    .select()
    .eq('account_address', account_address)
    .or(
      `and(start.gte.${_start},end.lte.${_end}),and(start.lte.${_start},end.gte.${_end}),and(start.gt.${_start},end.lte.${_end}),and(start.gte.${_start},end.lt.${_end})`
    )
    .range(offset || 0, (offset || 0) + (limit ? limit - 1 : 999999999999999))
    .order('start')

  if (error) {
    throw new Error(error.message)
    // //TODO: handle error
  }

  return data || []
}
const updateRecurringSlots = async (identifier: string) => {
  const account = await getAccountFromDB(identifier)
  const _end = new Date().toISOString()
  const { data: allSlots, error } = await db.supabase
    .from('slots')
    .select()
    .eq('account_address', account.address)
    .lte('end', _end)
    .neq('recurrence', MeetingRepeat.NO_REPEAT)
  if (error) {
    return
  }
  if (allSlots) {
    const toUpdate = []
    for (const data of allSlots) {
      const slot = data as DBSlot
      const interval = addRecurrence(
        new Date(slot.start),
        new Date(slot.end),
        slot.recurrence
      )
      const newSlot = { ...slot, start: interval.start, end: interval.end }
      toUpdate.push(newSlot)
    }
    if (toUpdate.length > 0) {
      await db.supabase.from('slots').upsert(toUpdate)
    }
  }
}
const updateAllRecurringSlots = async () => {
  const _end = new Date().toISOString()
  const { data: allSlots, error } = await db.supabase
    .from('slots')
    .select()
    .lte('end', _end)
    .neq('recurrence', MeetingRepeat.NO_REPEAT)
  if (error) {
    return
  }
  if (allSlots) {
    const toUpdate = []
    for (const data of allSlots) {
      const slot = data as DBSlot
      const interval = addRecurrence(
        new Date(slot.start),
        new Date(slot.end),
        slot.recurrence
      )
      const newSlot = { ...slot, start: interval.start, end: interval.end }
      toUpdate.push(newSlot)
    }
    if (toUpdate.length > 0) {
      await db.supabase.from('slots').upsert(toUpdate)
    }
  }
}

const getSlotsForDashboard = async (
  identifier: string,
  end: Date,
  limit: number,
  offset: number
): Promise<ExtendedDBSlot[]> => {
  const account = await getAccountFromDB(identifier)

  const _end = end.toISOString()

  const { data, error } = await db.supabase
    .from('slots')
    .select()
    .eq('account_address', account.address)
    .gte('end', _end)
    .range(offset, offset + limit)
    .order('start')

  if (error) {
    throw new Error(error.message)
    // //TODO: handle error
  }
  for (const slot of data) {
    if (!slot.id) continue
    const conferenceMeeting = await getConferenceDataBySlotId(slot.id)
    slot.conferenceData = conferenceMeeting
  }
  return data || []
}
const getSlotsByIds = async (slotIds: string[]): Promise<DBSlot[]> => {
  const { data, error } = await db.supabase
    .from('slots')
    .select()
    .in('id', slotIds)

  if (error) {
    throw new Error(error.message)
  }
  return data || []
}

const isSlotAvailable = async (
  account_address: string,
  start: Date,
  end: Date,
  meetingTypeId: string,
  txHash?: Address | null,
  meeting_id?: string
): Promise<boolean> => {
  if (meetingTypeId !== NO_MEETING_TYPE) {
    const meetingType = await getMeetingTypeFromDB(meetingTypeId)
    const minTime = meetingType.min_notice_minutes
    if (meetingType?.plan) {
      if (meeting_id) {
        const meetingSession = await getMeetingSessionByMeetingId(
          meeting_id,
          meetingTypeId
        )
        if (!meetingSession) {
          throw new MeetingSessionNotFoundError(meeting_id)
        }
      } else {
        if (!txHash) {
          throw new TransactionIsRequired()
        }
        const transaction = await getTransactionBytxHashAndMeetingType(
          txHash,
          meetingTypeId
        )
        const meetingSessions = transaction.meeting_sessions || []
        const isAnyMeetingSlotFree = meetingSessions.some(
          session => session.used_at === null
        )
        if (!isAnyMeetingSlotFree) {
          throw new AllMeetingSlotsUsedError()
        }
      }
    }

    if (isAfter(addMinutes(new Date(), minTime), start)) {
      return false
    }
  }
  const interval = Interval.fromDateTimes(
    DateTime.fromJSDate(start),
    DateTime.fromJSDate(end)
  )
  if (!interval.isValid) {
    return false
  }
  const busySlots = (
    await CalendarBackendHelper.getBusySlotsForAccount(
      account_address,
      interval.start?.startOf('day').toJSDate(),
      interval.end?.endOf('day').toJSDate()
    )
  ).map(slot =>
    Interval.fromDateTimes(
      DateTime.fromJSDate(new Date(slot.start)),
      DateTime.fromJSDate(new Date(slot.end))
    )
  )
  const isAvailable = busySlots.every(slot => !slot.overlaps(interval))
  return isAvailable
}

const getMeetingFromDB = async (slot_id: string): Promise<DBSlot> => {
  const { data, error } = await db.supabase
    .from<DBSlot>('slots')
    .select()
    .eq('id', slot_id)

  if (error) {
    throw new Error(error.message)
    // todo handle error
  }

  if (data.length == 0) {
    throw new MeetingNotFoundError(slot_id)
  }

  const dbMeeting = data[0]
  const meeting: DBSlot = dbMeeting

  return meeting
}

const getConferenceMeetingFromDB = async (
  meetingId: string
): Promise<ConferenceMeeting> => {
  const { data, error } = await db.supabase
    .from<ConferenceMeeting>('meetings')
    .select()
    .eq('id', meetingId)

  if (error) {
    throw new Error(error.message)
  }

  if (data.length == 0) {
    throw new MeetingNotFoundError(meetingId)
  }

  const dbMeeting = data[0]
  return dbMeeting
}

const getMeetingsFromDB = async (slotIds: string[]): Promise<DBSlot[]> => {
  const { data, error } = await db.supabase
    .from('slots')
    .select()
    .in('id', slotIds)

  if (error) {
    throw new Error(error.message)
    // todo handle error
  }

  if (data.length == 0) return []

  const meetings = []
  for (const dbMeeting of data) {
    const meeting: DBSlot = dbMeeting

    meetings.push(meeting)
  }

  return meetings
}
const getConferenceDataBySlotId = async (
  slotId: string
): Promise<ConferenceMeeting> => {
  const { data, error } = await db.supabase
    .from<ConferenceMeeting>('meetings')
    .select('*')
    .filter('slots', 'cs', [`{${slotId}}`])
  if (error) {
    throw new Error(error.message)
  }

  return data[0]
}
const handleGuestCancel = async (
  metadata: string,
  slotId: string,
  timezone: string,
  reason?: string
) => {
  metadata = decryptContent(process.env.NEXT_PUBLIC_SERVER_PUB_KEY!, metadata)
  const participantGuestInfo: ParticipantInfoForNotification[] =
    JSON.parse(metadata)
  const actingGuest = participantGuestInfo.find(p => p.slot_id === slotId)
  if (!actingGuest) {
    throw new UnauthorizedError()
  }

  const conferenceMeeting = await getConferenceDataBySlotId(slotId)
  if (!conferenceMeeting) {
    throw new MeetingNotFoundError(slotId)
  }
  let addressesToRemove: Array<string> = []
  let guestsToRemove: Array<ParticipantInfo> = []
  let slotsToRemove: Array<string> = [slotId]
  // If the guest scheduled the meeting cancel for all invitee
  // For one on one meetings cancel meetings entirely for other user
  if (
    actingGuest.type === ParticipantType.Scheduler ||
    conferenceMeeting.slots?.length <= 2
  ) {
    const slotData = await getSlotsByIds(
      conferenceMeeting.slots.filter(s => s !== slotId)
    )
    addressesToRemove = slotData.map(s => s.account_address)
    await db.supabase.from('slots').delete().in('id', conferenceMeeting.slots)
    slotsToRemove = conferenceMeeting.slots
    guestsToRemove = participantGuestInfo
  }
  await saveConferenceMeetingToDB({
    ...conferenceMeeting,
    slots: conferenceMeeting.slots.filter(s => !slotsToRemove.includes(s)),
  })

  const body: MeetingCancelSyncRequest = {
    participantActing: actingGuest,
    addressesToRemove,
    guestsToRemove,
    meeting_id: conferenceMeeting.id,
    start: new Date(conferenceMeeting.start),
    end: new Date(conferenceMeeting.end),
    created_at: new Date(conferenceMeeting.created_at!),
    timezone,
    reason,
  }
  // Doing notifications and syncs asynchronously
  fetch(`${apiUrl}/server/meetings/syncAndNotify`, {
    method: 'DELETE',
    body: JSON.stringify(body),
    headers: {
      'X-Server-Secret': process.env.SERVER_SECRET!,
      'Content-Type': 'application/json',
    },
  })
}
const handleMeetingCancelSync = async (
  decryptedMeetingData: MeetingInfo,
  actorSlotId: string
) => {
  const conferenceMeeting = await getConferenceMeetingFromDB(
    decryptedMeetingData.meeting_id
  )
  if (!conferenceMeeting) {
    throw new MeetingNotFoundError(decryptedMeetingData.meeting_id)
  }
  // The conference meeting is the authoritative source of truth for which slots exist
  // Update the meeting data to match the conference reality

  // Fetch all slots that currently exist in the conference meeting
  const { error, data: oldSlots } = await db.supabase
    .from<DBSlot>('slots')
    .select()
    .in('id', conferenceMeeting.slots)
  if (error) {
    throw new Error(error.message)
  }

  // Find orphaned slots: slots that exist in DB but have no corresponding participant data
  const existingSlotIds = oldSlots.map(slot => slot.id!)
  const missingParticipantSlots = existingSlotIds.filter(
    slotId => !decryptedMeetingData.participants.some(p => p.slot_id === slotId)
  )
  if (missingParticipantSlots.length > 0) {
    console.warn(
      `Found orphaned slots without corresponding participants, deleting them: ${missingParticipantSlots.join(
        ', '
      )}`
    )

    const { error: deleteOrphanedError } = await db.supabase
      .from('slots')
      .delete()
      .in('id', missingParticipantSlots)

    if (deleteOrphanedError) {
      console.warn(
        'Failed to delete orphaned slots:',
        deleteOrphanedError.message
      )
    }
    conferenceMeeting.slots = conferenceMeeting.slots.filter(
      slotId => !missingParticipantSlots.includes(slotId)
    )
    await saveConferenceMeetingToDB(conferenceMeeting)
    const validSlots = oldSlots.filter(
      slot => !missingParticipantSlots.includes(slot.id!)
    )
    oldSlots.length = 0
    oldSlots.push(...validSlots)
  }

  // Find and clean up any orphaned slots that might exist for this meeting
  // but are no longer in the conference (edge case handling)
  const originalSlotIds = decryptedMeetingData.related_slot_ids.concat([
    actorSlotId,
  ])
  //e7c8f220-f2d8-43e3-9189-4b71f60e148c
  const orphanedSlotIds = originalSlotIds.filter(
    id => !conferenceMeeting.slots.includes(id)
  )

  if (orphanedSlotIds.length > 0) {
    console.warn(
      `Found orphaned slots that are no longer in the conference: ${orphanedSlotIds.join(
        ', '
      )}`
    )
    const { error: deleteError } = await db.supabase
      .from('slots')
      .delete()
      .in('id', orphanedSlotIds)

    if (deleteError) {
      console.warn(
        'Failed to delete orphaned slots:',
        deleteError.message,
        orphanedSlotIds
      )
    }
  }
  decryptedMeetingData.related_slot_ids = conferenceMeeting.slots.filter(
    id => id !== actorSlotId // Exclude the current slot from related_slot_ids
  )
  decryptedMeetingData.participants = decryptedMeetingData.participants.filter(
    p => conferenceMeeting?.slots.includes(p.slot_id!)
  )
  // Update all existing conference slots with the synced meeting data
  for (const slot of oldSlots) {
    const account = await getAccountFromDB(slot.account_address)
    await db.supabase
      .from('slots')
      .update({
        meeting_info_encrypted: await encryptWithPublicKey(
          account.internal_pub_key,
          JSON.stringify(decryptedMeetingData)
        ),
        // Don't increment version for background sync operations
        // The version was already incremented during the original cancellation
      })
      .eq('id', slot.id)
  }
}
const deleteMeetingFromDB = async (
  participantActing: ParticipantBaseInfo,
  slotIds: string[],
  guestsToRemove: ParticipantInfo[],
  meeting_id: string,
  timezone: string,
  reason?: string,
  title?: string
) => {
  if (!slotIds?.length) throw new Error('No slot ids provided')

  const oldSlots: DBSlot[] =
    (await db.supabase.from<DBSlot>('slots').select().in('id', slotIds)).data ||
    []

  const { error } = await db.supabase.from('slots').delete().in('id', slotIds)

  if (error) {
    throw new Error(error.message)
  }

  const body: MeetingCancelSyncRequest = {
    participantActing,
    addressesToRemove: oldSlots.map(s => s.account_address),
    guestsToRemove,
    meeting_id,
    start: new Date(oldSlots[0].start),
    end: new Date(oldSlots[0].end),
    created_at: new Date(oldSlots[0].created_at!),
    title,
    timezone,
    reason,
  }
  // Doing notifications and syncs asynchronously
  fetch(`${apiUrl}/server/meetings/syncAndNotify`, {
    method: 'DELETE',
    body: JSON.stringify(body),
    headers: {
      'X-Server-Secret': process.env.SERVER_SECRET!,
      'Content-Type': 'application/json',
    },
  })
}

const saveMeeting = async (
  participantActing: ParticipantBaseInfo,
  meeting: MeetingCreationRequest
): Promise<DBSlot> => {
  if (
    new Set(
      meeting.participants_mapping.map(p => p.account_address || p.guest_email)
    ).size !== meeting.participants_mapping.length
  )
    //means there are duplicate participants
    throw new MeetingCreationError()

  const slots = []
  let meetingResponse: Partial<DBSlot> = {}
  let index = 0
  let i = 0

  const existingAccounts = await getExistingAccountsFromDB(
    meeting.participants_mapping.map(p => p.account_address!)
  )

  const ownerParticipants =
    meeting.participants_mapping.filter(
      p => p.type === ParticipantType.Owner
    ) || []

  const ownerAccounts =
    ownerParticipants.length > 0
      ? await Promise.all(
          ownerParticipants.map(
            async owner => await getAccountFromDB(owner.account_address!)
          )
        )
      : []

  const schedulerAccount =
    meeting.participants_mapping.find(
      p => p.type === ParticipantType.Scheduler
    ) || null

  const ownerIsNotScheduler = Boolean(
    schedulerAccount &&
      !ownerParticipants.some(
        val =>
          val?.account_address?.toLowerCase() ===
          schedulerAccount.account_address
      )
  )

  if (ownerIsNotScheduler && schedulerAccount) {
    const gatesResponse = await db.supabase
      .from('gate_usage')
      .select()
      .eq('gated_entity_id', meeting.meetingTypeId)
      .eq('type', GateUsageType.MeetingSchedule)

    if (gatesResponse.data && gatesResponse.data.length > 0) {
      const gate = await getGateCondition(gatesResponse.data[0].gate_id)
      const valid = await isConditionValid(
        gate!.definition,
        schedulerAccount.account_address!
      )

      if (!valid.isValid) {
        throw new GateConditionNotValidError()
      }
    }
  }

  const timezone = meeting.participants_mapping[0].timeZone
  for (const participant of meeting.participants_mapping) {
    if (participant.account_address) {
      const ownerAccount = ownerAccounts.find(
        val =>
          val?.address?.toLowerCase() ===
          participant?.account_address?.toLowerCase()
      )
      if (
        existingAccounts
          .map(account => account.address)
          .includes(participant.account_address!) &&
        participant.type === ParticipantType.Owner
      ) {
        // only validate slot if meeting is being scheduled on someone's calendar and not by the person itself (from dashboard for example)
        const participantIsOwner = ownerParticipants.some(
          val =>
            val?.account_address?.toLowerCase() ===
            participant?.account_address?.toLowerCase()
        )
        // check if trhe meeting type allows for the slot to be used
        const slotIsTaken = async () =>
          !(await isSlotAvailable(
            participant.account_address!,
            new Date(meeting.start),
            new Date(meeting.end),
            meeting.meetingTypeId,
            meeting.txHash
          ))
        let isTimeAvailable = () =>
          ownerAccount &&
          isTimeInsideAvailabilities(
            new Date(meeting.start),
            new Date(meeting.end),
            ownerAccount?.preferences.availabilities || [],
            ownerAccount?.preferences.timezone
          )
        if (
          meeting.meetingTypeId &&
          meeting.meetingTypeId !== NO_MEETING_TYPE
        ) {
          const accountAvailabilities =
            await getTypeMeetingAvailabilityTypeFromDB(meeting.meetingTypeId)
          isTimeAvailable = () =>
            ownerAccount &&
            accountAvailabilities?.some(availability =>
              isTimeInsideAvailabilities(
                new Date(meeting.start),
                new Date(meeting.end),
                availability?.weekly_availability || [],
                availability?.timezone
              )
            )
        }
        // TODO: check slots by meeting type and not users default Availability
        if (
          participantIsOwner &&
          ownerIsNotScheduler &&
          ((!meeting.ignoreOwnerAvailability && !isTimeAvailable()) ||
            (await slotIsTaken()))
        )
          throw new TimeNotAvailableError()
      }

      let account: Account

      if (
        existingAccounts
          .map(account => account.address)
          .includes(participant.account_address!)
      ) {
        account = await getAccountFromDB(participant.account_address!)
        participant.timeZone = account.preferences.timezone || 'UTC'
      } else {
        account = await initAccountDBForWallet(
          participant.account_address!,
          '',
          participant.timeZone,
          0,
          true
        )
      }

      // Not adding source here given on our database the source is always MWW
      const dbSlot: DBSlot = {
        id: participant.slot_id,
        start: meeting.start,
        end: meeting.end,
        account_address: account.address,
        version: 0,
        meeting_info_encrypted: participant.privateInfo,
        recurrence: meeting.meetingRepeat,
        role: participant.type,
      }

      slots.push(dbSlot)

      if (
        participant.account_address.toLowerCase() ===
          schedulerAccount?.account_address?.toLowerCase() ||
        (!schedulerAccount &&
          participant.account_address?.toLowerCase() === ownerAccount?.address)
      ) {
        index = i
        meetingResponse = {
          ...dbSlot,
          meeting_info_encrypted: participant.privateInfo,
        }
      }
      i++
    }
  }

  // we create here the root meeting data, with enough data
  const createdRootMeeting = await saveConferenceMeetingToDB({
    id: meeting.meeting_id,
    start: meeting.start,
    end: meeting.end,
    meeting_url: meeting.meeting_url,
    access_type: MeetingAccessType.OPEN_MEETING,
    provider: meeting.meetingProvider,
    reminders: meeting.meetingReminders || [],
    recurrence: meeting.meetingRepeat,
    version: MeetingVersion.V2,
    slots: meeting.allSlotIds || [],
    title: meeting.title,
    permissions: meeting.meetingPermissions,
  })
  if (!createdRootMeeting) {
    throw new Error(
      'Could not create your meeting right now, get in touch with us if the problem persists'
    )
  }
  const { data, error } = await db.supabase.from('slots').insert(slots)

  //TODO: handle error
  if (error) {
    throw new Error(error.message)
  }

  meetingResponse.id = data[index].id
  meetingResponse.created_at = data[index].created_at

  const body: MeetingCreationSyncRequest = {
    participantActing,
    meeting_id: meeting.meeting_id,
    start: meeting.start,
    end: meeting.end,
    created_at: meetingResponse.created_at!,
    timezone,
    meeting_url: meeting.meeting_url,
    participants: meeting.participants_mapping,
    title: meeting.title,
    content: meeting.content,
    meetingProvider: meeting.meetingProvider,
    meetingReminders: meeting.meetingReminders,
    meetingRepeat: meeting.meetingRepeat,
    meetingPermissions: meeting.meetingPermissions,
    meeting_type_id:
      meeting.meetingTypeId === NO_MEETING_TYPE
        ? undefined
        : meeting.meetingTypeId,
  }
  // Doing notifications and syncs asynchronously
  fetch(`${apiUrl}/server/meetings/syncAndNotify`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'X-Server-Secret': process.env.SERVER_SECRET!,
      'Content-Type': 'application/json',
    },
  })

  if (meeting.txHash) {
    await registerMeetingSession(meeting.txHash, meeting.meeting_id)
  }
  return meetingResponse as DBSlot
}

const getAccountNotificationSubscriptions = async (
  address: string
): Promise<AccountNotifications> => {
  const { data, error } = await db.supabase
    .from('account_notifications')
    .select()
    .eq('account_address', address.toLowerCase())

  if (error) {
    throw new Error(error.message)
  }

  if (data && data[0]) return data[0] as AccountNotifications

  return { account_address: address, notification_types: [] }
}
const getAccountsNotificationSubscriptions = async (
  addresses: Array<string>
): Promise<Array<AccountNotifications>> => {
  const { data, error } = await db.supabase
    .from('account_notifications')
    .select()
    .in(
      'account_address',
      addresses.map(val => val.toLowerCase())
    )

  if (error) {
    throw new Error(error.message)
  }

  if (data) return data as Array<AccountNotifications>

  return addresses.map(address => ({
    account_address: address,
    notification_types: [],
  }))
}
const getAccountNotificationSubscriptionEmail = async (
  address: string
): Promise<string> => {
  const notifications = await getAccountNotificationSubscriptions(address)
  const userEmail = notifications?.notification_types.find(
    n => n.channel === NotificationChannel.EMAIL
  )?.destination
  return userEmail || ''
}

const getAccountsNotificationSubscriptionEmails = async (
  address: Array<string>
): Promise<Array<string>> => {
  const notifications = await getAccountsNotificationSubscriptions(address)
  const userEmails = []
  for (const notification of notifications) {
    const userEmail = notification?.notification_types.find(
      n => n.channel === NotificationChannel.EMAIL
    )?.destination
    if (userEmail) userEmails.push(userEmail)
  }
  return userEmails
}

const getGroupsAndMembers = async (
  address: string,
  limit?: string,
  offset?: string,
  search?: string,
  includeInvites?: boolean
): Promise<Array<GetGroupsFullResponse>> => {
  const { data, error } = await db.supabase.rpc<GetGroupsFullRawResponse>(
    'get_user_groups_with_members',
    {
      user_address: address.toLowerCase(),
      search_term: search || null,
      limit_count: limit || 1000,
      offset_count: offset || 0,
    }
  )

  if (error) {
    throw new Error(error.message)
  }

  return data.map(group => ({
    id: group.group_id,
    name: group.group_name,
    slug: group.group_slug,
    members:
      group.members.filter(member => {
        if (includeInvites) {
          return true
        }
        return !member.invitePending
      }) || [],
  })) as GetGroupsFullResponse[]
}

async function findGroupsWithSingleMember(
  groupIDs: Array<string>
): Promise<Array<EmptyGroupsResponse>> {
  const filteredGroups = []
  for (const groupID of groupIDs) {
    const { data: group, error } = await db.supabase
      .from('group_members')
      .select('count')
      .eq('group_id', groupID)
    if (error) {
      throw new Error(error.message)
    } else if (group.length === 1 && group[0].count === 1) {
      const { data: groupDetails, error: groupError } = await db.supabase
        .from('groups')
        .select('id, name, slug')
        .eq('id', groupID)
      if (groupError) {
        throw new Error(groupError.message)
      }
      filteredGroups.push(groupDetails[0])
    }
  }
  return filteredGroups
}

const getGroupsEmpty = async (
  address: string
): Promise<Array<EmptyGroupsResponse>> => {
  const { data: memberGroups, error } = await db.supabase
    .from('group_members')
    .select('group_id')
    .eq('member_id', address.toLowerCase())

  if (error) {
    throw new Error(error.message)
  }
  if (memberGroups.length > 0) {
    const groupIDs = memberGroups.map(
      (group: { group_id: string }) => group.group_id
    )
    return findGroupsWithSingleMember(groupIDs)
  } else {
    // user is not part of any group
    return []
  }
}

export const getGroupInvite = async (identifier: {
  email?: string
  user_id?: string
}): Promise<GroupInvitesResponse | null> => {
  const { email, user_id } = identifier
  let query = db.supabase.from('group_invites').select()

  if (email) {
    query = query.eq('email', email)
  } else if (user_id) {
    query = query.eq('user_id', user_id)
  } else {
    console.error('No identifier provided')
    return null
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching group invite:', error)
    return null
  }

  if (data.length === 0) return null

  return data[0] as GroupInvitesResponse
}
const getGroupName = async (group_id: string): Promise<Group> => {
  const { data, error } = await db.supabase
    .from('groups')
    .select(
      `
      id,
    name
    `
    )
    .eq('id', group_id)
  if (error) {
    throw new Error(error.message)
  }
  if (data) {
    return data[0]
  }
  throw new GroupNotExistsError()
}

const getGroupInvites = async ({
  address,
  group_id,
  user_id,
  email,
  discord_id,
  limit,
  offset,
  search,
}: GroupInviteFilters): Promise<Array<UserGroups>> => {
  const { data, error } = await db.supabase.rpc(
    'get_group_invites_with_search',
    {
      user_address: address || null,
      target_group_id: group_id || null,
      target_user_id: user_id || null,
      target_email: email || null,
      target_discord_id: discord_id || null,
      search_term: search || null,
      limit_count: limit || 1000,
      offset_count: offset || 0,
    }
  )

  if (error) {
    console.error('Error executing query:', error)
    throw new Error(error.message)
  }

  return data.map(item => ({
    id: item.id,
    role: item.role,
    group: {
      id: item.group_id,
      name: item.group_name,
      slug: item.group_slug,
    },
    invitePending: item.invite_pending,
  }))
}
const getGroupInvitesCount = async ({
  address,
  group_id,
  user_id,
  email,
  discord_id,
}: GroupInviteFilters): Promise<number | null> => {
  let query = db.supabase.from('group_invites').select('id', { count: 'exact' })
  let orQuery = ''
  if (address) {
    orQuery = `user_id.eq.${address.toLowerCase()}`
  }
  if (group_id) {
    orQuery += (orQuery ? ',' : '') + `group_id.eq.${group_id}`
    query = query.eq('group_id', group_id)
  }
  if (user_id) {
    orQuery += (orQuery ? ',' : '') + `user_id.eq.${user_id.toLowerCase()}`
  }
  if (email) {
    orQuery += (orQuery ? ',' : '') + `email.eq.${email}`
  }
  if (discord_id) {
    orQuery += (orQuery ? ',' : '') + `discord_id.eq.${discord_id}`
  }
  query.or(orQuery)
  const { count, error } = await query
  if (error) {
    throw new Error(error.message)
  }
  return count
}
const publicGroupJoin = async (group_id: string, address: string) => {
  const groupUsers = await getGroupMembersInternal(group_id)
  if (groupUsers.map(val => val.member_id).includes(address.toLowerCase())) {
    throw new AlreadyGroupMemberError()
  }
  await addUserToGroup(group_id, address.toLowerCase(), MemberType.MEMBER)
}

const manageGroupInvite = async (
  group_id: string,
  address: string,
  reject?: boolean,
  email_address?: string
): Promise<void> => {
  const query = email_address
    ? `email.eq.${email_address},user_id.eq.${address.toLowerCase()}`
    : `user_id.eq.${address.toLowerCase()}`
  const groupUsers = await getGroupMembersInternal(group_id)
  const { error, data } = await db.supabase
    .from<GroupInvites>('group_invites')
    .delete()
    .eq('group_id', group_id)
    .or(query)

  if (error) {
    throw new Error(error.message)
  }
  if (groupUsers.map(val => val.member_id).includes(address.toLowerCase())) {
    throw new AlreadyGroupMemberError()
  }
  if (!data || !data[0]?.role) {
    throw new Error('Invite Expired')
  }
  if (reject) {
    return
  }
  await addUserToGroup(group_id, address.toLowerCase(), data[0].role)
}
const addUserToGroup = async (
  group_id: string,
  member_id: string,
  role = MemberType.MEMBER
) => {
  const { error } = await db.supabase.from('group_members').insert({
    group_id,
    member_id,
    role,
  })
  if (error) {
    throw new Error(error.message)
  }
}

const getGroupAdminsFromDb = async (
  group_id: string
): Promise<Array<GroupMembersRow>> => {
  const { data, error } = await db.supabase
    .from('group_members')
    .select('member_id')
    .eq('group_id', group_id)
    .eq('role', MemberType.ADMIN)
  if (error) {
    throw new Error(error.message)
  }
  return data
}

const rejectGroupInvite = async (
  group_id: string,
  address: string,
  email_address?: string
): Promise<void> => {
  await manageGroupInvite(group_id, address, true, email_address)
  const admins = await getGroupAdminsFromDb(group_id)
  const body: GroupInviteNotifyRequest = {
    group_id: group_id,
    accountsToNotify: admins.map(val => val.member_id),
    notifyType: GroupNotificationType.REJECT,
  }
  fetch(`${apiUrl}/server/groups/syncAndNotify`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'X-Server-Secret': process.env.SERVER_SECRET!,
      'Content-Type': 'application/json',
    },
  })
}
const leaveGroup = async (
  group_id: string,
  userIdentifier: string,
  invite_pending?: boolean
) => {
  const { data: groupData, error: groupError } = await db.supabase
    .from('groups')
    .select()
    .eq('id', group_id)
  if (groupError) {
    throw new Error(groupError.message)
  }
  if (!groupData) {
    throw new GroupNotExistsError()
  }
  const query = db.supabase
    .from(invite_pending ? 'group_invites' : 'group_members')
    .select('role')
    .eq('group_id', group_id)
  if (invite_pending) {
    query.eq('id', userIdentifier)
  } else {
    query.eq('member_id', userIdentifier)
  }
  const { data, error: groupMemberError } = await query
  if (groupMemberError) {
    throw new Error(groupMemberError.message)
  }
  if (!data || data.length === 0) {
    throw new NotGroupMemberError()
  }
  const groupAdmins = await getGroupAdminsFromDb(group_id)
  if (
    groupAdmins.length === 1 &&
    groupAdmins.every(val => val.member_id === userIdentifier)
  ) {
    throw new IsGroupAdminError()
  }
  const deleteQuery = db.supabase
    .from(invite_pending ? 'group_invites' : 'group_members')
    .delete()
    .eq('group_id', group_id)
  if (invite_pending) {
    deleteQuery.eq('id', userIdentifier)
  } else {
    deleteQuery.eq('member_id', userIdentifier.toLowerCase())
  }
  const { error } = await deleteQuery
  if (error) {
    throw new Error(error.message)
  }
}
const removeMember = async (
  group_id: string,
  address: string,
  member_id: string,
  invite_pending: boolean
) => {
  const isAddressAdmin = await isGroupAdmin(group_id, address)
  if (!isAddressAdmin) {
    throw new NotGroupAdminError()
  }
  return leaveGroup(group_id, member_id, invite_pending)
}

const getGroupUsers = async (
  group_id: string,
  address: string,
  limit: number,
  offset: number
): Promise<Array<GroupUsers & GroupInvites>> => {
  if (await isGroupExists(group_id)) {
    const { data: inviteData, error: inviteError } = await db.supabase
      .from('group_invites')
      .select()
      .eq('group_id', group_id)
    if (inviteError) {
      throw new Error(inviteError.message)
    }
    const { data: membersData, error: membersError } = await db.supabase
      .from('group_members')
      .select()
      .eq('group_id', group_id)
    if (membersError) {
      throw new Error(membersError.message)
    }
    const addresses = membersData
      .map((member: GroupMemberQuery) => member.member_id)
      .concat(inviteData.map((val: GroupMemberQuery) => val.user_id))
    const nonUsers = inviteData?.filter(data => !data.user_id)
    if (!addresses.includes(address)) {
      throw new NotGroupMemberError()
    }
    const { data, error } = await db.supabase
      .from('accounts')
      .select(
        `
      group_members: group_members(*),
      group_invites: group_invites(*),
      preferences: account_preferences(name),
      subscriptions: subscriptions(*)
    `
      )
      .in('address', addresses)
      .filter('group_members.group_id', 'eq', group_id)
      .filter('group_invites.group_id', 'eq', group_id)
      .range(
        offset || 0,
        (offset || 0) + (limit ? limit - 1 : 999_999_999_999_999)
      )
    if (error) {
      throw new Error(error.message)
    }

    if (data) {
      return [...data, ...nonUsers]
    }
  }
  return []
}

const isGroupAdmin = async (groupId: string, userIdentifier?: string) => {
  const { data, error } = await db.supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('member_id', userIdentifier)
  if (error) {
    throw new Error(error.message)
  }
  if (!data[0]) {
    throw new NotGroupMemberError()
  }
  return data[0]?.role === MemberType.ADMIN
}

const changeGroupRole = async (
  groupId: string,
  userIdentifier: string,
  newRole: MemberType,
  invitePending: boolean
) => {
  const groupUsers = await getGroupUsersInternal(groupId)
  if (newRole === MemberType.MEMBER) {
    const adminCount = groupUsers.filter(
      val => val?.role === MemberType.ADMIN
    ).length
    if (adminCount < 2) {
      throw new AdminBelowOneError()
    }
  }
  const query = db.supabase
    .from(invitePending ? 'group_invites' : 'group_members')
    .update({ role: newRole })
    .eq('group_id', groupId)
  if (invitePending) {
    query.eq('id', userIdentifier)
  } else {
    query.eq('member_id', userIdentifier)
  }
  const { error } = await query
  if (error) {
    throw new Error(error.message)
  }
  return true
}

const getGroupUsersInternal = async (
  group_id: string
): Promise<Array<GroupMemberQuery>> => {
  if (await isGroupExists(group_id)) {
    const { data: inviteData, error: inviteError } = await db.supabase
      .from<GroupMemberQuery>('group_invites')
      .select()
      .eq('group_id', group_id)
    if (inviteError) {
      throw new Error(inviteError.message)
    }
    const { data: membersData, error: membersError } = await db.supabase
      .from<GroupMemberQuery>('group_members')
      .select()
      .eq('group_id', group_id)
    if (membersError) {
      throw new Error(membersError.message)
    }
    const members = membersData.concat(inviteData)
    return members
  }
  return []
}

const getGroupMembersInternal = async (
  group_id: string
): Promise<Array<GroupMemberQuery>> => {
  if (await isGroupExists(group_id)) {
    const { data: membersData, error: membersError } = await db.supabase
      .from<GroupMemberQuery>('group_members')
      .select()
      .eq('group_id', group_id)
    if (membersError) {
      throw new Error(membersError.message)
    }
    return membersData
  }
  return []
}
const isGroupExists = async (group_id: string) => {
  const { data: groupData, error: groupError } = await db.supabase
    .from('groups')
    .select()
    .eq('id', group_id)
  if (groupError) {
    throw new Error(groupError.message)
  }
  if (!groupData) {
    throw new GroupNotExistsError()
  }
  return true
}
const getGroupInternal = async (group_id: string) => {
  const { data, error } = await db.supabase
    .from('groups')
    .select(
      `
    name,
    id,
    slug
    `
    )
    .eq('id', group_id)
  if (error) {
    throw new Error(error.message)
  }
  if (data) {
    return data[0]
  }
  throw new GroupNotExistsError()
}
const getGroup = async (group_id: string, address: string): Promise<Group> => {
  const groupUsers = await getGroupUsersInternal(group_id)
  const isGroupMember = groupUsers.some(
    user =>
      user.member_id?.toLowerCase() === address.toLowerCase() ||
      user.user_id?.toLowerCase() === address.toLowerCase()
  )
  if (!isGroupMember) {
    throw new NotGroupMemberError()
  }
  return getGroupInternal(group_id)
}
const editGroup = async (
  group_id: string,
  address: string,
  name?: string,
  slug?: string
): Promise<void> => {
  await isGroupExists(group_id)
  const checkAdmin = await isGroupAdmin(group_id, address)
  if (!checkAdmin) {
    throw new NotGroupAdminError()
  }
  const data: UpdateGroupPayload = {}
  if (name) {
    data.name = name
  }
  if (slug) {
    data.slug = slug
  }
  const { error } = await db.supabase
    .from('groups')
    .update(data)
    .eq('id', group_id)
  if (error) {
    throw new Error('Group with slug already exists', {
      cause: error.message,
    })
  }
}
const deleteGroup = async (group_id: string, address: string) => {
  await isGroupExists(group_id)
  const checkAdmin = await isGroupAdmin(group_id, address)
  if (!checkAdmin) {
    throw new NotGroupAdminError()
  }
  await deleteGroupMembers(group_id)
  await deleteGroupInvites(group_id)
  const { error } = await db.supabase.from('groups').delete().eq('id', group_id)
  if (error) {
    throw new Error(error.message)
  }
}

const deleteGroupMembers = async (group_id: string) => {
  const { error } = await db.supabase
    .from('group_members')
    .delete()
    .eq('group_id', group_id)
  if (error) {
    throw new Error(error.message)
  }
}

const deleteGroupInvites = async (group_id: string) => {
  const { error } = await db.supabase
    .from('group_invites')
    .delete()
    .eq('group_id', group_id)
  if (error) {
    throw new Error(error.message)
  }
}

export const createGroupInvite = async (
  groupId: string,
  email?: string,
  discordId?: string,
  userId?: string
): Promise<void> => {
  try {
    const { error } = await db.supabase.from('group_invites').insert({
      email,
      discord_id: discordId,
      user_id: userId || null,
      group_id: groupId,
    })

    if (error) {
      throw new Error(error.message)
    }
  } catch (error) {
    console.error('Error creating group invite:', error)
    throw error
  }
}

export const addUserToGroupInvites = async (
  groupId: string,
  role: MemberType,
  email?: string,
  accountAddress?: string
): Promise<void> => {
  try {
    const { error } = await db.supabase.from('group_invites').insert({
      email,
      user_id: accountAddress || null,
      group_id: groupId,
      role: role || MemberType.MEMBER, // default to member
    })

    if (error) {
      throw new Error(error.message)
    }
  } catch (error) {
    console.error('Error creating group invite:', error)
    throw error
  }
}

export const updateGroupInviteUserId = async (
  inviteId: string,
  userId: string
): Promise<void> => {
  const { error } = await db.supabase
    .from('group_invites')
    .update({ user_id: userId })
    .eq('id', inviteId)

  if (error) {
    console.error('Error updating group invite user ID:', error)
    throw new Error(error.message)
  }
}

const setAccountNotificationSubscriptions = async (
  address: string,
  notifications: AccountNotifications
): Promise<AccountNotifications> => {
  const account = await getAccountFromDB(address)
  if (!isProAccount(account)) {
    notifications.notification_types = notifications.notification_types.filter(
      n => n.channel !== NotificationChannel.EPNS
    )
  }

  const { error } = await db.supabase
    .from('account_notifications')
    .upsert(notifications, { onConflict: 'account_address' })
    .eq('account_address', address.toLowerCase())
  if (error) {
    throw new Error(error.message)
  }

  return notifications
}

export const createOrUpdatesDiscordAccount = async (
  discordAccount: DiscordAccount
): Promise<DiscordAccount | undefined> => {
  const account = await getAccountFromDiscordId(discordAccount.discord_id)
  if (!account) {
    const { data, error } = await db.supabase
      .from('discord_accounts')
      .insert([discordAccount])
    if (error) {
      throw new Error(error.message)
    }
    return data[0]
  } else {
    const { data, error } = await db.supabase
      .from('discord_accounts')
      .update(discordAccount)
      .eq('discord_id', discordAccount.discord_id)
    if (error) {
      throw new Error(error.message)
    }
    return data[0]
  }
}

export const deleteDiscordAccount = async (accountAddress: string) => {
  const { error } = await db.supabase
    .from('discord_accounts')
    .delete()
    .eq('address', accountAddress)
  if (error) {
    throw new Error(error.message)
  }
}

const saveEmailToDB = async (email: string, plan: string): Promise<boolean> => {
  const { error } = await db.supabase.from('emails').upsert([
    {
      email,
      plan,
    },
  ])

  if (!error) {
    return true
  }
  throw new Error(error.message)
}

const saveConferenceMeetingToDB = async (
  payload: Omit<ConferenceMeeting, 'created_at'>
): Promise<boolean> => {
  const { error } = await db.supabase.from('meetings').upsert([
    {
      ...payload,
      created_at: new Date(),
    },
  ])

  if (!error) {
    return true
  }
  throw new Error(error.message)
}

const getConnectedCalendars = async (
  address: string,
  {
    syncOnly,
    activeOnly: _activeOnly,
  }: {
    syncOnly?: boolean
    activeOnly?: boolean
  }
): Promise<ConnectedCalendar[]> => {
  const query = db.supabase
    .from('connected_calendars')
    .select()
    .eq('account_address', address.toLowerCase())
    .order('id', { ascending: true })

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  if (!data) return []

  // const connectedCalendars: ConnectedCalendar[] =
  //   !isProAccount(account) && activeOnly ? data.slice(0, 1) : data
  // ignore pro for now
  const connectedCalendars: ConnectedCalendar[] = data
  if (syncOnly) {
    const calendars: ConnectedCalendar[] = JSON.parse(
      JSON.stringify(connectedCalendars)
    )
    for (const cal of calendars) {
      cal.calendars = cal.calendars.filter(c => c.sync)
    }
    return calendars
  }

  return connectedCalendars
}

const connectedCalendarExists = async (
  address: string,
  email: string,
  provider: TimeSlotSource
): Promise<ConnectedCalendar | undefined> => {
  const { data, error } = await db.supabase
    .from('connected_calendars')
    .select()
    .eq('account_address', address.toLowerCase())
    .ilike('email', email.toLowerCase())
    .eq('provider', provider)

  if (error) {
    throw new Error(error.message)
  }

  return data[0]
}

export const updateCalendarPayload = async (
  address: string,
  email: string,
  provider: TimeSlotSource,
  payload: any
): Promise<void> => {
  const { error } = await db.supabase
    .from('connected_calendars')
    .update({ payload, updated: new Date() })
    .eq('account_address', address.toLowerCase())
    .ilike('email', email.toLowerCase())
    .eq('provider', provider)

  if (error) {
    throw new Error(error.message)
  }
}

const addOrUpdateConnectedCalendar = async (
  address: string,
  email: string,
  provider: TimeSlotSource,
  calendars: CalendarSyncInfo[],
  // Unknown as it can be anything
  _payload?: unknown
): Promise<ConnectedCalendar> => {
  const existingConnection = await connectedCalendarExists(
    address,
    email,
    provider
  )

  let queryPromise
  const payload = _payload ? _payload : existingConnection?.payload
  if (existingConnection) {
    queryPromise = db.supabase
      .from('connected_calendars')
      .update({
        payload,
        calendars,
        updated: new Date(),
      })
      .eq('account_address', address.toLowerCase())
      .ilike('email', email.toLowerCase())
      .eq('provider', provider)
  } else {
    if (calendars.filter(c => c.enabled).length === 0) {
      calendars[0].enabled = true
      // ensure at least one is enabled when adding it
    }

    queryPromise = db.supabase.from('connected_calendars').insert({
      email,
      payload,
      calendars,
      created: new Date(),
      account_address: address,
      provider,
    })
  }
  const { data, error } = await queryPromise

  if (error) {
    throw new Error(error.message)
  }
  const calendar = data[0] as ConnectedCalendar
  if (provider === TimeSlotSource.GOOGLE) {
    try {
      const integration = getConnectedCalendarIntegration(
        address.toLowerCase(),
        email,
        provider,
        payload
      )
      for (const cal of calendars.filter(cal => cal.enabled && cal.sync)) {
        // don't parellelize this as it can make us hit google's rate limit
        await handleWebHook(cal.calendarId, calendar.id, integration)
      }
    } catch (e) {
      Sentry.captureException(e, {
        extra: {
          calendarId: calendar.id,
          accountAddress: address,
          email,
          provider,
        },
      })
      console.error('Error adding new calendar to existing meeting types:', e)
    }
  }
  return calendar
}

const addNewCalendarToAllExistingMeetingTypes = async (
  account_address: string,
  calendar: ConnectedCalendar
) => {
  const meetingTypes = await getMeetingTypesLean(account_address.toLowerCase())
  if (!meetingTypes || meetingTypes.length === 0) return

  await Promise.all(
    meetingTypes.map(async meetingType => {
      if (
        await checkCalendarAlreadyExistsForMeetingType(
          calendar.id,
          meetingType.id
        )
      ) {
        return
      }
      const { error } = await db.supabase
        .from('meeting_type_calendars')
        .insert({
          meeting_type_id: meetingType.id,
          calendar_id: calendar.id,
        })
      if (error) {
        console.error('Error adding calendar to meeting type:', error)
        Sentry.captureException(error, {
          extra: {
            calendarId: calendar.id,
            meetingTypeId: meetingType.id,
            accountAddress: account_address,
          },
        })
      }
    })
  )
  return true
}
const checkCalendarAlreadyExistsForMeetingType = async (
  calendarId: number,
  meetingTypeId: string
) => {
  const { data: current } = await db.supabase
    .from('meeting_type_calendars')
    .select()
    .eq('meeting_type_id', meetingTypeId)
    .eq('calendar_id', calendarId)
  return current && current.length > 0
}
const handleWebHook = async (
  calId: string,
  connectedCalendarId: number,
  integration: CalendarService<TimeSlotSource>
) => {
  try {
    if (!integration.setWebhookUrl || !integration.refreshWebhook) return
    const { data } = await db.supabase
      .from('calendar_webhooks')
      .select('*')
      .eq('calendar_id', calId)
      .eq('connected_calendar_id', connectedCalendarId)
    const calendarwbhk = data?.[0]
    if (calendarwbhk) {
      if (new Date(calendarwbhk.expires_at) < add(new Date(), { days: 1 })) {
        const result = await integration.refreshWebhook(
          calendarwbhk.channel_id,
          calendarwbhk.resource_id,
          WEBHOOK_URL,
          calId
        )
        const { calendarId, channelId, expiration, resourceId } = result
        const { error: updateError } = await db.supabase
          .from('calendar_webhooks')
          .update({
            channel_id: channelId,
            resource_id: resourceId,
            calendar_id: calendarId,
            expires_at: new Date(Number(expiration)).toISOString(),
          })
          .eq('id', calendarwbhk.id)

        if (updateError) {
          console.error(updateError)
        }
        return
      }
    }
    const result = await integration.setWebhookUrl(WEBHOOK_URL, calId)
    const { calendarId, channelId, expiration, resourceId } = result
    const { error: updateError } = await db.supabase
      .from('calendar_webhooks')
      .insert({
        channel_id: channelId,
        resource_id: resourceId,
        calendar_id: calendarId,
        connected_calendar_id: connectedCalendarId,
        expires_at: new Date(Number(expiration)).toISOString(),
      })
    if (updateError) {
      console.error(updateError)
    }
  } catch (e) {
    console.error('Error refreshing webhook:', e)
  }
}
const removeConnectedCalendar = async (
  address: string,
  email: string,
  provider: TimeSlotSource
): Promise<ConnectedCalendar> => {
  const { data, error } = await db.supabase
    .from<ConnectedCalendar>('connected_calendars')
    .delete()
    .eq('account_address', address.toLowerCase())
    .ilike('email', email.toLowerCase())
    .eq('provider', provider)
    .select('*')
  if (error) {
    throw new Error(error.message)
  }
  const calendar = Array.isArray(data) ? data[0] : data
  await removeCalendarFromAllExistingMeetingTypes(address, calendar)
  return calendar
}

const removeCalendarFromAllExistingMeetingTypes = async (
  account_address: string,
  calendar: ConnectedCalendar
) => {
  const meetingTypes = await getMeetingTypesLean(account_address.toLowerCase())
  if (!meetingTypes || meetingTypes.length === 0) return

  const { error } = await db.supabase
    .from('meeting_type_calendars')
    .delete()
    .eq('calendar_id', calendar.id)
    .in(
      'meeting_type_id',
      meetingTypes.map(mt => mt.id)
    )
  if (error) {
    Sentry.captureException(error, {
      extra: {
        account_address,
        calendar,
      },
    })
  }
  return true
}
export const getSubscriptionFromDBForAccount = async (
  accountAddress: string,
  chain?: SupportedChain
): Promise<Subscription[]> => {
  const query = db.supabase
    .from<Subscription>('subscriptions')
    .select()
    .gt('expiry_time', new Date().toISOString())
    .eq('owner_account', accountAddress.toLowerCase())
  if (chain) {
    query.eq('chain', chain)
  }
  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }

  if (data && data.length > 0) {
    let subscriptions = data as Subscription[]
    const collidingDomains = subscriptions.map(s => s.domain).filter(s => s)
    if (collidingDomains.length === 0) return subscriptions
    const collisionExists = await db.supabase
      .from('subscriptions')
      .select()
      .neq('owner_account', accountAddress.toLowerCase())
      .or(collidingDomains.map(domain => `domain.ilike.${domain}`).join(','))

    if (collisionExists.error) {
      throw new Error(collisionExists.error.message)
    }

    // If for any reason some smart ass registered a domain manually
    // on the blockchain, but such domain already existed for someone
    // else and is not expired, we remove it here.
    for (const collision of collisionExists.data) {
      if (!collision.domain) continue
      if (
        (collision as Subscription).registered_at <
        subscriptions.find(s => s.domain === collision.domain)!.registered_at
      ) {
        subscriptions = subscriptions.filter(s => s.domain !== collision.domain)
      }
    }

    return subscriptions
  }
  return []
}

export const getSubscription = async (
  domain: string
): Promise<Subscription | undefined> => {
  const { data, error } = await db.supabase
    .from('subscriptions')
    .select()
    .ilike('domain', domain.toLowerCase())
    .gt('expiry_time', new Date().toISOString())
    .order('registered_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  if (data && data?.length > 0) return data[0] as Subscription

  return undefined
}

export const getExistingSubscriptionsByAddress = async (
  address: string
): Promise<Subscription[] | undefined> => {
  const { data, error } = await db.supabase
    .from('subscriptions')
    .select()
    .ilike('owner_account', address.toLocaleLowerCase())
    .gt('expiry_time', new Date().toISOString())
    .order('registered_at', { ascending: true })

  if (error) {
    Sentry.captureException(error)
  }

  if (data && data?.length > 0) {
    return data as Subscription[]
  }

  return undefined
}

export const getExistingSubscriptionsByDomain = async (
  domain: string
): Promise<Subscription[] | undefined> => {
  const { data, error } = await db.supabase
    .from('subscriptions')
    .select()
    .ilike('domain', domain.toLocaleLowerCase())
    .gt('expiry_time', new Date().toISOString())
    .order('registered_at', { ascending: true })

  if (error) Sentry.captureException(error)
  if (data && data?.length > 0) return data as Subscription[]

  return undefined
}

export const updateAccountSubscriptions = async (
  subscriptions: Subscription[]
): Promise<Subscription[]> => {
  for (const subscription of subscriptions) {
    const { data, error } = await db.supabase
      .from<Subscription>('subscriptions')
      .update({
        expiry_time: subscription.expiry_time,
        config_ipfs_hash: subscription.config_ipfs_hash,
        plan_id: subscription.plan_id,
        domain: subscription.domain,
      })
      .eq('owner_account', subscription.owner_account)
      .eq('chain', subscription.chain)
      .eq('plan_id', subscription.plan_id)

    if (error) {
      console.error(error)
      throw new Error(error.message)
    }

    if (!data || data.length == 0) {
      const { error } = await db.supabase
        .from<Subscription>('subscriptions')
        .insert(subscription)

      if (error) {
        throw new Error(error.message)
      }
    }
  }

  return subscriptions
}

const upsertGateCondition = async (
  ownerAccount: string,
  gateCondition: GateConditionObject
): Promise<GateConditionObject | null> => {
  if (gateCondition.id) {
    const response = await db.supabase
      .from('gate_definition')
      .select()
      .eq('id', gateCondition.id)

    if (response.error) {
      Sentry.captureException(response.error)
      return null
    } else if (response.data[0].owner !== ownerAccount) {
      throw new UnauthorizedError()
    }
  }

  const toUpsert: GateConditionObject & { owner: string } = {
    definition: gateCondition.definition,
    title: gateCondition.title.trim(),
    owner: ownerAccount.toLowerCase(),
  }

  if (gateCondition.id) {
    toUpsert.id = gateCondition.id
  }

  const { data, error } = await db.supabase
    .from('gate_definition')
    .upsert([toUpsert])

  if (!error) {
    return data[0] as GateConditionObject
  }
  throw new Error(error.message)
}

const deleteGateCondition = async (
  ownerAccount: string,
  idToDelete: string
): Promise<boolean> => {
  const usageResponse = await db.supabase
    .from('gate_usage')
    .select('id', { count: 'exact' })
    .eq('gate_id', idToDelete)

  if (usageResponse.error) {
    Sentry.captureException(usageResponse.error)
    return false
  } else if ((usageResponse.count || 0) > 0) {
    throw new GateInUseError()
  }

  const response = await db.supabase
    .from('gate_definition')
    .select()
    .eq('id', idToDelete)

  if (response.error) {
    Sentry.captureException(response.error)
    return false
  } else if (response.data[0].owner !== ownerAccount) {
    throw new UnauthorizedError()
  }

  const { error } = await db.supabase
    .from('gate_definition')
    .delete()
    .eq('id', idToDelete)

  if (!error) {
    return true
  }
  throw new Error(error.message)
}

const getGateCondition = async (
  conditionId: string
): Promise<GateConditionObject | null> => {
  const { data, error } = await db.supabase
    .from('gate_definition')
    .select()
    .eq('id', conditionId)

  if (!error) {
    return data[0] as GateConditionObject
  }
  throw new Error(error.message)
}

const getGateConditionsForAccount = async (
  ownerAccount: string
): Promise<GateConditionObject[]> => {
  const { data, error } = await db.supabase
    .from('gate_definition')
    .select()
    .eq('owner', ownerAccount.toLowerCase())

  if (!error) {
    return data as GateConditionObject[]
  }
  throw new Error(error.message)
}

const getAppToken = async (tokenType: string): Promise<any | null> => {
  const { data, error } = await db.supabase
    .from('application_tokens')
    .select()
    .eq('type', tokenType)

  if (!error) return data[0]

  return null
}

const updateMeeting = async (
  participantActing: ParticipantBaseInfo,
  meetingUpdateRequest: MeetingUpdateRequest
): Promise<DBSlot> => {
  if (
    new Set(
      meetingUpdateRequest.participants_mapping.map(
        p => p.account_address || p.guest_email
      )
    ).size !== meetingUpdateRequest.participants_mapping.length
  ) {
    // means there are duplicate participants
    throw new MeetingCreationError()
  }
  const slots = []
  let meetingResponse = {} as DBSlot
  let index = 0
  let i = 0

  const existingAccounts = await getExistingAccountsFromDB(
    meetingUpdateRequest.participants_mapping.map(p => p.account_address!)
  )
  const ownerParticipants =
    meetingUpdateRequest.participants_mapping.filter(
      p => p.type === ParticipantType.Owner
    ) || []

  const ownerAccounts =
    ownerParticipants.length > 0
      ? await Promise.all(
          ownerParticipants.map(
            async owner => await getAccountFromDB(owner.account_address!)
          )
        )
      : []

  const schedulerAccount =
    meetingUpdateRequest.participants_mapping.find(
      p => p.type === ParticipantType.Scheduler
    ) || null

  const timezone = meetingUpdateRequest.participants_mapping[0].timeZone
  let changingTime = null

  for (const participant of meetingUpdateRequest.participants_mapping) {
    const isEditing = participant.mappingType === ParticipantMappingType.KEEP

    if (participant.account_address) {
      const ownerAccount = ownerAccounts.find(
        val =>
          val?.address?.toLowerCase() ===
          participant?.account_address?.toLowerCase()
      )
      if (
        existingAccounts
          .map(account => account.address)
          .includes(participant.account_address!)
      ) {
        // only validate slot if meeting is being scheduled on someones calendar and not by the person itself (from dashboard for example)
        const participantIsOwner = ownerParticipants.some(
          val =>
            val?.account_address?.toLowerCase() ===
            participant?.account_address?.toLowerCase()
        )

        const ownerIsNotScheduler = Boolean(
          schedulerAccount &&
            !ownerParticipants.some(
              val =>
                val?.account_address?.toLowerCase() ===
                schedulerAccount.account_address
            )
        )

        let isEditingToSameTime = false

        if (isEditing) {
          const existingSlot = await getMeetingFromDB(participant.slot_id!)
          const sameStart =
            new Date(existingSlot.start).getTime() ===
            new Date(meetingUpdateRequest.start).getTime()
          const sameEnd =
            new Date(existingSlot.end).getTime() ===
            new Date(meetingUpdateRequest.end).getTime()
          isEditingToSameTime = sameStart && sameEnd
          changingTime = !isEditingToSameTime
            ? {
                oldStart: new Date(existingSlot.start),
                oldEnd: new Date(existingSlot.end),
              }
            : null
        }

        const slotIsTaken = async () =>
          !(await isSlotAvailable(
            participant.account_address!,
            new Date(meetingUpdateRequest.start),
            new Date(meetingUpdateRequest.end),
            meetingUpdateRequest.meetingTypeId,
            undefined,
            meetingUpdateRequest.meeting_id
          ))

        let isTimeAvailable = () =>
          ownerAccount &&
          isTimeInsideAvailabilities(
            new Date(meetingUpdateRequest.start),
            new Date(meetingUpdateRequest.end),
            ownerAccount?.preferences.availabilities || [],
            ownerAccount?.preferences.timezone
          )
        if (
          meetingUpdateRequest.meetingTypeId &&
          meetingUpdateRequest.meetingTypeId !== NO_MEETING_TYPE
        ) {
          const accountAvailabilities =
            await getTypeMeetingAvailabilityTypeFromDB(
              meetingUpdateRequest.meetingTypeId
            )
          isTimeAvailable = () =>
            ownerAccount &&
            accountAvailabilities?.some(availability =>
              isTimeInsideAvailabilities(
                new Date(meetingUpdateRequest.start),
                new Date(meetingUpdateRequest.end),
                availability?.weekly_availability || [],
                availability?.timezone
              )
            )
        }

        if (
          participantIsOwner &&
          ownerIsNotScheduler &&
          !isEditingToSameTime &&
          participantActing.account_address !== participant.account_address &&
          ((!meetingUpdateRequest.ignoreOwnerAvailability &&
            !isTimeAvailable()) ||
            (await slotIsTaken()))
        )
          throw new TimeNotAvailableError()
      }

      let account: Account

      if (
        existingAccounts
          .map(account => account.address)
          .includes(participant.account_address!)
      ) {
        account = await getAccountFromDB(participant.account_address!)
      } else {
        account = await initAccountDBForWallet(
          participant.account_address!,
          '',
          'UTC',
          0,
          true
        )
      }

      // Not adding source here given on our database the source is always MWW
      const dbSlot: DBSlot = {
        id: participant.slot_id,
        start: new Date(meetingUpdateRequest.start),
        end: new Date(meetingUpdateRequest.end),
        account_address: account.address,
        version: meetingUpdateRequest.version,
        meeting_info_encrypted: participant.privateInfo,
        recurrence: meetingUpdateRequest.meetingRepeat,
        role: participant.type,
      }

      slots.push(dbSlot)

      if (
        participant.account_address.toLowerCase() ===
          schedulerAccount?.account_address?.toLowerCase() ||
        (!schedulerAccount?.account_address &&
          participant.account_address.toLowerCase() ===
            ownerAccount?.address.toLowerCase())
      ) {
        index = i
        meetingResponse = {
          ...dbSlot,
          meeting_info_encrypted: participant.privateInfo,
        }
      }
      i++
    }
  }

  // one last check to make sure that the version did not change
  const everySlotId = meetingUpdateRequest.participants_mapping
    .filter(it => it.slot_id)
    .map(it => it.slot_id) as string[]
  const everySlot = await getMeetingsFromDB(everySlotId)
  if (everySlot.find(it => it.version + 1 !== meetingUpdateRequest.version))
    throw new MeetingChangeConflictError()

  // there is no support from suppabase to really use optimistic locking,
  // right now we do the best we can assuming that no update will happen in the EXACT same time
  // to the point that our checks will not be able to stop conflicts

  const { data, error } = await db.supabase
    .from('slots')
    .upsert(slots, { onConflict: 'id' })

  //TODO: handle error
  if (error) {
    throw new Error(error.message)
  }

  meetingResponse.id = data[index].id
  meetingResponse.created_at = data[index].created_at

  const meeting = await getConferenceMeetingFromDB(
    meetingUpdateRequest.meeting_id
  )

  // now that everything happened without error, it is safe to update the root meeting data
  const existingSlots =
    meeting.slots?.filter(
      val => !meetingUpdateRequest.slotsToRemove.includes(val)
    ) || []

  // Add unique slot IDs from allSlotIds that aren't already present
  const allSlotIds = meetingUpdateRequest.allSlotIds || []
  const uniqueNewSlots = allSlotIds.filter(
    slotId => !existingSlots.includes(slotId)
  )
  const updatedSlots = [...existingSlots, ...uniqueNewSlots]

  // now that everything happened without error, it is safe to update the root meeting data
  const createdRootMeeting = await saveConferenceMeetingToDB({
    id: meetingUpdateRequest.meeting_id,
    start: meetingUpdateRequest.start,
    end: meetingUpdateRequest.end,
    meeting_url: meetingUpdateRequest.meeting_url,
    access_type: MeetingAccessType.OPEN_MEETING,
    provider: meetingUpdateRequest.meetingProvider,
    recurrence: meetingUpdateRequest.meetingRepeat,
    reminders: meetingUpdateRequest.meetingReminders,
    version: MeetingVersion.V2,
    title: meetingUpdateRequest.title,
    slots: updatedSlots,
    permissions: meetingUpdateRequest.meetingPermissions,
  })

  if (!createdRootMeeting)
    throw new Error(
      'Could not update your meeting right now, get in touch with us if the problem persists'
    )

  const body: MeetingCreationSyncRequest = {
    participantActing,
    meeting_id: meetingUpdateRequest.meeting_id,
    start: meetingUpdateRequest.start,
    end: meetingUpdateRequest.end,
    created_at: meetingResponse.created_at!,
    timezone,
    meeting_url: meetingUpdateRequest.meeting_url,
    meetingProvider: meetingUpdateRequest.meetingProvider,
    participants: meetingUpdateRequest.participants_mapping,
    title: meetingUpdateRequest.title,
    content: meetingUpdateRequest.content,
    changes: changingTime ? { dateChange: changingTime } : undefined,
    meetingReminders: meetingUpdateRequest.meetingReminders,
    meetingRepeat: meetingUpdateRequest.meetingRepeat,
    meetingPermissions: meetingUpdateRequest.meetingPermissions,
    meeting_type_id:
      meetingUpdateRequest.meetingTypeId === NO_MEETING_TYPE
        ? undefined
        : meetingUpdateRequest.meetingTypeId,
  }

  // Doing notifications and syncs asynchronously
  fetch(`${apiUrl}/server/meetings/syncAndNotify`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: {
      'X-Server-Secret': process.env.SERVER_SECRET!,
      'Content-Type': 'application/json',
    },
  })

  if (
    meetingUpdateRequest.slotsToRemove.length > 0 ||
    meetingUpdateRequest.guestsToRemove.length > 0
  )
    await deleteMeetingFromDB(
      participantActing,
      meetingUpdateRequest.slotsToRemove,
      meetingUpdateRequest.guestsToRemove,
      meetingUpdateRequest.meeting_id,
      timezone,
      undefined,
      meetingUpdateRequest.title
    )

  return meetingResponse
}

const selectTeamMeetingRequest = async (
  id: string
): Promise<GroupMeetingRequest | null> => {
  const { data, error } = await db.supabase
    .from('group_meeting_request')
    .select()
    .eq('id', id)

  if (!error) return data[0] as GroupMeetingRequest

  return null
}

const insertOfficeEventMapping = async (
  office_id: string,
  mww_id: string
): Promise<void> => {
  const { error } = await db.supabase
    .from('office_event_mapping')
    .insert({ office_id, mww_id })

  if (error) {
    throw new Error(error.message)
  }
}

const getOfficeEventMappingId = async (
  mww_id: string
): Promise<string | null> => {
  const { data, error } = await db.supabase
    .from('office_event_mapping')
    .select()
    .eq('mww_id', mww_id)

  if (error) {
    throw new Error(error.message)
  }

  return data[0].office_id
}

export const getDiscordAccount = async (
  account_address: string
): Promise<DiscordAccount | undefined> => {
  const { data, error } = await db.supabase
    .from('discord_accounts')
    .select()
    .eq('address', account_address)

  if (error) {
    throw new Error(error.message)
  }

  if (data.length === 0) return undefined

  return data[0] as DiscordAccount
}

export const getAccountFromDiscordId = async (
  discord_id: string
): Promise<Account | null> => {
  const { data, error } = await db.supabase
    .from('discord_accounts')
    .select()
    .eq('discord_id', discord_id)

  if (error) {
    throw new Error(error.message)
  }

  if (data.length === 0) return null

  const address = data[0].address

  return getAccountFromDB(address)
}

export async function isUserAdminOfGroup(
  groupId: string,
  userAddress: string
): Promise<boolean> {
  const { data, error } = await db.supabase
    .from<GroupMembersRow>('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('member_id', userAddress)
    .eq('role', 'admin')
    .single()

  if (error) {
    console.error('Error checking admin status:', error)
    throw error
  }

  return data?.role === MemberType.ADMIN
}

export async function createGroupInDB(
  name: string,
  account_address: string,
  slug?: string
): Promise<CreateGroupsResponse> {
  const { data, error } = await db.supabase
    .from<TablesInsert<'groups'>>('groups')
    .insert([
      {
        name,
        slug,
      },
    ])

  if (error) {
    throw new GroupCreationError(
      'Group with slug already exists',
      error.message
    )
  }

  const newGroup = data[0]
  if (!newGroup || !newGroup.id) {
    throw new Error('Failed to create group: missing ID')
  }

  const admin = {
    group_id: newGroup.id,
    member_id: account_address,
    role: MemberType.ADMIN,
  }
  const members = [admin]
  const { error: memberError } = await db.supabase
    .from('group_members')
    .insert(members)
  if (memberError) {
    throw new GroupCreationError(
      'Error adding group admin to group',
      memberError.message
    )
  }
  return {
    id: newGroup.id,
    name: newGroup.name,
    slug: newGroup.slug!,
  }
}

const createTgConnection = async (
  account_address: string
): Promise<TelegramConnection> => {
  const hash = CryptoJS.SHA1(account_address).toString(CryptoJS.enc.Hex)
  const { error, data } = await db.supabase
    .from('telegram_connections')
    .insert([{ account_address, tg_id: hash }])

  if (error) {
    throw new Error(error.message)
  }
  return data[0]
}
const getTgConnectionByTgId = async (
  tg_id: string
): Promise<TelegramConnection | null> => {
  const { data, error } = await db.supabase
    .from('telegram_connections')
    .select()
    .eq('tg_id', tg_id)

  if (error) {
    throw new Error(error.message)
  }

  return data[0]
}

const deleteTgConnection = async (tg_id: string): Promise<void> => {
  const { error } = await db.supabase
    .from('telegram_connections')
    .delete()
    .eq('tg_id', tg_id)

  if (error) {
    throw new Error(error.message)
  }
}
const deleteAllTgConnections = async (
  account_address: string
): Promise<void> => {
  const { error } = await db.supabase
    .from('telegram_connections')
    .delete()
    .eq('account_address', account_address)

  if (error) {
    throw new Error(error.message)
  }
}
const getTgConnection = async (
  account_address: string
): Promise<TelegramConnection> => {
  const { data, error } = await db.supabase
    .from('telegram_connections')
    .select()
    .eq('account_address', account_address)

  if (error) {
    throw new Error(error.message)
  }

  return data[0]
}
const getNumberOfCouponClaimed = async (plan_id: string) => {
  const couponUsageData = await db.supabase
    .from<Row<'subscriptions'>>('subscriptions')
    .select('id', { count: 'exact' })
    .eq('plan_id', plan_id)
  return couponUsageData.count ?? 0
}
const subscribeWithCoupon = async (
  coupon_code: string,
  account_address: string,
  domain?: string
) => {
  const { data, error } = await db.supabase
    .from('coupons')
    .select()
    .ilike('code', coupon_code.toLowerCase())
  if (error) {
    throw new Error(error.message)
  }
  const coupon = data?.[0]
  if (!coupon) {
    throw new CouponNotValid()
  }
  const couponUses = getNumberOfCouponClaimed(coupon.plan_id)
  if (couponUses >= coupon.max_uses) {
    throw new CouponExpired()
  }

  const { data: subscriptionData, error: subscriptionError } = await db.supabase
    .from<Row<'subscriptions'>>('subscriptions')
    .select()
    .eq('owner_account', account_address)
    .eq('plan_id', coupon.plan_id)
  if (subscriptionError) {
    throw new Error(subscriptionError.message)
  }
  if ((subscriptionData?.length ?? 0) > 0) {
    throw new CouponAlreadyUsed()
  }
  const { data: planData, error: planError } = await db.supabase
    .from<Row<'subscriptions'>>('subscriptions')
    .insert([
      {
        plan_id: coupon.plan_id,
        owner_account: account_address,
        domain,
        chain: SupportedChain.CUSTOM,
        expiry_time: addMonths(new Date(), coupon.period).toISOString(),
        registered_at: new Date().toISOString(),
      },
    ])
  if (planError) {
    throw new Error(planError.message)
  }
  return planData[0]
}
const updateCustomSubscriptionDomain = async (
  account_address: string,
  domain: string
) => {
  const { data: subscriptionData, error: subscriptionError } = await db.supabase
    .from<Row<'subscriptions'>>('subscriptions')
    .select()
    .eq('owner_account', account_address)
    .gte('expiry_time', new Date().toISOString())
  if (subscriptionError) {
    throw new Error(subscriptionError.message)
  }
  const subscription = subscriptionData[0]
  if (!subscription) {
    throw new NoActiveSubscription()
  }
  if (subscription.chain !== SupportedChain.CUSTOM) {
    throw new SubscriptionNotCustom()
  }
  const { error, data } = await db.supabase
    .from('subscriptions')
    .update({ domain })
    .eq('owner_account', account_address)
    .gte('expiry_time', new Date().toISOString())

  if (error) {
    throw new Error(error.message)
  }
  return data
}
const getNewestCoupon = async () => {
  const { data, error } = await db.supabase
    .from('coupons')
    .select()
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    throw new Error(error.message)
  }

  const coupon = data[0]
  if (coupon) {
    coupon.claims = await getNumberOfCouponClaimed(coupon.plan_id)
  }
  return coupon
}
const getAccountsWithTgConnected = async (): Promise<
  Array<TgConnectedAccounts>
> => {
  const { data, error } = await db.supabase.rpc<TgConnectedAccounts>(
    'get_telegram_notifications'
  )
  if (error) {
    throw new Error(error.message)
  }
  return data
}
const getDiscordAccounts = async (): Promise<
  Array<DiscordConnectedAccounts>
> => {
  const { data, error } = await db.supabase.rpc<DiscordConnectedAccounts>(
    'get_discord_notifications'
  )
  if (error) {
    throw new Error(error.message)
  }
  return data
}

const findAccountsByText = async (
  current_address: string,
  search: string,
  limit = 10,
  offset = 0
) => {
  const { data, error } = await db.supabase.rpc<ContactSearch>(
    'search_accounts',
    {
      search,
      max_results: limit,
      skip: offset,
      current_address,
    }
  )
  if (error) {
    throw new Error(error.message)
  }
  return data?.[0]
}

const getOrCreateContactInvite = async (
  owner_address: string,
  address?: string,
  email?: string
) => {
  const { data, error: searchError } = await db.supabase
    .from('contact_invite')
    .select()
    .eq('account_owner_address', owner_address)
    .eq('destination', address || email)
  if (searchError) {
    throw new Error(searchError.message)
  }
  if ((data?.length || 0) > 0) {
    return data?.[0]
  }
  let channel = ChannelType.ACCOUNT
  if (email) {
    channel = ChannelType.EMAIL
  }
  if (address) {
    channel = ChannelType.ACCOUNT
  }

  const { data: insertData, error: insertError } = await db.supabase
    .from('contact_invite')
    .insert([
      {
        account_owner_address: owner_address,
        destination: address || email,
        channel,
      },
    ])
  if (insertError) {
    throw new Error(insertError.message)
  }
  return insertData[0]
}
const updateContactInviteCooldown = async (id: string) => {
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
  const { error } = await db.supabase
    .from('contact_invite')
    .update({ last_invited: new Date(Date.now() + SEVEN_DAYS) })
    .eq('id', id)
  if (error) {
    throw new Error(error.message)
  }
}
const isUserContact = async (owner_address: string, address: string) => {
  const { data, error } = await db.supabase
    .from('contact')
    .select('*', { count: 'exact', head: true })
    .eq('account_owner_address', owner_address)
    .eq('contact_address', address)
  if (error) {
    throw new Error(error.message)
  }
  return data?.[0]
}

const getContacts = async (
  address: string,
  query = '',
  limit = 10,
  offset = 0
): Promise<DBContact> => {
  const { data, error } = await db.supabase.rpc('search_contacts', {
    search: query,
    max_results: limit,
    skip: offset,
    current_account: address,
  })
  if (error) {
    throw new Error(error.message)
  }
  return data as unknown as DBContact
}

const getContactLean = async (
  address: string,
  query = '',
  limit = 10,
  offset = 0
): Promise<DBContactLean> => {
  const { data, error } = await db.supabase.rpc<DBContactLean>(
    'search_contacts_lean',
    {
      search: query,
      max_results: limit,
      skip: offset,
      current_account: address,
    }
  )
  if (error) {
    throw new Error(error.message)
  }
  return data as unknown as DBContactLean
}

const checkContactExists = async (
  current_address: string,
  user_address: string
): Promise<DBContactLean> => {
  const { data, error } = await db.supabase.rpc<DBContactLean>(
    'check_contact_existence',
    {
      current_account: current_address,
      user_address: user_address,
    }
  )
  if (error) {
    throw new Error(error.message)
  }
  return data as unknown as DBContactLean
}

const getContactById = async (
  id: string,
  address: string
): Promise<SingleDBContact> => {
  const { data, error } = await db.supabase
    .from('contact')
    .select(
      `
      id,
       contact_address,
        account_owner_address,
        status,
        account: accounts(
          preferences: account_preferences(name, avatar_url, description),
          calendars_exist: connected_calendars(id),
          account_notifications(notification_types)
        )
    `
    )
    .eq('id', id)
    .eq('account_owner_address', address)
    .eq('status', ContactStatus.ACTIVE)

  if (error) {
    throw new Error(error.message)
  }
  const contact = data?.[0]
  if (!contact) {
    throw new ContactNotFound()
  }
  return contact
}

const getContactInvites = async (
  address: string,
  query = '',
  limit = 10,
  offset = 0
): Promise<DBContactInvite> => {
  const userEmail = await getAccountNotificationSubscriptionEmail(address)
  const { data, error } = await db.supabase.rpc('search_contact_invites', {
    search: query,
    max_results: limit,
    skip: offset,
    current_account: address,
    current_account_email: userEmail || '',
  })
  if (error) {
    throw new Error(error.message)
  }
  return data as unknown as DBContactInvite
}
const _getContactByAddress = async (
  owner_address: string,
  address: string
): Promise<DBContact> => {
  const { data, error } = await db.supabase
    .from('contact')
    .select(
      `
      id,
       contact_address,
        account_owner_address,
        status,
        account: accounts(
          preferences: account_preferences(name, avatar_url, description),
          calendars_exist: connected_calendars(id),
          account_notifications(notification_types)
        )
    `
    )
    .eq('account_owner_address', owner_address)
    .eq('contact_address', address)
    .eq('status', ContactStatus.ACTIVE)
    .single()
  if (error) {
    throw new Error(error.message)
  }
  return data
}
const getContactInvitesCount = async (address: string) => {
  const userEmail = await getAccountNotificationSubscriptionEmail(address)
  const query = `destination.eq.${address},destination.eq.${userEmail}`
  const { error, count } = await db.supabase
    .from('contact_invite')
    .select('id', { count: 'exact' })
    .or(query)
  if (error) {
    throw new Error(error.message)
  }
  return count
}
const getContactInviteById = async (
  id: string
): Promise<SingleDBContactInvite> => {
  const { data, error } = await db.supabase
    .from('contact_invite')
    .select(
      `
      id,
       destination,
        account_owner_address,
        channel,
        account: accounts(
          preferences: account_preferences(name, avatar_url, description),
          calendars_exist: connected_calendars(id),
          account_notifications(notification_types)
        )
    `
    )
    .eq('id', id)
  if (error) {
    throw new Error(error.message)
  }
  const invite = data?.[0]
  if (!invite) {
    throw new ContactInviteNotFound()
  }
  return invite
}
const acceptContactInvite = async (
  invite_identifier: string,
  account_address: string
) => {
  const { data, error } = await db.supabase
    .from('contact_invite')
    .select()
    .eq('id', invite_identifier)
  if (error) {
    throw new Error(error.message)
  }
  const invite = data?.[0]
  if (!invite) {
    throw new ContactInviteNotFound()
  }

  // make sure the actual account owner accepts the invite
  if (
    invite?.channel === ChannelType.ACCOUNT &&
    invite?.destination !== account_address
  ) {
    throw new ContactInviteNotForAccount()
  }
  if (invite?.account_owner_address === account_address) {
    throw new OwnInviteError()
  }

  const { data: contactExists } = await db.supabase
    .from('contact')
    .select()
    .in('account_owner_address', [
      account_address,
      invite?.account_owner_address,
    ])
    .in('contact_address', [account_address, invite?.account_owner_address])
    .eq('status', ContactStatus.ACTIVE)

  if (contactExists?.length) {
    await db.supabase
      .from('contact_invite')
      .delete()
      .eq('id', invite_identifier)

    throw new ContactAlreadyExists()
  }

  const { error: insertError } = await db.supabase.from('contact').insert([
    {
      account_owner_address: invite?.account_owner_address,
      contact_address: account_address,
      status: ContactStatus.ACTIVE,
    },
    {
      account_owner_address: account_address,
      contact_address: invite?.account_owner_address,
      status: ContactStatus.ACTIVE,
    },
  ])

  if (insertError) {
    throw new Error(insertError.message)
  }
  // clean up old status contacts
  const { error: contactClearError } = await db.supabase
    .from('contact')
    .delete()
    .in('account_owner_address', [
      account_address,
      invite?.account_owner_address,
    ])
    .in('contact_address', [account_address, invite?.account_owner_address])
    .eq('status', ContactStatus.INACTIVE)

  if (contactClearError) {
    throw new Error(contactClearError.message)
  }

  const { error: deleteError } = await db.supabase
    .from('contact_invite')
    .delete()
    .in('account_owner_address', [
      account_address,
      invite?.account_owner_address,
    ])
    .in('destination', [account_address, invite?.account_owner_address])
  if (deleteError) {
    throw new Error(deleteError.message)
  }
}
const rejectContactInvite = async (
  invite_identifier: string,
  account_address: string
) => {
  const { data, error } = await db.supabase
    .from('contact_invite')
    .select()
    .eq('id', invite_identifier)

  if (error) {
    throw new Error(error.message)
  }
  if (!data?.length) {
    throw new ContactInviteNotForAccount()
  }
  const invite = data[0]

  // make sure the actual account owner rejects the invite
  if (
    invite?.channel === ChannelType.ACCOUNT &&
    invite?.destination !== account_address
  ) {
    throw new ContactInviteNotForAccount()
  }
  if (invite?.account_owner_address === account_address) {
    throw new OwnInviteError()
  }

  const { error: deleteError } = await db.supabase
    .from('contact_invite')
    .delete()
    .eq('id', invite_identifier)
  if (deleteError) {
    throw new Error(deleteError.message)
  }
}
const contactInviteByEmailExists = async (
  owner_address: string,
  email: string
) => {
  const { data, error } = await db.supabase
    .from('contact_invite')
    .select()
    .eq('destination', email)
    .eq('channel', ChannelType.EMAIL)
    .eq('account_owner_address', owner_address)
  if (error) {
    throw new Error(error.message)
  }

  return data?.length > 0
}

const removeContact = async (address: string, contact_address: string) => {
  const { error: updateError } = await db.supabase
    .from('contact')
    .update({ status: ContactStatus.INACTIVE })
    .eq('account_owner_address', contact_address)
    .eq('contact_address', address)

  if (updateError) {
    throw new Error(updateError.message)
  }
  const { error: removeError } = await db.supabase
    .from('contact')
    .delete()
    .eq('account_owner_address', address)
    .eq('contact_address', contact_address)

  if (removeError) {
    throw new Error(removeError.message)
  }
}

const getDefaultAvailabilityBlockId = async (
  account_address: string
): Promise<string | null> => {
  const { data: accountPrefs } = await db.supabase
    .from('account_preferences')
    .select('availaibility_id')
    .eq('owner_account_address', account_address)
    .single()

  return accountPrefs?.availaibility_id || null
}

const checkTitleExists = async (
  account_address: string,
  title: string,
  excludeBlockId?: string
): Promise<void> => {
  const trimmedTitle = title.trim()

  let query = db.supabase
    .from('availabilities')
    .select('id')
    .eq('account_owner_address', account_address)
    .eq('title', trimmedTitle)

  if (excludeBlockId) {
    query = query.neq('id', excludeBlockId)
  }

  const { data: existingBlock, error: checkError } = await query.single()

  if (checkError && checkError.code !== 'PGRST116') {
    throw checkError
  }

  if (existingBlock) {
    throw new InvalidAvailabilityBlockError(
      'An availability block with this title already exists'
    )
  }
}

const isAvailabilityBlockDefault = async (
  id: string,
  account_address: string
): Promise<boolean> => {
  const defaultBlockId = await getDefaultAvailabilityBlockId(account_address)
  return defaultBlockId === id
}

export const createAvailabilityBlock = async (
  account_address: string,
  title: string,
  timezone: string,
  weekly_availability: Array<{ weekday: number; ranges: TimeRange[] }>,
  is_default = false
) => {
  const trimmedTitle = title.trim()
  await checkTitleExists(account_address, title)

  // Create the availability block
  const { data: block, error: blockError } = await db.supabase
    .from('availabilities')
    .insert([
      {
        title: trimmedTitle,
        timezone,
        weekly_availability,
        account_owner_address: account_address,
      },
    ])
    .select()
    .single()

  if (blockError) throw blockError

  // If this is being set as default, update account preferences
  if (is_default) {
    const { error: prefError } = await db.supabase
      .from('account_preferences')
      .update({
        availabilities: weekly_availability,
        timezone: timezone,
        availaibility_id: block.id,
      })
      .eq('owner_account_address', account_address)

    if (prefError) throw prefError
  }

  return block
}

export const getAvailabilityBlock = async (
  id: string,
  account_address: string
) => {
  const { data, error } = await db.supabase
    .from('availabilities')
    .select('*')
    .eq('id', id)
    .eq('account_owner_address', account_address)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new AvailabilityBlockNotFoundError()
    }
    throw error
  }

  // Check if this is the default block
  const isDefault = await isAvailabilityBlockDefault(id, account_address)

  return {
    ...data,
    isDefault,
  }
}

export const updateAvailabilityBlock = async (
  id: string,
  account_address: string,
  title: string,
  timezone: string,
  weekly_availability: Array<{ weekday: number; ranges: TimeRange[] }>,
  is_default = false
) => {
  const trimmedTitle = title.trim()
  await checkTitleExists(account_address, title, id)

  // Get current account preferences to check if this block is currently default
  const isCurrentlyDefault = await isAvailabilityBlockDefault(
    id,
    account_address
  )

  // If this block is being set as default, update account preferences
  if (is_default) {
    const { error: prefError } = await db.supabase
      .from('account_preferences')
      .update({
        availaibility_id: id,
      })
      .eq('owner_account_address', account_address)

    if (prefError) throw prefError
  } else if (isCurrentlyDefault) {
    throw new DefaultAvailabilityBlockError(
      'Cannot unset the default availability block without selecting a new default'
    )
  }

  const { data, error } = await db.supabase
    .from('availabilities')
    .update({
      title: trimmedTitle,
      timezone,
      weekly_availability,
    })
    .eq('id', id)
    .eq('account_owner_address', account_address)
    .select()
    .single()

  if (error) throw error
  return data
}

export const deleteAvailabilityBlock = async (
  id: string,
  account_address: string
) => {
  // Check if this is the default block by checking account preferences
  const isDefault = await isAvailabilityBlockDefault(id, account_address)

  if (isDefault) {
    throw new DefaultAvailabilityBlockError()
  }

  const { error } = await db.supabase
    .from('availabilities')
    .delete()
    .eq('id', id)
    .eq('account_owner_address', account_address)

  if (error) {
    if (error.code === 'PGRST116') {
      throw new AvailabilityBlockNotFoundError()
    }
    throw error
  }
}

export const duplicateAvailabilityBlock = async (
  id: string,
  account_address: string,
  modifiedData?: {
    title?: string
    timezone?: string
    weekly_availability?: Array<{ weekday: number; ranges: TimeRange[] }>
    is_default?: boolean
  }
) => {
  // First get the block to duplicate
  const block = await getAvailabilityBlock(id, account_address)
  if (!block) {
    throw new AvailabilityBlockNotFoundError()
  }

  const newTitle = modifiedData?.title || `${block.title} (Copy)`
  const trimmedTitle = newTitle.trim()

  await checkTitleExists(account_address, newTitle)

  // Create a new block with the same data but a new ID, applying any modifications
  const { data: newBlock, error: blockError } = await db.supabase
    .from('availabilities')
    .insert([
      {
        title: trimmedTitle,
        timezone: modifiedData?.timezone || block.timezone,
        weekly_availability:
          modifiedData?.weekly_availability || block.weekly_availability,
        account_owner_address: account_address,
      },
    ])
    .select()
    .single()

  if (blockError) {
    throw new InvalidAvailabilityBlockError('Failed to create duplicate block')
  }

  // If this is being set as default, update account preferences with the new block ID
  if (modifiedData?.is_default) {
    const { error: prefError } = await db.supabase
      .from('account_preferences')
      .update({
        availaibility_id: newBlock.id,
      })
      .eq('owner_account_address', account_address)

    if (prefError) {
      console.error('Error updating account preferences:', prefError)
      throw new InvalidAvailabilityBlockError('Failed to set as default block')
    }
  }

  return newBlock
}

export const isDefaultAvailabilityBlock = async (
  id: string,
  account_address: string
): Promise<boolean> => {
  return await isAvailabilityBlockDefault(id, account_address)
}

export const getAvailabilityBlocks = async (account_address: string) => {
  // Get all availability blocks with their associated meeting types in a single query
  const { data: blocks, error } = await db.supabase
    .from('availabilities')
    .select(
      `
      *,
      meeting_types: meeting_type_availabilities(
        meeting_type(
          id,
          title,
          deleted_at
        )
      )
    `
    )
    .eq('account_owner_address', account_address)
    .order('created_at', { ascending: true })

  if (error) throw error

  // Get account preferences to determine default block
  const defaultBlockId = await getDefaultAvailabilityBlockId(account_address)

  const blocksWithDefault = blocks.map(block => {
    const meetingTypes =
      block.meeting_types
        ?.map(
          (item: {
            meeting_type: MeetingType & { deleted_at?: string | null }
          }) => {
            const meetingType = item.meeting_type
            if (!meetingType || meetingType.deleted_at) return null

            return meetingType
          }
        )
        .filter(Boolean) || []

    return {
      ...block,
      isDefault: defaultBlockId === block.id,
      meetingTypes,
    }
  })

  // Sort blocks
  const sortedBlocks = blocksWithDefault.sort((a, b) => {
    if (a.isDefault) return -1
    if (b.isDefault) return 1

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })

  return sortedBlocks
}

const getMeetingTypesLean = async (
  account_address: string
): Promise<Array<MeetingType> | null> => {
  // we do not need all the details, just the basic info
  const { data, error } = await db.supabase
    .from<MeetingType>('meeting_type')
    .select(`*`)
    .eq('account_owner_address', account_address)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  if (error) {
    Sentry.captureException(error)
  }
  return data
}
const getMeetingTypes = async (
  account_address: string,
  limit = 10,
  offset = 0
): Promise<Array<MeetingType>> => {
  const { data, error } = await db.supabase
    .from('meeting_type')
    .select(
      `
    *,
    availabilities: meeting_type_availabilities(availabilities(*)),
    plan: meeting_type_plan(*),
    connected_calendars: meeting_type_calendars(
       connected_calendars(id, email, provider)
    )
    `
    )
    .eq('account_owner_address', account_address)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)
  if (error) {
    throw new Error(error.message)
  }
  const transformedData = data?.map(meetingType => ({
    ...meetingType,
    calendars: meetingType?.connected_calendars?.map(
      (calendar: { connected_calendars: ConnectedCalendarCore }) =>
        calendar.connected_calendars
    ),
    availabilities: meetingType?.availabilities?.map(
      (availability: { availabilities: MeetingType['availabilities'][0] }) =>
        availability.availabilities
    ),
    plan: meetingType?.plan?.[0],
  }))

  return transformedData as MeetingType[]
}

const getMeetingTypesForAvailabilityBlock = async (
  account_address: string,
  availability_block_id: string
): Promise<MeetingType[]> => {
  // First verify the availability block exists and belongs to the account
  const { data: block, error: blockError } = await db.supabase
    .from('availabilities')
    .select('id')
    .eq('id', availability_block_id)
    .eq('account_owner_address', account_address)
    .single()

  if (blockError || !block) {
    throw new AvailabilityBlockNotFoundError()
  }

  const { data, error } = await db.supabase
    .from('meeting_type_availabilities')
    .select(
      `
      meeting_type: meeting_type(
        *,
        availabilities: meeting_type_availabilities(availabilities(*)),
        plan: meeting_type_plan(*),
        connected_calendars: meeting_type_calendars(
           connected_calendars(id, email, provider)
        )
      )
    `
    )
    .eq('availability_id', availability_block_id)
    .eq('meeting_type.account_owner_address', account_address)
    .is('meeting_type.deleted_at', null)

  if (error) {
    throw new Error('Failed to fetch meeting types')
  }

  const transformedData = data?.map(item => {
    const meetingType = item.meeting_type
    return {
      ...meetingType,
      calendars: meetingType?.connected_calendars?.map(
        (calendar: { connected_calendars: ConnectedCalendar }) =>
          calendar.connected_calendars
      ),
      availabilities: meetingType?.availabilities?.map(
        (availability: { availabilities: AvailabilityBlock }) =>
          availability.availabilities
      ),
      plan: meetingType?.plan?.[0],
    }
  })

  return transformedData as MeetingType[]
}

const checkSlugExists = async (
  account_address: string,
  slug: string,
  meeting_type_id?: string
) => {
  const query = db.supabase
    .from('meeting_type')
    .select('id,slug,account_owner_address')
    .eq('slug', slug)
    .is('deleted_at', null)
    .eq('account_owner_address', account_address)
    .range(0, 2)
  if (meeting_type_id) {
    query.neq('id', meeting_type_id)
  }
  const { data: meetingTypeExists, error: meetingTypeExistsError } = await query
  if (meetingTypeExistsError) {
    throw new Error(meetingTypeExistsError.message)
  }
  if (meetingTypeExists && meetingTypeExists.length > 0) {
    throw new MeetingSlugAlreadyExists(slug || '')
  }
}
const createMeetingType = async (
  account_address: string,
  meetingType: CreateMeetingTypeRequest
) => {
  await checkSlugExists(account_address, meetingType.slug)
  const payload: BaseMeetingType = {
    account_owner_address: account_address,
    type: meetingType.type,
    min_notice_minutes: meetingType.min_notice_minutes,
    duration_minutes: meetingType.duration_minutes,
    title: meetingType.title,
    slug: meetingType.slug,
    description: meetingType.description,
    custom_link: meetingType.custom_link,
    fixed_link: meetingType.fixed_link,
    meeting_platforms: meetingType.meeting_platforms,
  }
  const { data, error } = await db.supabase
    .from('meeting_type')
    .insert([payload])
  const meeting_type_id = data?.[0].id
  if (error) {
    throw new Error(error.message)
  }
  if (
    meetingType?.availability_ids &&
    meetingType?.availability_ids.length > 0
  ) {
    const { error: meetingTypeAvailaibilityError } = await db.supabase
      .from('meeting_type_availabilities')
      .insert(
        meetingType?.availability_ids?.map(availability_id => ({
          meeting_type_id,
          availability_id: availability_id,
        }))
      )
    if (meetingTypeAvailaibilityError) {
      throw new Error(meetingTypeAvailaibilityError.message)
    }
  }
  if (meetingType?.calendars && meetingType?.calendars?.length > 0) {
    const { error: calendarError } = await db.supabase
      .from('meeting_type_calendars')
      .insert(
        meetingType?.calendars?.map(calendar => ({
          meeting_type_id,
          calendar_id: calendar,
        }))
      )
    if (calendarError) {
      throw new Error(calendarError.message)
    }
  }
  if (meetingType?.plan) {
    const { error: planError } = await db.supabase
      .from('meeting_type_plan')
      .insert([
        {
          meeting_type_id,
          type: meetingType?.plan.type,
          price_per_slot: meetingType?.plan.price_per_slot,
          no_of_slot: meetingType?.plan.no_of_slot,
          payment_channel: meetingType?.plan.payment_channel,
          payment_address: meetingType?.plan.payment_address,
          default_chain_id: meetingType?.plan.crypto_network,
        },
      ])
    if (planError) {
      throw new Error(planError.message)
    }
  }
  return data?.[0] as MeetingType
}
const deleteMeetingType = async (
  account_address: string,
  meeting_type_id: string
): Promise<void> => {
  const { data: meetingTypes, error: MeetingTypeError } = await db.supabase
    .from('meeting_type')
    .select(`id`)
    .eq('account_owner_address', account_address)
    .is('deleted_at', null)
    .range(0, 2)
  if (MeetingTypeError) {
    throw new Error(MeetingTypeError.message)
  }
  if (meetingTypes?.length === 1) {
    throw new LastMeetingTypeError()
  }
  const { error } = await db.supabase
    .from('meeting_type')
    .update({ deleted_at: new Date().toISOString() })
    .eq('account_owner_address', account_address)
    .eq('id', meeting_type_id)

  if (error) {
    throw new Error(error.message)
  }

  const { error: assocError } = await db.supabase
    .from('meeting_type_availabilities')
    .delete()
    .eq('meeting_type_id', meeting_type_id)
  if (assocError) {
    throw new Error(assocError.message)
  }
}

// shared helper function to update associations between meeting types and availability blocks
const updateAssociations = async <T extends string | number>(
  table: string,
  primaryId: string,
  primaryField: string,
  secondaryField: string,
  newSecondaryIds: T[],
  errorMessage: string
) => {
  // Get current associations
  const { data: current } = await db.supabase
    .from(table)
    .select(secondaryField)
    .eq(primaryField, primaryId)

  const currentIds =
    current?.map((c: Record<string, T>) => c[secondaryField]) || []
  const newIds = newSecondaryIds

  const toDelete = currentIds.filter(id => !newIds.includes(id))
  const toInsert = newIds.filter(id => !currentIds.includes(id))

  // Delete removed associations
  if (toDelete.length > 0) {
    const { error: deleteError } = await db.supabase
      .from(table)
      .delete()
      .eq(primaryField, primaryId)
      .in(secondaryField, toDelete)

    if (deleteError) {
      throw new Error(`Failed to remove ${errorMessage}`)
    }
  }

  // Insert new associations
  if (toInsert.length > 0) {
    const { error: insertError } = await db.supabase.from(table).insert(
      toInsert.map(secondaryId => ({
        [primaryField]: primaryId,
        [secondaryField]: secondaryId,
      }))
    )

    if (insertError) {
      throw new Error(`Failed to add ${errorMessage}`)
    }
  }
}

const updateMeetingType = async (
  account_address: string,
  meeting_type_id: string,
  meetingType: CreateMeetingTypeRequest
): Promise<MeetingType> => {
  await checkSlugExists(account_address, meetingType.slug, meeting_type_id)
  const payload: Partial<BaseMeetingType> = {
    account_owner_address: account_address,
    min_notice_minutes: meetingType.min_notice_minutes,
    duration_minutes: meetingType.duration_minutes,
    title: meetingType.title,
    slug: meetingType.slug,
    description: meetingType.description,
    updated_at: new Date().toISOString(),
    custom_link: meetingType.custom_link,
    fixed_link: meetingType.fixed_link,
    meeting_platforms: meetingType.meeting_platforms,
  }
  const { data, error } = await db.supabase
    .from('meeting_type')
    .update(payload)
    .eq('account_owner_address', account_address)
    .eq('id', meeting_type_id)
  if (error) {
    throw new Error(error.message)
  }
  // Handle availability associations
  if (meetingType?.availability_ids !== undefined) {
    await updateAssociations(
      'meeting_type_availabilities',
      meeting_type_id,
      'meeting_type_id',
      'availability_id',
      meetingType.availability_ids,
      'availability associations'
    )
  }
  // Handle calendar associations
  if (meetingType?.calendars !== undefined) {
    await updateAssociations(
      'meeting_type_calendars',
      meeting_type_id,
      'meeting_type_id',
      'calendar_id',
      meetingType.calendars,
      'calendar associations'
    )
  }
  if (meetingType?.plan) {
    const { error: insertPlanError } = await db.supabase
      .from('meeting_type_plan')
      .update({
        type: meetingType?.plan.type,
        price_per_slot: meetingType?.plan.price_per_slot,
        no_of_slot: meetingType?.plan.no_of_slot,
        payment_channel: meetingType?.plan.payment_channel,
        payment_address: meetingType?.plan.payment_address,
        default_chain_id: meetingType?.plan.crypto_network,
        updated_at: new Date().toISOString(),
      })
      .eq('meeting_type_id', meeting_type_id)

    if (insertPlanError) {
      throw new Error(insertPlanError.message)
    }
  }
  return data?.[0] as MeetingType
}

const updateAvailabilityBlockMeetingTypes = async (
  account_address: string,
  availability_block_id: string,
  meeting_type_ids: string[]
) => {
  // First verify the availability block exists and belongs to the account
  const { data: block, error: blockError } = await db.supabase
    .from('availabilities')
    .select('id')
    .eq('id', availability_block_id)
    .eq('account_owner_address', account_address)
    .single()

  if (blockError || !block) {
    throw new AvailabilityBlockNotFoundError()
  }

  await updateAssociations(
    'meeting_type_availabilities',
    availability_block_id,
    'availability_id',
    'meeting_type_id',
    meeting_type_ids,
    'meeting type associations'
  )
}

const getTypeMeetingAvailabilityTypeFromDB = async (
  id: string
): Promise<MeetingType['availabilities'] | null> => {
  if (id === NO_MEETING_TYPE) return null
  const { data, error } = await db.supabase
    .from('meeting_type')
    .select(
      `
    *,
    availabilities: meeting_type_availabilities(availabilities(*))
    `
    )
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (error) {
    throw new Error(error.message)
  }
  if (!data) {
    throw new MeetingTypeNotFound()
  }
  return data?.availabilities?.map(
    (availability: { availabilities: MeetingType['availabilities'][0] }) =>
      availability.availabilities
  )
}
const getMeetingTypeFromDB = async (id: string): Promise<MeetingType> => {
  const { data, error } = await db.supabase
    .from('meeting_type')
    .select(
      `
    *,
    plan: meeting_type_plan(*),
    connected_calendars: meeting_type_calendars(
       connected_calendars(id, email, provider)
    )
    `
    )
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (error) {
    throw new Error(error.message)
  }
  if (!data) {
    throw new MeetingTypeNotFound()
  }
  data.plan = data.plan?.[0] || null
  data.calendars = data?.connected_calendars?.map(
    (calendar: { connected_calendars: ConnectedCalendarCore }) =>
      calendar.connected_calendars
  )
  return data
}
// Function to get transactions for a wallet (both sent and received) with optional token filtering
export const getWalletTransactions = async (
  walletAddress: string,
  tokenAddress?: string,
  chainId?: number,
  limit = 50,
  offset = 0,
  searchQuery?: string
) => {
  // Build base query for count
  let countQuery = db.supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .or(
      `initiator_address.eq.${walletAddress},metadata->>receiver_address.eq.${walletAddress}`
    )

  // Apply optional token and chain filters to count query
  if (tokenAddress && typeof tokenAddress === 'string') {
    countQuery = countQuery.eq('token_address', tokenAddress.toLowerCase())
  }

  if (chainId && typeof chainId === 'number') {
    countQuery = countQuery.eq('chain_id', chainId)
  }

  const { count: totalCount, error: countError } = await countQuery

  if (countError) {
    throw new Error(countError.message)
  }

  // Build base query for transactions
  let query = db.supabase
    .from('transactions')
    .select('*')
    .or(
      `initiator_address.eq.${walletAddress},metadata->>receiver_address.eq.${walletAddress}`
    )

  // Apply optional token and chain filters
  if (tokenAddress && typeof tokenAddress === 'string') {
    query = query.eq('token_address', tokenAddress.toLowerCase())
  }

  if (chainId && typeof chainId === 'number') {
    query = query.eq('chain_id', chainId)
  }

  const { data: transactions, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new Error(error.message)
  }

  // Get meeting data for transactions that have meeting_type_id
  const transactionsWithMeetingData = await Promise.all(
    (transactions || []).map(async tx => {
      if (tx.meeting_type_id) {
        // Get meeting type data with joined meeting sessions
        let meetingQuery = db.supabase
          .from('meeting_type')
          .select(
            `
            id, 
            title, 
            account_owner_address, 
            description,
            meeting_sessions!inner(
              id, 
              guest_email, 
              guest_name, 
              session_number, 
              created_at, 
              updated_at
            )
          `
          )
          .eq('id', tx.meeting_type_id)
          .eq('meeting_sessions.transaction_id', tx.id)

        if (searchQuery && searchQuery.trim()) {
          meetingQuery = meetingQuery.filter(
            'meeting_sessions.guest_name',
            'ilike',
            `%${searchQuery.trim().toLowerCase()}%`
          )
        }

        const { data: meetingTypeData, error: typeError } =
          await meetingQuery.single()

        if (typeError) {
          console.error('Error fetching meeting type:', typeError)
        }

        let meeting_host_name: string | null = null
        if (meetingTypeData?.account_owner_address) {
          const ownerAddr = meetingTypeData.account_owner_address.toLowerCase()
          const { data: hostPrefs } = await db.supabase
            .from('account_preferences')
            .select('name')
            .eq('owner_account_address', ownerAddr)
            .single()
          meeting_host_name = hostPrefs?.name || null
          if (!meeting_host_name && ownerAddr) {
            meeting_host_name = `${ownerAddr.slice(0, 3)}***${ownerAddr.slice(
              -2
            )}`
          }
        }

        const meetingSessions = meetingTypeData?.meeting_sessions || []

        return {
          ...tx,
          meeting_types: meetingTypeData
            ? [
                {
                  id: meetingTypeData.id,
                  title: meetingTypeData.title,
                  account_owner_address: meetingTypeData.account_owner_address,
                  description: meetingTypeData.description,
                },
              ]
            : [],
          meeting_sessions: meetingSessions,
          meeting_host_name,
        }
      } else {
        return {
          ...tx,
          meeting_types: [],
          meeting_sessions: [],
        }
      }
    })
  )

  const transactionsToProcess =
    searchQuery && searchQuery.trim()
      ? transactionsWithMeetingData.filter(
          tx => tx.meeting_sessions && tx.meeting_sessions.length > 0
        )
      : transactionsWithMeetingData

  const processedTransactions = transactionsToProcess.map(tx => {
    const metadata = tx.metadata

    const isSender =
      tx.initiator_address.toLowerCase() === walletAddress.toLowerCase()
    const isReceiver =
      metadata?.receiver_address?.toLowerCase() === walletAddress.toLowerCase()

    // Determine direction based on whether current wallet is sender or receiver
    let direction: 'debit' | 'credit' | 'unknown' = 'unknown'
    let counterparty_address: string | undefined
    let counterparty_name: string | undefined

    if (isSender) {
      direction = 'debit'
      counterparty_address = metadata?.receiver_address
    } else if (isReceiver) {
      direction = 'credit'
      counterparty_address = tx.initiator_address
    } else {
      direction = 'unknown'
      counterparty_address = undefined
    }

    if (tx.meeting_type_id) {
      if (direction === 'credit') {
        counterparty_name = tx?.meeting_sessions?.[0]?.guest_name || undefined
      } else if (direction === 'debit') {
        counterparty_name = tx?.meeting_host_name || undefined
      }
    }

    return {
      ...tx,
      direction,
      counterparty_address,
      counterparty_name,
      has_full_metadata: !!(tx.initiator_address && metadata?.receiver_address),
    }
  })

  return {
    transactions: processedTransactions,
    totalCount:
      searchQuery && searchQuery.trim()
        ? transactionsToProcess.length
        : totalCount || 0,
  }
}

export const getWalletTransactionsByToken = async (
  walletAddress: string,
  tokenAddress?: string,
  chainId?: number,
  limit = 50,
  offset = 0
) => {
  return getWalletTransactions(
    walletAddress,
    tokenAddress,
    chainId,
    limit,
    offset
  )
}

const sendWalletDebitEmail = async (
  initiatorAddress: string,
  tx: ConfirmCryptoTransactionRequest,
  fallbackReceiver?: string | null
) => {
  try {
    // Respect user preferences: only send if 'send-tokens' is enabled
    const prefs = await getPaymentPreferences(initiatorAddress)
    const notifications = prefs?.notification || []
    if (!notifications.includes(PaymentNotificationType.SEND_TOKENS)) return

    const senderEmail = await getAccountNotificationSubscriptionEmail(
      initiatorAddress
    )
    if (!senderEmail) return

    await sendCryptoDebitEmail(senderEmail, {
      amount: tx.fiat_equivalent,
      currency: resolveTokenSymbolFromAddress(tx.chain, tx.token_address),
      recipientName:
        tx.receiver_address || fallbackReceiver || 'Unknown Recipient',
      transactionId: tx.transaction_hash,
      transactionDate: new Date().toLocaleString(),
    })
  } catch (e) {
    console.warn('Failed to send wallet transfer email:', e)
  }
}

const sendSessionIncomeEmail = async (
  meetingType: MeetingType | undefined | null,
  tx: ConfirmCryptoTransactionRequest
) => {
  try {
    const hostAddress = meetingType?.account_owner_address
    if (!hostAddress) return

    // Respect host preferences: only send if 'receive-tokens' is enabled
    const prefs = await getPaymentPreferences(hostAddress)
    const notifications = prefs?.notification || []
    if (!notifications.includes(PaymentNotificationType.RECEIVE_TOKENS)) return

    const hostEmail = await getAccountNotificationSubscriptionEmail(hostAddress)
    if (!hostEmail) return

    await sendSessionBookingIncomeEmail(hostEmail, {
      amount: tx.fiat_equivalent,
      currency: resolveTokenSymbolFromAddress(tx.chain, tx.token_address),
      senderName: tx.guest_name || 'Guest',
      transactionId: tx.transaction_hash,
      transactionDate: new Date().toLocaleString(),
    })
  } catch (e) {
    console.warn('Failed to send session booking income email:', e)
  }
}

const createCryptoTransaction = async (
  transactionRequest: ConfirmCryptoTransactionRequest,
  account_address?: string
) => {
  const chainInfo = getChainInfo(transactionRequest.chain)
  if (!chainInfo?.id) {
    throw new ChainNotFound(transactionRequest.chain)
  }
  // Fallback if RPC is unavailable
  let feeInUSD = 0
  let gasUsed = '0'
  let receiverAddress: string | null = null

  try {
    const feeDetails = await getTransactionFeeThirdweb(
      transactionRequest.transaction_hash,
      transactionRequest.chain
    )
    feeInUSD = feeDetails.feeInUSD
    gasUsed = feeDetails.gasUsed
    receiverAddress = feeDetails.receiverAddress
  } catch (error) {
    console.warn('Failed to fetch transaction details from RPC:', error)
    // Use fallback values - transaction will still be created
    feeInUSD = 0
    gasUsed = '0'
    receiverAddress = transactionRequest.receiver_address || null
  }

  // Determine payment direction based on transaction type
  const isWalletTransfer = !transactionRequest.meeting_type_id
  const paymentDirection = isWalletTransfer
    ? PaymentDirection.DEBIT
    : PaymentDirection.CREDIT

  const payload: BaseTransaction = {
    method: transactionRequest.payment_method,
    transaction_hash:
      transactionRequest.transaction_hash.toLowerCase() as Address,
    amount: transactionRequest.amount,
    direction: paymentDirection,
    chain_id: chainInfo?.id,
    token_address: transactionRequest.token_address,
    fiat_equivalent: transactionRequest.fiat_equivalent,
    meeting_type_id: transactionRequest?.meeting_type_id,
    initiator_address: account_address,
    status: PaymentStatus.COMPLETED,
    token_type: TokenType.ERC20,
    confirmed_at: new Date().toISOString(),
    provider_reference_id: transactionRequest.provider_reference_id,
    currency: Currency.USD,
    total_fee: transactionRequest.total_fee || feeInUSD,
    metadata: {
      ...transactionRequest.metadata,
      ...(receiverAddress && {
        receiver_address: receiverAddress.toLowerCase(),
      }),
    },
    fee_breakdown: {
      gas_used: gasUsed,
      fee_in_usd: feeInUSD,
      ...transactionRequest.fee_breakdown,
    },
  }
  const { data, error } = await db.supabase
    .from<Transaction>('transactions')
    .insert(payload)
  if (error) {
    throw new Error(error.message)
  }

  // Notify parties via email
  if (isWalletTransfer) {
    await sendWalletDebitEmail(
      account_address!,
      transactionRequest,
      receiverAddress
    )
  }

  // Only create meeting sessions and send receipt if this is a meeting-related transaction
  if (!isWalletTransfer) {
    const meetingType = await getMeetingTypeFromDB(
      transactionRequest.meeting_type_id!
    )
    const totalNoOfSlots = meetingType?.plan?.no_of_slot || 1

    // For meeting payments, add the meeting owner's address to metadata as receiver
    if (meetingType?.account_owner_address) {
      const { error: updateError } = await db.supabase
        .from('transactions')
        .update({
          metadata: {
            sender_address: account_address?.toLowerCase(),
            receiver_address: meetingType.account_owner_address.toLowerCase(),
          },
        })
        .eq(
          'transaction_hash',
          transactionRequest.transaction_hash.toLowerCase()
        )

      if (updateError) {
        console.error(
          'Failed to update transaction metadata with receiver address:',
          updateError
        )
      }
    }

    const meetingSessions: Array<BaseMeetingSession> = Array.from(
      { length: totalNoOfSlots },
      (_, i) => ({
        meeting_type_id: transactionRequest.meeting_type_id!,
        transaction_id: data[0]?.id,
        session_number: i + 1,
        guest_address: account_address,
        guest_email: transactionRequest?.guest_email,
        guest_name: transactionRequest?.guest_name,
        owner_address: meetingType?.account_owner_address,
      })
    )
    const { error: slotError } = await db.supabase
      .from('meeting_sessions')
      .insert(meetingSessions)
    if (slotError) {
      throw new Error(slotError.message)
    }

    // Only send receipt if guest email and name are provided
    if (transactionRequest.guest_email && transactionRequest.guest_name) {
      try {
        // don't wait for receipt to be sent before serving a response
        sendReceiptEmail(
          transactionRequest.guest_email,
          transactionRequest.guest_name,
          {
            full_name: transactionRequest.guest_name,
            email_address: transactionRequest.guest_email,
            plan: meetingType?.title || '',
            number_of_sessions: totalNoOfSlots.toString(),
            price: transactionRequest.amount.toString(),
            payment_method: transactionRequest.payment_method,
            transaction_fee: String(transactionRequest.total_fee || 0),
            transaction_status: PaymentStatus.COMPLETED,
            transaction_hash: transactionRequest.transaction_hash,
          }
        )
      } catch (e) {
        console.error(e)
      }
    }

    // Notify host about income
    await sendSessionIncomeEmail(meetingType, transactionRequest)
  }
  return data[0]
}

const getMeetingSessionsByTxHash = async (
  tx: Address
): Promise<Array<MeetingSession>> => {
  const { data: transaction, error: error } = await db.supabase
    .from('transactions')
    .select(
      `
      meeting_sessions(*)
      `
    )
    .eq('transaction_hash', tx.toLowerCase())
    .single()
  if (error) {
    throw new Error(error.message)
  }
  if (!transaction) {
    throw new TransactionNotFoundError(tx)
  }

  return transaction.meeting_sessions || []
}

const getTransactionBytxHashAndMeetingType = async (
  tx: Address,
  meeting_type_id: string
): Promise<Transaction> => {
  const { data: transaction, error: error } = await db.supabase
    .from('transactions')
    .select(
      `
    *,
    meeting_sessions(*)
    `
    )
    .eq('transaction_hash', tx.toLowerCase())
    .eq('meeting_type_id', meeting_type_id)
    .single()

  if (error) {
    throw new Error(error.message)
  }
  if (!transaction) {
    throw new TransactionNotFoundError(tx)
  }
  return transaction
}
const getMeetingSessionByMeetingId = async (
  meeting_id: string,
  meeting_type_id: string
) => {
  const { data: meetingSession, error } = await db.supabase
    .from('meeting_sessions')
    .select('*')
    .eq('id', meeting_id)
    .eq('meeting_type_id', meeting_type_id)
    .single()
  if (error) {
    throw new Error(error.message)
  }

  return meetingSession
}

const registerMeetingSession = async (tx: Address, meeting_id: string) => {
  const meetingSessionsRaw = await getMeetingSessionsByTxHash(tx)
  const meetingSessions = meetingSessionsRaw.sort(
    (a, b) => a.session_number - b.session_number
  )
  const sessionToUpdate = meetingSessions.find(val => val.used_at === null)
  if (!sessionToUpdate) {
    throw new AllMeetingSlotsUsedError()
  }
  const { error: slotError } = await db.supabase
    .from('meeting_sessions')
    .update({
      meeting_id,
      used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionToUpdate.id)
  if (slotError) {
    throw new Error(slotError.message)
  }
}

const getPaidSessionsByMeetingType = async (
  current_account: string,
  account_address: string
): Promise<Array<PaidMeetingTypes>> => {
  const { data: sessions, error } = await db.supabase.rpc('get_paid_sessions', {
    current_account,
    account_address,
  })
  if (error) {
    throw new Error(error.message)
  }
  return sessions?.map(val => ({ ...val, plan: val.plan?.[0] })) || []
}

const syncWebhooks = async (provider: TimeSlotSource) => {
  const { data, error } = await db.supabase
    .from<ConnectedCalendar>('connected_calendars')
    .select('*')
    .eq('provider', provider)
    .filter('calendars', 'cs', '[{"sync": true}]')
  if (error) {
    throw new Error(error.message)
  }
  for (const calendar of data || []) {
    const integration = getConnectedCalendarIntegration(
      calendar.account_address,
      calendar.email,
      calendar.provider,
      calendar.payload
    )
    for (const cal of calendar.calendars.filter(c => c.enabled && c.sync)) {
      try {
        if (!integration.setWebhookUrl || !integration.refreshWebhook) continue
        const { data } = await db.supabase
          .from('calendar_webhooks')
          .select('*')
          .eq('calendar_id', cal.calendarId)
          .eq('connected_calendar_id', calendar.id)
        const calendarwbhk = data?.[0]
        if (calendarwbhk) {
          if (
            new Date(calendarwbhk.expires_at) < add(new Date(), { days: 1 })
          ) {
            const result = await integration.refreshWebhook(
              calendarwbhk.channel_id,
              calendarwbhk.resource_id,
              WEBHOOK_URL,
              cal.calendarId
            )
            const { calendarId, channelId, expiration, resourceId } = result
            const { error: updateError } = await db.supabase
              .from('calendar_webhooks')
              .update({
                channel_id: channelId,
                resource_id: resourceId,
                calendar_id: calendarId,
                expires_at: new Date(Number(expiration)).toISOString(),
              })
              .eq('id', calendarwbhk.id)

            if (updateError) {
              console.error(updateError)
            }
            continue
          }
          continue
        }

        const result = await integration.setWebhookUrl(
          WEBHOOK_URL,
          cal.calendarId
        )
        const { calendarId, channelId, expiration, resourceId } = result
        const { error: updateError } = await db.supabase
          .from('calendar_webhooks')
          .insert({
            channel_id: channelId,
            resource_id: resourceId,
            calendar_id: calendarId,
            connected_calendar_id: calendar.id,
            expires_at: new Date(Number(expiration)).toISOString(),
          })
        if (updateError) {
          console.error(updateError)
        }
      } catch (e) {
        console.error('Error refreshing webhook:', e)
      }
    }
  }
}

const handleWebhookEvent = async (
  channelId: string,
  resourceId: string
): Promise<boolean> => {
  console.trace(
    `Received webhook event for channel: ${channelId}, resource: ${resourceId}`
  )
  const { data } = await db.supabase
    .from('calendar_webhooks')
    .select(
      `
      *,
      connected_calendar: connected_calendars!inner(*)
      `
    )
    .eq('channel_id', channelId)
    .eq('resource_id', resourceId)
    .single()
  if (!data) {
    throw new Error(
      `No webhook found for channel: ${channelId}, resource: ${resourceId}`
    )
  }
  const calendar: ConnectedCalendar = data?.connected_calendar
  if (!calendar) return false
  let lower_limit = new Date(calendar?.updated || calendar?.created)
  const upper_limit = add(new Date(), {
    years: 1,
  })

  if (lower_limit < add(upper_limit, { years: -1.5 })) {
    lower_limit = add(upper_limit, { years: -1 })
  }

  const integration = getConnectedCalendarIntegration(
    calendar.account_address,
    calendar.email,
    calendar.provider,
    calendar.payload
  )

  let calendar_availabilities =
    (await integration.listEvents?.(
      data.calendar_id,
      lower_limit,
      upper_limit
    )) || []
  const uniqueRecurringEventId = new Set<string>()
  calendar_availabilities = calendar_availabilities
    .sort((a, b) => {
      // Group by recurringEventId first
      const aKey = a.id || ''
      const bKey = b.id || ''

      if (aKey !== bKey) return aKey.localeCompare(bKey)

      // Within same group, sort by sequence (highest first)
      return (b.sequence || 0) - (a.sequence || 0)
    })
    .filter(event => {
      if (!event.recurringEventId) return true
    })
  const recentlyUpdated = calendar_availabilities.filter(event => {
    const now = new Date()
    // We can't update recently updated meeting to prevent infinite syncing when we update or create meetings
    if (event.extendedProperties?.private?.lastUpdatedAt) {
      const eventLastUpdatedAt = new Date(
        event.extendedProperties?.private?.lastUpdatedAt
      )
      if (
        eventLastUpdatedAt >
        sub(now, {
          seconds: 30,
        })
      ) {
        return false
      }
    }
    const recordChangeDate = event.updated || event.created
    if (!recordChangeDate) return
    const eventDate = new Date(recordChangeDate)

    return eventDate > add(now, { minutes: -2 })
  })
  if (recentlyUpdated.length === 0) {
    console.error('No recently updated events found')
    return false
  }
  const actions = await Promise.all(
    recentlyUpdated.map(event =>
      handleSyncEvent(event, calendar, data.calendar_id)
    )
  )
  return actions.length > 0
}
const handleSyncEvent = async (
  event: calendar_v3.Schema$Event,
  calendar: ConnectedCalendar,
  calendarId: string
) => {
  try {
    // eslint-disable-next-line no-restricted-syntax
    console.log(event)
    if (!event.id) return
    const meetingId = getBaseEventId(event.id)
    if (!meetingId) {
      console.warn(`Skipping event ${event.id} due to missing  meetingId`)
      return
    }
    if (!event.start?.dateTime || !event.end?.dateTime) return
    const meeting = await updateMeetingServer(
      meetingId,
      calendar.account_address,
      calendar.email,
      new Date(event.start?.dateTime),
      new Date(event.end?.dateTime),
      event.attendees || [],
      extractMeetingDescription(event.description || '') || '',
      event.location || '',
      event.summary || ''
    )

    return meeting
  } catch (e) {
    console.error(e)
    if (e instanceof MeetingDetailsModificationDenied) {
      // update only the rsvp on other calendars
      return await handleCalendarRsvps(event, calendar, calendarId)
    } else {
      throw e
    }
  }
}
const handleCalendarRsvps = async (
  event: calendar_v3.Schema$Event,
  calendar: ConnectedCalendar,
  calendarId: string
) => {
  if (!event.id) return
  const meetingId = getBaseEventId(event.id)
  const existingMeeting = await getConferenceMeetingFromDB(meetingId)
  const slotIds = existingMeeting.slots
  const existingSlot = await getSlotsByIds(slotIds)
  const otherMeetingAddress = existingSlot
    .map(slot => slot.account_address.toLowerCase())
    .filter(address => address !== calendar.account_address)
  const actorAccount = await getAccountFromDB(calendar.account_address)
  if (!actorAccount) return
  const actor = event.attendees?.find(attendee => attendee.self)
  const actingParticipant = existingSlot?.find(
    user => user.account_address === calendar.account_address
  )
  if (!actingParticipant || !actor || !actor?.responseStatus) {
    return
  }
  // Update RSVP status on other participants' calendars
  for (const address of otherMeetingAddress) {
    try {
      const calendars = await getConnectedCalendars(address, {
        syncOnly: true,
      })

      for (const calendar of calendars) {
        const integration = getConnectedCalendarIntegration(
          calendar.account_address,
          calendar.email,
          calendar.provider,
          calendar.payload
        )

        if (integration.updateEventRSVP && actor?.responseStatus) {
          const actorEmail = noNoReplyEmailForAccount(
            (actorAccount.preferences.name || actorAccount.address)!
          )

          for (const cal of calendar.calendars) {
            try {
              await integration.updateEventRSVP(
                meetingId,
                actorEmail,
                actor.responseStatus,
                cal.calendarId
              )
              // Add delay to respect rate limits
              await new Promise(resolve => setTimeout(resolve, 2000))
            } catch (error: unknown) {
              console.error('Error updating RSVP status:', error)
              // If rate limited, wait longer before continuing
              if (error instanceof GaxiosError) {
                const isRateLimitError =
                  error?.message?.includes('Rate Limit') ||
                  error?.response?.status === 403

                if (isRateLimitError) {
                  await new Promise(resolve => setTimeout(resolve, 10000))
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.error(e)
    }
  }
  // Update the acting participant's RSVP status in the database
  const integration = getConnectedCalendarIntegration(
    calendar.account_address,
    calendar.email,
    calendar.provider,
    calendar.payload
  )
  integration.updateEventExtendedProperties &&
    integration.updateEventExtendedProperties(meetingId, calendarId)
}
const getAccountDomainUrl = (account: Account, ellipsize?: boolean): string => {
  if (isProAccount(account)) {
    const domain = account.subscriptions?.find(
      sub => new Date(sub.expiry_time) > new Date()
    )?.domain
    if (domain) {
      return domain
    }
  }
  return `address/${
    ellipsize ? ellipsizeAddress(account!.address) : account!.address
  }`
}

const getAccountCalendarUrl = async (
  account: Account,
  ellipsize?: boolean,
  meetingTypeId?: string
): Promise<string> => {
  let slug = ''
  if (meetingTypeId) {
    try {
      const meetingType = await getMeetingTypeFromDB(meetingTypeId)
      if (meetingType) {
        slug = `/${meetingType.slug}`
      }
    } catch (e) {
      Sentry.captureException(e, {
        extra: {
          accountAddress: account.address,
          meetingTypeId,
        },
      })
    }
  }
  return `${appUrl}/${getAccountDomainUrl(account, ellipsize)}${slug}`
}

const getOwnerPublicUrlServer = async (
  ownerAccountAddress: string,
  meetingTypeId?: string
): Promise<string> => {
  try {
    const ownerAccount = await getAccountFromDB(ownerAccountAddress)
    return await getAccountCalendarUrl(ownerAccount, undefined, meetingTypeId)
  } catch (error) {
    Sentry.captureException(error, {
      extra: {
        ownerAccountAddress,
        meetingTypeId,
      },
    })
    return `${appUrl}/address/${ownerAccountAddress}`
  }
}
const recordOffRampTransaction = async (event: OnrampMoneyWebhook) => {
  const { data: transactionExists } = await db.supabase
    .from<BaseTransaction>('transactions')
    .select('*')
    .eq('provider_reference_id', event.referenceId)
    .eq('initiator_address', event.merchantRecognitionId.toLowerCase())
    .eq('transaction_hash', event.transactionHash.toLowerCase())
  const status = extractOnRampStatus(event.status)
  const exists = transactionExists?.[0]
  const payload: BaseTransaction = {
    method: PaymentType.CRYPTO,
    transaction_hash: event.transactionHash.toLowerCase() as Address,
    amount: event.actualFiatAmount,
    direction:
      event.eventType.toLowerCase() === 'offramp'
        ? PaymentDirection.DEBIT
        : PaymentDirection.CREDIT,
    chain_id: event.chainId,
    token_address: await getOnrampMoneyTokenAddress(
      event.coinId,
      event.chainId
    ),
    fiat_equivalent: event.actualFiatAmount,
    initiator_address: event.merchantRecognitionId.toLowerCase() as Address,
    status,
    token_type: TokenType.ERC20,
    confirmed_at: status === 'completed' ? new Date().toISOString() : undefined,
    currency: currenciesMap[event.fiatType],
    provider_reference_id: event.referenceId,
    fee_breakdown: {
      client_fee: event.clientFee,
      gateway_fee: event.gatewayFee,
      on_ramp_fee: event.onRampFee,
    },
    total_fee: event.clientFee + event.gatewayFee + event.onRampFee,
    metadata: {
      order_id: event.orderId,
      actual_quantity: event.actualQuantity,
      kyc_needed: event?.kycNeeded,
      payment_type: event.paymentType,
    },
  }

  if (exists) {
    // If transaction already exists, update it
    payload.updated_at = new Date()
    const { data, error } = await db.supabase
      .from('transactions')
      .update(payload)
      .eq('provider_reference_id', event.referenceId)
      .eq('initiator_address', event.merchantRecognitionId.toLowerCase())
    if (error) {
      throw new Error(error.message)
    }
    return data?.[0] as Transaction
  } else {
    // If transaction does not exist, insert it
    const { data, error } = await db.supabase
      .from('transactions')
      .insert([payload])
    if (error) {
      throw new Error(error.message)
    }
    return data?.[0] as Transaction
  }
  //TODO: send notification
}

const getPaymentPreferences = async (
  owner_account_address: string
): Promise<PaymentPreferences | null> => {
  const { data, error } = await db.supabase
    .from('payment_preferences')
    .select(
      'id, created_at, owner_account_address, default_chain_id, notification, pin_hash'
    )
    .eq('owner_account_address', owner_account_address.toLowerCase())
    .single()

  if (error) {
    console.error('Database error in getPaymentPreferences:', error)
    if (error.code === 'PGRST116') {
      // No rows returned
      return null
    }
    Sentry.captureException(error)
    throw new Error('Could not get payment preferences')
  }

  // Transform the data to include hasPin without exposing pin_hash
  if (data) {
    const { pin_hash, ...rest } = data
    return {
      ...rest,
      hasPin: !!pin_hash,
    }
  }

  return null
}

const createPaymentPreferences = async (
  owner_account_address: string,
  data: Partial<
    Omit<PaymentPreferences, 'id' | 'created_at' | 'owner_account_address'>
  >
): Promise<PaymentPreferences> => {
  try {
    let insertData: typeof data & { pin_hash?: string } = { ...data }
    if ('pin' in data && typeof data.pin === 'string') {
      const pinHash = await createPinHash(data.pin)
      insertData = { ...data, pin_hash: pinHash }
      delete insertData.pin
    }

    // Set default notification preferences if not provided
    if (!insertData.notification || insertData.notification.length === 0) {
      insertData.notification = [
        PaymentNotificationType.SEND_TOKENS,
        PaymentNotificationType.RECEIVE_TOKENS,
      ]
    }

    const { data: result, error } = await db.supabase
      .from('payment_preferences')
      .insert({
        owner_account_address: owner_account_address.toLowerCase(),
        ...insertData,
      })
      .select(
        'id, created_at, owner_account_address, default_chain_id, notification, pin_hash'
      )
      .single()

    if (error) {
      console.error('Database error in createPaymentPreferences:', error)
      Sentry.captureException(error)
      throw new Error('Could not create payment preferences')
    }

    if (!result) {
      throw new Error('No data returned from database operation')
    }

    const { pin_hash, ...rest } = result
    return {
      ...rest,
      hasPin: !!pin_hash,
    }
  } catch (error) {
    console.error('Unexpected error in createPaymentPreferences:', error)
    Sentry.captureException(error)
    throw error instanceof Error
      ? error
      : new Error('Could not create payment preferences')
  }
}

const updatePaymentPreferences = async (
  owner_account_address: string,
  data: Partial<
    Omit<PaymentPreferences, 'id' | 'created_at' | 'owner_account_address'>
  >
): Promise<PaymentPreferences> => {
  try {
    let updateData: typeof data & { pin_hash?: string | null } = { ...data }
    if ('pin' in data) {
      if (data.pin === null) {
        updateData = { ...data, pin_hash: null }
        delete updateData.pin
      } else if (typeof data.pin === 'string') {
        const pinHash = await createPinHash(data.pin)
        updateData = { ...data, pin_hash: pinHash }
        delete updateData.pin
      }
    }

    const { data: result, error } = await db.supabase
      .from('payment_preferences')
      .update(updateData)
      .eq('owner_account_address', owner_account_address.toLowerCase())
      .select(
        'id, created_at, owner_account_address, default_chain_id, notification, pin_hash'
      )
      .single()

    if (error) {
      console.error('Database error in updatePaymentPreferences:', error)
      Sentry.captureException(error)
      throw new Error('Could not update payment preferences')
    }

    if (!result) {
      throw new Error('No data returned from database operation')
    }

    const { pin_hash, ...rest } = result
    return {
      ...rest,
      hasPin: !!pin_hash,
    }
  } catch (error) {
    console.error('Unexpected error in updatePaymentPreferences:', error)
    Sentry.captureException(error)
    throw error instanceof Error
      ? error
      : new Error('Could not update payment preferences')
  }
}

const createPinHash = async (pin: string): Promise<string> => {
  const pinWithSalt = `${pin}${PIN_SALT}`
  return await argon2.hash(pinWithSalt, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  })
}

const verifyUserPin = async (
  owner_account_address: string,
  pin: string
): Promise<boolean> => {
  try {
    // Get raw data including pin_hash for verification
    const { data, error } = await db.supabase
      .from('payment_preferences')
      .select('pin_hash')
      .eq('owner_account_address', owner_account_address.toLowerCase())
      .single()

    if (error) {
      console.error('Error fetching PIN for verification:', error)
      return false
    }

    if (!data?.pin_hash) {
      return false
    }

    const pinWithSalt = `${pin}${PIN_SALT}`
    const isValid = await argon2.verify(data.pin_hash, pinWithSalt)
    return isValid
  } catch (error) {
    console.error('Unexpected error in verifyUserPin:', error)
    return false
  }
}

const createVerification = async (
  owner_account_address: string,
  code: string,
  channel: VerificationChannel,
  expiresAt: Date
): Promise<void> => {
  try {
    const { error } = await db.supabase.from('verifications').insert({
      owner_account_address: owner_account_address,
      code_hash: await createPinHash(code),
      channel: channel,
      expires_at: expiresAt.toISOString(),
    })

    if (error) {
      console.error('Error creating verification:', error)
      throw new Error('Failed to create verification')
    }
  } catch (error) {
    console.error('Error in createVerification:', error)
    throw error
  }
}

const verifyVerificationCode = async (
  owner_account_address: string,
  code: string,
  channel: VerificationChannel
): Promise<boolean> => {
  try {
    const { data, error } = await db.supabase
      .from('verifications')
      .select('*')
      .eq('owner_account_address', owner_account_address)
      .eq('channel', channel)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Error fetching verification:', error)
      return false
    }

    if (!data || data.length === 0) {
      return false
    }

    const verification = data[0]

    const codeWithSalt = `${code}${PIN_SALT}`
    const isValid = await argon2.verify(verification.code_hash, codeWithSalt)

    if (isValid) {
      await deleteVerifications(verification.id)
      return true
    }

    return false
  } catch (error) {
    console.error('Error in verifyVerificationCode:', error)
    throw error
  }
}

const cleanupExpiredVerifications = async (): Promise<void> => {
  try {
    const { error } = await db.supabase
      .from('verifications')
      .delete()
      .lt('expires_at', new Date().toISOString())

    if (error) {
      console.error('Error cleaning up expired verifications:', error)
      throw new Error('Failed to clean up expired verifications')
    }
  } catch (error) {
    console.error('Error in cleanupExpiredVerifications:', error)
    throw error
  }
}

const invalidatePreviousVerifications = async (
  owner_account_address: string,
  channel: VerificationChannel
): Promise<void> => {
  try {
    const { error } = await db.supabase
      .from('verifications')
      .update({ expires_at: new Date().toISOString() })
      .eq('owner_account_address', owner_account_address)
      .eq('channel', channel)
      .gt('expires_at', new Date().toISOString())

    if (error) {
      console.error('Error invalidating previous verifications:', error)
      throw new Error('Failed to invalidate previous verifications')
    }
  } catch (error) {
    console.error('Error in invalidatePreviousVerifications:', error)
    throw error
  }
}

const deleteVerifications = async (verificationId: string): Promise<void> => {
  try {
    const { error } = await db.supabase
      .from('verifications')
      .delete()
      .eq('id', verificationId)

    if (error) {
      console.error('Error deleting verification:', error)
      throw new Error('Failed to delete verification')
    }

    await cleanupExpiredVerifications()
  } catch (error) {
    console.error('Error in deleteVerifications:', error)
    throw error
  }
}

export {
  acceptContactInvite,
  addOrUpdateConnectedCalendar,
  addUserToGroup,
  changeGroupRole,
  checkContactExists,
  cleanupExpiredVerifications,
  connectedCalendarExists,
  contactInviteByEmailExists,
  createCryptoTransaction,
  createMeetingType,
  createPaymentPreferences,
  createPinHash,
  createTgConnection,
  createVerification,
  deleteAllTgConnections,
  deleteGateCondition,
  deleteGroup,
  deleteMeetingFromDB,
  deleteMeetingType,
  deleteTgConnection,
  deleteVerifications,
  editGroup,
  findAccountByIdentifier,
  findAccountsByText,
  getAccountFromDB,
  getAccountFromDBPublic,
  getAccountNonce,
  getAccountNotificationSubscriptionEmail,
  getAccountNotificationSubscriptions,
  getAccountsNotificationSubscriptionEmails,
  getAccountsWithTgConnected,
  getAppToken,
  getConferenceDataBySlotId,
  getConferenceMeetingFromDB,
  getConnectedCalendars,
  getContactById,
  getContactInviteById,
  getContactInvites,
  getContactInvitesCount,
  getContactLean,
  getContacts,
  getDiscordAccounts,
  getExistingAccountsFromDB,
  getGateCondition,
  getGateConditionsForAccount,
  getGroup,
  getGroupInternal,
  getGroupInvites,
  getGroupInvitesCount,
  getGroupName,
  getGroupsAndMembers,
  getGroupsEmpty,
  getGroupUsers,
  getGroupUsersInternal,
  getMeetingFromDB,
  getMeetingSessionsByTxHash,
  getMeetingTypeFromDB,
  getMeetingTypes,
  getMeetingTypesForAvailabilityBlock,
  getNewestCoupon,
  getOfficeEventMappingId,
  getOrCreateContactInvite,
  getOwnerPublicUrlServer,
  getPaidSessionsByMeetingType,
  getPaymentPreferences,
  getSlotsByIds,
  getSlotsForAccount,
  getSlotsForAccountMinimal,
  getSlotsForDashboard,
  getTgConnection,
  getTgConnectionByTgId,
  handleGuestCancel,
  handleMeetingCancelSync,
  handleWebhookEvent,
  initAccountDBForWallet,
  initDB,
  insertOfficeEventMapping,
  invalidatePreviousVerifications,
  isGroupAdmin,
  isSlotAvailable as isSlotFree,
  isUserContact,
  leaveGroup,
  manageGroupInvite,
  publicGroupJoin,
  recordOffRampTransaction,
  registerMeetingSession,
  rejectContactInvite,
  rejectGroupInvite,
  removeConnectedCalendar,
  removeContact,
  removeMember,
  saveConferenceMeetingToDB,
  saveEmailToDB,
  saveMeeting,
  selectTeamMeetingRequest,
  setAccountNotificationSubscriptions,
  subscribeWithCoupon,
  syncWebhooks,
  updateAccountFromInvite,
  updateAccountPreferences,
  updateAllRecurringSlots,
  updateAvailabilityBlockMeetingTypes,
  updateContactInviteCooldown,
  updateCustomSubscriptionDomain,
  updateMeeting,
  updateMeetingType,
  updatePaymentPreferences,
  updatePreferenceAvatar,
  updateRecurringSlots,
  upsertGateCondition,
  verifyUserPin,
  verifyVerificationCode,
  workMeetingTypeGates,
}
