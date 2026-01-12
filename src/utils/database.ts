import { RecurringStatus } from '@meta/common'
import {
  ActivePaymentAccount,
  PaymentAccountStatus,
  PaymentProvider,
} from '@meta/PaymentAccount'
import * as Sentry from '@sentry/nextjs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getDiscordInfoForAddress } from '@utils/services/discord.helper'
import {
  Currency,
  currenciesMap,
  extractOnRampStatus,
  getChainIdFromOnrampMoneyNetwork,
  getOnrampMoneyTokenAddress,
} from '@utils/services/onramp.money'
import { getTelegramUserInfo } from '@utils/services/telegram.helper'
import * as argon2 from 'argon2'
import { createHash } from 'crypto'
import CryptoJS from 'crypto-js'
import { add, addMinutes, addMonths, isAfter, sub } from 'date-fns'
import EthCrypto, {
  decryptWithPrivateKey,
  Encrypted,
  encryptWithPublicKey,
} from 'eth-crypto'
import { Credentials } from 'google-auth-library'
import { calendar_v3 } from 'googleapis'
import { DateTime, Interval } from 'luxon'
import { rrulestr } from 'rrule'
import { validate } from 'uuid'

import { ResourceState } from '@/pages/api/server/webhook/calendar/sync'
import {
  Account,
  AccountPreferences,
  BannerSetting,
  BaseMeetingType,
  DiscordConnectedAccounts,
  LeanAccountInfo,
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
  BillingEmailAccountInfo,
  PaymentProvider as BillingPaymentProvider,
} from '@/types/Billing'
import {
  CalendarSyncInfo,
  ConnectedCalendar,
  ConnectedCalendarCore,
} from '@/types/CalendarConnections'
import {
  ContactSearch,
  DBContact,
  DBContactInvite,
  DBContactLean,
  SingleDBContact,
  SingleDBContactInvite,
} from '@/types/Contacts'
import {
  getChainInfo,
  resolveTokenSymbolFromAddress,
  SupportedChain,
} from '@/types/chains'
import { DiscordAccount, DiscordAccountInfo } from '@/types/Discord'
import {
  CreateGroupsResponse,
  EmptyGroupsResponse,
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
  AccountSlot,
  ConferenceMeeting,
  DBSlot,
  ExtendedDBSlot,
  ExtendedEventDBSlot,
  ExtendedSlotInstance,
  ExtendedSlotSeries,
  GroupMeetingRequest,
  GroupNotificationType,
  GuestSlot,
  MeetingAccessType,
  MeetingInfo,
  MeetingProvider,
  MeetingRepeat,
  MeetingVersion,
  ParticipantMappingType,
  SlotInstance,
  TimeSlotSource,
} from '@/types/Meeting'
import {
  ParticipantBaseInfo,
  ParticipantInfo,
  ParticipantType,
} from '@/types/ParticipantInfo'
import {
  AddParticipantData,
  AvailabilitySlot,
  CreateQuickPollRequest,
  PollStatus,
  PollVisibility,
  QuickPollCalendar,
  QuickPollParticipant,
  QuickPollParticipantStatus,
  QuickPollParticipantType,
  QuickPollParticipantUpdateFields,
  UpdateQuickPollRequest,
} from '@/types/QuickPoll'
import {
  ConfirmCryptoTransactionRequest,
  CreateMeetingTypeRequest,
  GroupInviteNotifyRequest,
  MeetingCancelSyncRequest,
  MeetingCheckoutRequest,
  MeetingCreationRequest,
  MeetingCreationSyncRequest,
  MeetingInstanceCreationSyncRequest,
  MeetingInstanceUpdateRequest,
  MeetingUpdateRequest,
} from '@/types/Requests'
import { Subscription } from '@/types/Subscription'
import {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from '@/types/Supabase'
import { TelegramAccountInfo, TelegramConnection } from '@/types/Telegram'
import {
  GateConditionObject,
  GateUsage,
  GateUsageType,
} from '@/types/TokenGating'
import {
  Address,
  BaseMeetingSession,
  BaseTransaction,
  ICheckoutMetadata,
  MeetingSession,
  OnrampMoneyWebhook,
  Transaction,
} from '@/types/Transactions'
import {
  MODIFIED_BY_APP_TIMEOUT,
  PaymentNotificationType,
  QUICKPOLL_DEFAULT_LIMIT,
  QUICKPOLL_DEFAULT_OFFSET,
  QUICKPOLL_MAX_LIMIT,
  QUICKPOLL_SLUG_FALLBACK_LENGTH,
  QUICKPOLL_SLUG_MAX_ATTEMPTS,
} from '@/utils/constants'
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
  BillingPeriodsFetchError,
  BillingPlanFetchError,
  BillingPlanFromStripeProductError,
  BillingPlanProviderFetchError,
  BillingPlanProvidersFetchError,
  BillingPlansFetchError,
  ChainNotFound,
  ContactAlreadyExists,
  ContactInviteNotForAccount,
  ContactInviteNotFound,
  ContactNotFound,
  CouponAlreadyUsed,
  CouponExpired,
  CouponNotValid,
  DefaultAvailabilityBlockError,
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
  QuickPollAlreadyCancelledError,
  QuickPollAlreadyCompletedError,
  QuickPollCancellationError,
  QuickPollCreationError,
  QuickPollDeletionError,
  QuickPollNotFoundError,
  QuickPollParticipantCreationError,
  QuickPollParticipantNotFoundError,
  QuickPollParticipantUpdateError,
  QuickPollSlugGenerationError,
  QuickPollSlugNotFoundError,
  QuickPollUnauthorizedError,
  QuickPollUpdateError,
  StripeSubscriptionCreationError,
  StripeSubscriptionFetchError,
  StripeSubscriptionTransactionLinkError,
  StripeSubscriptionUpdateError,
  SubscriptionHistoryCheckError,
  SubscriptionHistoryFetchError,
  SubscriptionNotCustom,
  SubscriptionPeriodCreationError,
  SubscriptionPeriodFetchError,
  SubscriptionPeriodFindError,
  SubscriptionPeriodStatusUpdateError,
  SubscriptionPeriodsExpirationError,
  SubscriptionPeriodsFetchError,
  SubscriptionPeriodTransactionUpdateError,
  SubscriptionTransactionCreationError,
  TimeNotAvailableError,
  TransactionIsRequired,
  TransactionNotFoundError,
  UnauthorizedError,
  UploadError,
} from '@/utils/errors'
import {
  emailQueue,
  ParticipantInfoForNotification,
} from '@/utils/notification_helper'
import { generatePollSlug } from '@/utils/quickpoll_helper'
import { getTransactionFeeThirdweb } from '@/utils/transaction.helper'

import {
  decryptConferenceMeeting,
  generateDefaultMeetingType,
  generateEmptyAvailabilities,
  getMeetingRepeatFromRule,
  handleRRULEForMeeting,
  isDiffRRULE,
} from './calendar_manager'
import {
  extractMeetingDescription,
  getParticipationStatus,
  handleCancelOrDelete,
  handleCancelOrDeleteForRecurringInstance,
  handleParseParticipants,
  handleUpdateMeeting,
  handleUpdateMeetingRsvps,
  handleUpdateSingleRecurringInstance,
} from './calendar_sync_helpers'
import { apiUrl, appUrl, WEBHOOK_URL } from './constants'
import { ChannelType, ContactStatus } from './constants/contact'
import { decryptContent, encryptContent } from './cryptography'
import { addRecurrence } from './date_helper'
import {
  sendCryptoDebitEmail,
  sendPollInviteEmail,
  sendReceiptEmail,
  sendSessionBookingIncomeEmail,
} from './email_helper'
import { deduplicateArray, deduplicateMembers } from './generic_utils'
import PostHogClient from './posthog'
import { CaldavCredentials } from './services/caldav.service'
import { CalendarBackendHelper } from './services/calendar.backend.helper'
import { IGoogleCalendarService } from './services/calendar.service.types'
import { getConnectedCalendarIntegration } from './services/connected_calendars.factory'
import { O365AuthCredentials } from './services/office365.credential'
import { StripeService } from './services/stripe.service'
import { isTimeInsideAvailabilities } from './slots.helper'
import { isProAccount } from './subscription_manager'
import { ellipsizeAddress } from './user_manager'
import { isValidEVMAddress } from './validations'

const PIN_SALT = process.env.PIN_SALT
const posthogClient = PostHogClient()
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
  } catch (_error) {}

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

  if (!createdUserAccount.data || createdUserAccount.data.length === 0) {
    throw new Error('User account not created')
  }
  const user_account: Account = createdUserAccount.data[0]
  const defaultMeetingType = generateDefaultMeetingType(user_account.address)
  const defaultAvailabilities = generateEmptyAvailabilities()

  const defaultBlock = await createAvailabilityBlock(
    user_account.address,
    'Default',
    timezone,
    defaultAvailabilities,
    false // don't set as default yet
  )

  const meetingType: CreateMeetingTypeRequest = {
    ...defaultMeetingType,
    fixed_link: false,
    availability_ids: [defaultBlock.id],
    calendars: [],
  }
  try {
    await createMeetingType(user_account.address, meetingType)
  } catch (e) {
    console.error(e)
    Sentry.captureException(e)
  }
  const preferences: TablesInsert<'account_preferences'> = {
    description: '',
    socialLinks: [],
    meetingProviders: [MeetingProvider.GOOGLE_MEET],
    availaibility_id: defaultBlock.id,
    owner_account_address: user_account.address,
  }
  try {
    await createMeetingType(user_account.address, meetingType)
  } catch (e) {
    Sentry.captureException(e)
  }
  try {
    const responsePrefs = await db.supabase
      .from('account_preferences')
      .insert(preferences)

    if (responsePrefs.error) {
      Sentry.captureException(responsePrefs.error)
      throw new Error("Account preferences couldn't be created")
    }
    user_account.preferences = await getAccountPreferences(
      user_account.address.toLowerCase()
    )
    user_account.is_invited = is_invited || false

    return user_account
  } catch (error) {
    console.error(error)
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
    } catch (_err) {
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
const findAccountByEmail = async (
  actor_address: string,
  email: string
): Promise<Array<LeanAccountInfo> | null> => {
  const { data, error } = await db.supabase.rpc<LeanAccountInfo>(
    'get_accounts_by_calendar_email',
    {
      p_address: actor_address,
      p_email: email.trim(),
      p_limit: 10,
      p_offset: 0,
    }
  )
  if (error) {
    Sentry.captureException(error)
    return null
  }
  return data
}
const findAccountsByEmails = async (emails: Array<string>) => {
  const { data, error } = await db.supabase.rpc<{
    [email: string]: Array<LeanAccountInfo>
  }>('get_accounts_by_calendar_emails', {
    p_emails: emails.map(email => email.trim().toLowerCase()),
    p_limit: 100,
    p_offset: 0,
  })
  if (error) {
    Sentry.captureException(error)
    return null
  }
  return Array.isArray(data) ? data[0] : data
}
const updateAccountPreferences = async (account: Account): Promise<Account> => {
  const preferences = { ...account.preferences! }
  preferences.name = preferences.name?.trim()
  preferences.description = preferences.description?.trim()
  preferences.socialLinks = preferences.socialLinks?.map(link => ({
    ...link,
    url: link.url?.trim(),
  }))

  const responsePrefsUpdate = await db.supabase
    .from('account_preferences')
    .update({
      description: preferences.description,
      name: preferences.name,
      socialLinks: preferences.socialLinks,
      meetingProviders: preferences.meetingProviders,
    })
    .match({ owner_account_address: account.address.toLowerCase() })

  if (responsePrefsUpdate.error) {
    Sentry.captureException(responsePrefsUpdate.error)
    throw new Error("Account preferences couldn't be updated")
  }

  account.preferences = await getAccountPreferences(
    account.address.toLowerCase()
  )

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
const updatePreferenceBanner = async (
  address: string,
  filename: string,
  buffer: Buffer,
  mimeType: string,
  banner_setting: BannerSetting
) => {
  const contentType = mimeType
  const file = `uploads/banners/${Date.now()}-${filename}`
  const { error } = await db.supabase.storage
    .from('avatars')
    .upload(file, buffer, {
      contentType,
      upsert: true,
    })

  if (error) {
    Sentry.captureException(error)
    throw new UploadError(
      'Unable to upload banner. Please try again or contact support if the problem persists.'
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
    .from<Tables<'account_preferences'>>('account_preferences')
    .update({ banner_url: publicUrl, banner_setting: banner_setting as Json })
    .eq('owner_account_address', address.toLowerCase())
  if (updateError) {
    Sentry.captureException(updateError)
    throw new UploadError(
      "Avatar uploaded successfully but couldn't update your profile. Please refresh and try again."
    )
  }

  return publicUrl
}

const updateGroupAvatar = async (
  group_id: string,
  filename: string,
  buffer: Buffer,
  mimeType: string
) => {
  const contentType = mimeType
  const file = `uploads/groups/${Date.now()}-${filename}`
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
    .from('groups')
    .update({ avatar_url: publicUrl })
    .eq('id', group_id)
  if (updateError) {
    Sentry.captureException(updateError)
    throw new UploadError(
      "Avatar uploaded successfully but couldn't update the group. Please refresh and try again."
    )
  }

  return publicUrl
}

const getGroupMemberAvailabilities = async (
  groupId: string,
  memberAddress: string
): Promise<AvailabilityBlock[]> => {
  const { data, error } = await db.supabase
    .from('group_availabilities')
    .select(
      `
      availabilities (
        id,
        title,
        timezone,
        weekly_availability,
        account_owner_address,
        created_at
      )
    `
    )
    .eq('group_id', groupId)
    .eq('member_id', memberAddress.toLowerCase())

  if (error) {
    throw new Error(
      `Failed to fetch group member availabilities: ${error.message}`
    )
  }

  if (!data) {
    return []
  }

  // Transform the data to match AvailabilityBlock interface
  return data.map((item: { availabilities: AvailabilityBlock }) => ({
    ...item.availabilities,
    isDefault: false,
  }))
}

const updateGroupMemberAvailabilities = async (
  groupId: string,
  memberAddress: string,
  availabilityIds: string[]
): Promise<void> => {
  const normalizedMemberAddress = memberAddress.toLowerCase()

  // Get current associations for this group member
  const { data: current, error: currentError } = await db.supabase
    .from('group_availabilities')
    .select('availability_id')
    .eq('group_id', groupId)
    .eq('member_id', normalizedMemberAddress)

  if (currentError) {
    throw new Error(
      `Failed to fetch current availabilities: ${currentError.message}`
    )
  }

  const currentIds = current?.map(c => c.availability_id) || []
  const newIds = availabilityIds

  const toDelete = currentIds.filter(id => !newIds.includes(id))
  const toInsert = newIds.filter(id => !currentIds.includes(id))

  // Delete removed associations
  if (toDelete.length > 0) {
    const { error: deleteError } = await db.supabase
      .from('group_availabilities')
      .delete()
      .eq('group_id', groupId)
      .eq('member_id', normalizedMemberAddress)
      .in('availability_id', toDelete)

    if (deleteError) {
      throw new Error('Failed to remove availability associations')
    }
  }

  // Insert new associations
  if (toInsert.length > 0) {
    const { error: insertError } = await db.supabase
      .from('group_availabilities')
      .insert(
        toInsert.map(availabilityId => ({
          group_id: groupId,
          member_id: normalizedMemberAddress,
          availability_id: availabilityId,
        }))
      )

    if (insertError) {
      throw new Error('Failed to add availability associations')
    }
  }
}

const getGroupMembersAvailabilities = async (
  groupId: string
): Promise<Record<string, AvailabilityBlock[]>> => {
  const { data, error } = await db.supabase
    .from('group_availabilities')
    .select(
      `
      member_id,
      availabilities (
        id,
        title,
        timezone,
        weekly_availability,
        account_owner_address,
        created_at
      )
    `
    )
    .eq('group_id', groupId)

  if (error) {
    throw new Error(
      `Failed to fetch group members availabilities: ${error.message}`
    )
  }

  if (!data) {
    return {}
  }

  // Group by member_id and transform to AvailabilityBlock[]
  const result: Record<string, AvailabilityBlock[]> = {}

  for (const item of data) {
    const memberId = item.member_id as string
    const availability = (item as { availabilities: AvailabilityBlock })
      .availabilities

    if (!result[memberId]) {
      result[memberId] = []
    }

    result[memberId].push({
      ...availability,
      isDefault: false,
    })
  }

  return result
}

const getAccountAvatarUrl = async (address: string): Promise<string | null> => {
  const { data, error } = await db.supabase
    .from('account_preferences')
    .select('avatar_url')
    .eq('owner_account_address', address.toLowerCase())
    .maybeSingle()
  if (error) {
    Sentry.captureException(error)
    return null
  }
  return data.avatar_url || null
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
const getAccountPreferencesLean = async (owner_account_address: string) => {
  const { data: account_preferences, error: account_preferences_error } =
    await db.supabase
      .from<Tables<'account_preferences'>>('account_preferences')
      .select('*')
      .eq('owner_account_address', owner_account_address.toLowerCase())
      .maybeSingle()
  if (account_preferences_error) {
    console.error(account_preferences_error)
    throw new Error("Couldn't get account's preferences")
  }
  return account_preferences
}
export const getAccountPreferences = async (
  owner_account_address: string
): Promise<AccountPreferences> => {
  try {
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
        .maybeSingle()
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
  } catch (e) {
    Sentry.captureException(e)
    throw new Error("Couldn't get account's preferences")
  }
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

    const [subscriptions, preferences, discord_account, payment_preferences] =
      await Promise.all([
        getSubscriptionFromDBForAccount(account.address),
        getAccountPreferences(account.address.toLowerCase()),
        includePrivateInformation
          ? getDiscordAccount(account.address)
          : undefined,
        includePrivateInformation
          ? getPaymentPreferences(account.address)
          : undefined,
      ])
    account.preferences = preferences
    account.subscriptions = subscriptions
    if (discord_account) account.discord_account = discord_account
    if (payment_preferences) account.payment_preferences = payment_preferences

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
  const payment_methods = [PaymentType.CRYPTO]
  const paymentAccount = await getActivePaymentAccountDB(account.address)
  if (
    paymentAccount?.provider_account_id &&
    paymentAccount.status === PaymentAccountStatus.CONNECTED
  ) {
    payment_methods.push(PaymentType.FIAT)
  }
  const meetingTypes = await getMeetingTypes(account.address, 100, 0)
  account.meetingTypes = meetingTypes.map(val => ({
    ...val,
    calendars: undefined,
  }))
  account.payment_methods = payment_methods

  return account
}

const getSlotsForAccount = async (
  account_address: string,
  start?: Date,
  end?: Date,
  limit = 1000,
  offset = 0
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
    .range(offset, offset + limit - 1)
    .order('start')

  if (error) {
    throw new Error(error.message)
    // //TODO: handle error
  }

  return data || []
}
const getSlotsForAccountWithConference = async (
  account_address: string,
  start?: Date,
  end?: Date,
  limit = 1000,
  offset = 0
): Promise<
  Array<ExtendedEventDBSlot | ExtendedSlotInstance | ExtendedSlotSeries>
> => {
  const account = await getAccountFromDB(account_address)

  const _start = start ? start.toISOString() : '1970-01-01'
  const _end = end ? end.toISOString() : '2500-01-01'
  const [
    { data: slots, error: slotError },
    { data: slotInstances },
    { data: slotSeries },
  ] = await Promise.all([
    db.supabase
      .from<ExtendedEventDBSlot>('slots')
      .select()
      .eq('account_address', account.address)
      .eq('recurrence', MeetingRepeat.NO_REPEAT)
      .or(
        `and(start.gte.${_start},end.lte.${_end}),and(start.lte.${_start},end.gte.${_end}),and(start.gt.${_start},end.lte.${_end}),and(start.gte.${_start},end.lt.${_end})`
      )
      .range(offset, offset + limit - 1)
      .order('start'),
    db.supabase.rpc<ExtendedSlotInstance>('get_slot_instances_with_meetings', {
      p_account_address: account.address,
      p_time_min: _start,
      p_time_max: _end,
    }),
    db.supabase.rpc<ExtendedSlotSeries>(
      'get_meeting_series_without_instances',
      {
        p_account_address: account.address,
        p_time_min: _start,
        p_time_max: _end,
      }
    ),
  ])

  if (slotError) {
    throw new Error(slotError.message)
    // //TODO: handle error
  }
  const conferenceDataMap = await getMultipleConferenceIdsDataBySlotId(
    slots?.map(slot => slot.id).filter(id => id) as string[]
  )
  for (const slot of slots) {
    if (!slot.id) continue
    const conferenceMeeting = conferenceDataMap.get(slot.id)
    slot.meeting_id = conferenceMeeting?.id
  }
  return slots.concat(slotInstances || []).concat(slotSeries || [])
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
    .range(offset || 0, (offset || 0) + (limit ? limit - 1 : 1000))
    .order('start')

  if (error) {
    throw new Error(error.message)
    // //TODO: handle error
  }

  return data || []
}
const updateRecurringSlots = async (identifier: string) => {
  const account = await getAccountFromDB(identifier)
  const now = new Date()
  const { data: allSlots, error } = await db.supabase
    .from<Tables<'slots'>>('slots')
    .select()
    .eq('account_address', account.address)
    .lte('end', now.toISOString())
    .neq('recurrence', MeetingRepeat.NO_REPEAT)
  if (error) {
    return
  }
  if (allSlots) {
    const toUpdate = []
    for (const slot of allSlots) {
      const { data: slotSeries, error } = await db.supabase
        .from<Tables<'slot_series'>>('slot_series')
        .select()
        .eq('slot_id', slot.id)
        .maybeSingle()
      if (
        error ||
        !slotSeries ||
        !slotSeries?.original_start ||
        !slotSeries?.original_end
      ) {
        continue
      }

      const interval = addRecurrence(
        new Date(slotSeries?.original_start),
        new Date(slotSeries?.original_end),
        slotSeries.recurrence as MeetingRepeat
      )
      const { data: slotInstance, error: slotInstanceError } = await db.supabase
        .from<Tables<'slot_instance'>>('slot_instance')
        .select()
        .eq('id', `${slot.id}_${interval.start.getTime()}`)
        .maybeSingle()
      if (slotInstanceError) {
        continue
      }
      if (slotInstance) {
        if (slotInstance.status === RecurringStatus.CANCELLED) {
          continue
        }
        const newSlot: TablesInsert<'slots'> = {
          id: slot.id!,
          account_address: slot.account_address,
          meeting_info_encrypted:
            slotInstance.override_meeting_info_encrypted ||
            slot.meeting_info_encrypted,
          start: slotInstance.start,
          end: slotInstance.end,
          recurrence: slot.recurrence,
          created_at: new Date(slot.created_at || new Date()).toISOString(),
          role: slotInstance.role,
          version: slotInstance.version,
        }
        toUpdate.push(newSlot)
      }
    }
    if (toUpdate.length > 0) {
      await db.supabase.from('slots').upsert(toUpdate)
    }
  }
}
const updateAllRecurringSlots = async () => {
  const BATCH_SIZE = 50
  const now = new Date()
  const { data: allSlotSeries, error } = await db.supabase
    .from<Tables<'slot_series'>>('slot_series')
    .select()
    .neq('recurrence', MeetingRepeat.NO_REPEAT)
  if (error || !allSlotSeries?.length) return
  const slotIds = allSlotSeries.map(s => s.slot_id).filter(Boolean)
  const { data: slots, error: slotsError } = await db.supabase
    .from<Tables<'slots'>>('slots')
    .select()
    .in('id', slotIds)
  if (slotsError) {
    console.error(
      '[updateAllRecurringSlots]: Failed to fetch slots',
      slotsError
    )
    throw slotsError
  }

  const slotMap = new Map(slots?.map(s => [s.id, s]) || [])

  const toUpdate: TablesInsert<'slots'>[] = []
  let processed = 0
  let skipped = 0

  const batchIds = []
  for (const slotSeries of allSlotSeries) {
    const slot = slotMap.get(slotSeries.slot_id!)
    if (!slot || new Date(slot.start) > now) {
      continue
    }
    const interval = addRecurrence(
      new Date(slotSeries?.original_start),
      new Date(slotSeries?.original_end),
      slotSeries.recurrence as MeetingRepeat
    )
    batchIds.push(`${slotSeries.slot_id!}_${interval.start.getTime()}`)
  }
  const { data: slotInstances, error: slotInstancesError } = await db.supabase
    .from<Tables<'slot_instance'>>('slot_instance')
    .select()
    .in('id', batchIds)

  if (slotInstancesError) {
    console.error(
      '[updateAllRecurringSlots]: Failed to fetch slot instances',
      slotInstancesError
    )
    throw slotInstancesError
  }
  const slotInstanceMap = new Map(slotInstances?.map(s => [s.id, s]) || [])
  for (const slotSeries of allSlotSeries) {
    const slot = slotMap.get(slotSeries.slot_id!)
    if (!slot || new Date(slot.start) > now) {
      skipped++
      continue
    }
    const interval = addRecurrence(
      new Date(slotSeries?.original_start),
      new Date(slotSeries?.original_end),
      slotSeries.recurrence as MeetingRepeat
    )
    const slotInstance = slotInstanceMap.get(
      `${slotSeries.slot_id!}_${interval.start.getTime()}`
    )

    if (!slotInstance) {
      skipped++
      continue
    }

    if (slotInstance.status === RecurringStatus.CANCELLED) {
      continue
    }

    const newSlot: TablesInsert<'slots'> = {
      id: slotSeries.slot_id!,
      account_address: slotSeries.account_address,
      meeting_info_encrypted:
        slotInstance.override_meeting_info_encrypted ||
        slotSeries.default_meeting_info_encrypted,
      start: slotInstance.start,
      end: slotInstance.end,
      recurrence: slotSeries.recurrence,
      created_at: new Date(slotSeries.created_at || new Date()).toISOString(),
      role: slotInstance.role,
      version: slotInstance.version,
    }
    toUpdate.push(newSlot)

    processed++

    // update batch all at once to avoid a huge memory spike when all data has been processed
    if (toUpdate.length >= BATCH_SIZE) {
      const { error: upsertError } = await db.supabase
        .from('slots')
        .upsert(toUpdate)
      if (upsertError) {
        console.error(
          '[updateAllRecurringSlots] Batch upsert failed',
          upsertError
        )
        throw upsertError
      }
      toUpdate.length = 0
    }
  }
  if (toUpdate.length > 0) {
    const { error: upsertError } = await db.supabase
      .from('slots')
      .upsert(toUpdate)
    if (upsertError) {
      console.error(
        '[updateAllRecurringSlots] Final upsert failed',
        upsertError
      )
      throw upsertError
    }
  }

  // eslint-disable-next-line no-restricted-syntax
  console.info('[updateAllRecurringSlots] Complete', {
    processed,
    skipped,
    total: allSlotSeries.length,
  })
}
const syncAllSeries = async () => {
  const BATCH_SIZE = 100
  const now = new Date()

  const { data: allSlots } = await db.supabase
    .from('slots')
    .select()
    .lte('end', now.toISOString())
    .neq('recurrence', MeetingRepeat.NO_REPEAT)
  const seriesToAddPromises = []
  const instancesToInsert: Array<TablesInsert<'slot_instance'>> = []

  const { data: slotSeries, error } = await db.supabase
    .from<Tables<'slot_series'>>('slot_series')
    .select()
    .in(
      'slot_id',
      (allSlots || []).map(slot => slot.id)
    )
  const slotSeriesMap = new Map<string, Tables<'slot_series'>>(
    (slotSeries || []).map(series => [series.slot_id, series])
  )
  const { data: latestInstances, error: instancesError } =
    await db.supabase.rpc<Tables<'slot_instance'>>(
      'get_latest_instances_per_series',
      {
        series_ids: (slotSeries || []).map(s => s.id).filter(Boolean),
      }
    )

  if (instancesError) {
    console.error('[syncAllSeries] Failed to fetch instances', instancesError)
    throw instancesError
  }

  // O(n) map creation - one instance per series guaranteed
  const instancesBySeriesMap = new Map<string, Tables<'slot_instance'>>(
    (latestInstances || []).map(instance => [instance.series_id, instance])
  )
  for (const slot of allSlots || []) {
    const slotSeries = slotSeriesMap.get(slot.id!)
    if (error || !slotSeries) {
      seriesToAddPromises.push(saveRecurringMeetings([slot], slot.recurrence))
      continue
    }
    const slotInstance = instancesBySeriesMap.get(slotSeries.id!)
    if (!slotInstance) {
      console.error('No slot instance found for series:', slotSeries.id)
      continue
    }

    if (!slotSeries.rrule || slotSeries.rrule.length === 0) {
      continue
    }
    const rule = rrulestr(slotSeries.rrule[0], {
      dtstart: new Date(slot[0].start), // The original start time of the series
    })

    const differenceToAMonth = DateTime.fromJSDate(now).diff(
      DateTime.fromISO(slotInstance?.start),
      'months'
    ).months
    if (differenceToAMonth <= 1) {
      const timeStamp = slotInstance.id.split('_')[1]
      const lastInstanceDate = new Date(parseInt(timeStamp))
      const lastInstanceDateTime = DateTime.fromJSDate(lastInstanceDate)

      const templateTime = {
        hour: lastInstanceDateTime.hour,
        minute: lastInstanceDateTime.minute,
        second: lastInstanceDateTime.second,
        millisecond: lastInstanceDateTime.millisecond,
      }
      const start = DateTime.fromJSDate(lastInstanceDate)
      const maxLimit = start.plus({ months: 3 })
      const ghostStartTimes = rule.between(
        start.toJSDate(),
        maxLimit.toJSDate(),
        true
      )
      const duration_minutes = DateTime.fromJSDate(new Date(slot.end)).diff(
        DateTime.fromJSDate(new Date(slot.start)),
        'minutes'
      ).minutes
      const toInsert = ghostStartTimes.map(ghostStartRaw => {
        const ghostStartDate = DateTime.fromJSDate(ghostStartRaw)
        const startDateTime = ghostStartDate.set(templateTime) // Force same hour/minute
        const endDateTime = startDateTime.plus({ minutes: duration_minutes })

        const startMillis = startDateTime.toMillis()
        const startISO = startDateTime.toISO()
        const endISO = endDateTime.toISO()
        const newSlot: TablesInsert<'slot_instance'> = {
          account_address: slot.account_address || null,
          override_meeting_info_encrypted: null,
          role: slot.role!,
          id: `${slot.id}_${startMillis}`,
          created_at: new Date().toISOString(),
          version: slot.version!,
          start: startISO!,
          end: endISO!,
          status: RecurringStatus.CONFIRMED,
          series_id: slotSeries.id,
          guest_email: slot.guest_email || null,
        }
        return newSlot
      })
      instancesToInsert.push(...toInsert)
    }

    if (instancesToInsert.length >= BATCH_SIZE) {
      const batchToInsert = instancesToInsert.splice(0, BATCH_SIZE)
      const { error: insertError } = await db.supabase
        .from('slot_instance')
        .insert(batchToInsert)

      if (insertError) {
        console.error('[syncAllSeries] Batch insert failed', insertError)
      }
    }
  }
  if (instancesToInsert.length > 0) {
    const { error: insertError } = await db.supabase
      .from('slot_instance')
      .insert(instancesToInsert)

    if (insertError) {
      console.error('[syncAllSeries] Final insert failed', insertError)
    }
  }

  // Process series additions
  if (seriesToAddPromises.length > 0) {
    await Promise.allSettled(seriesToAddPromises)
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
    .range(offset, offset + limit - 1) // to account for supabase's inclusive ranges
    .order('start')

  if (error) {
    throw new Error(error.message)
    // //TODO: handle error
  }
  const conferenceDataMap = await getMultipleConferenceDataBySlotId(
    data?.map(slot => slot.id).filter(id => id) as string[]
  )
  for (const slot of data) {
    if (!slot.id) continue
    const conferenceMeeting = conferenceDataMap.get(slot.id)
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
const getSlotById = async (slotId: string): Promise<DBSlot> => {
  const { data, error } = await db.supabase
    .from('slots')
    .select()
    .eq('id', slotId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  return data
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
    if (!meetingType) {
      throw new MeetingTypeNotFound()
    }
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
  return busySlots.every(slot => !slot.overlaps(interval))
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
const getSlotByMeetingIdAndAccount = async (
  meeting_id: string,
  account_address?: string
): Promise<AccountSlot | GuestSlot> => {
  const { data, error } = await db.supabase.rpc('get_meeting_primary_slot', {
    p_meeting_id: meeting_id,
    p_account_address: account_address?.toLowerCase(),
  })

  if (error) {
    throw new Error(error.message)
    // todo handle error
  }

  return Array.isArray(data) ? data[0] : data
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
    .in(
      'id',
      slotIds.map(id => id.split('_')[0])
    )

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
const getMultipleConferenceDataBySlotId = async (
  slotIds: string[]
): Promise<Map<string, ConferenceMeeting>> => {
  if (slotIds.length === 0) {
    return new Map()
  }
  const { data, error } = await db.supabase.rpc<ConferenceMeeting>(
    'get_meetings_by_slot_ids',
    {
      slot_ids: slotIds, // This should be a proper JavaScript array
    }
  )
  if (error) {
    throw new Error(error.message)
  }

  const slotToMeetingMap = new Map<string, ConferenceMeeting>()

  data?.forEach(meeting => {
    if (meeting.slots && Array.isArray(meeting.slots)) {
      meeting.slots.forEach(slotId => {
        if (slotIds.includes(slotId)) {
          slotToMeetingMap.set(slotId, meeting)
        }
      })
    }
  })

  return slotToMeetingMap
}
const getMultipleConferenceIdsDataBySlotId = async (
  slotIds: string[]
): Promise<Map<string, Pick<ConferenceMeeting, 'id'>>> => {
  if (slotIds.length === 0) {
    return new Map()
  }
  const { data, error } = await db.supabase.rpc<ConferenceMeeting>(
    'get_meeting_id_by_slot_ids',
    {
      slot_ids: slotIds, // This should be a proper JavaScript array
    }
  )
  if (error) {
    throw new Error(error.message)
  }

  const slotToMeetingMap = new Map<string, Pick<ConferenceMeeting, 'id'>>()

  data?.forEach(meeting => {
    if (meeting.slots && Array.isArray(meeting.slots)) {
      meeting.slots.forEach(slotId => {
        if (slotIds.includes(slotId)) {
          slotToMeetingMap.set(slotId, meeting)
        }
      })
    }
  })

  return slotToMeetingMap
}
const getGuestSlotById = async (slotId: string): Promise<GuestSlot> => {
  const { data, error } = await db.supabase
    .from<GuestSlot>('slots')
    .select('*')
    .eq('id', slotId)
    .maybeSingle()
  if (error) {
    throw new Error(error.message)
  }
  if (!data) {
    throw new MeetingNotFoundError(slotId)
  }
  return data
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
    addressesToRemove = slotData
      .map(s => s.account_address)
      .filter((s): s is string => !!s)
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
    conferenceMeeting.encrypted_metadata = await encryptWithPublicKey(
      process.env.NEXT_PUBLIC_SERVER_PUB_KEY!,
      JSON.stringify({
        ...decryptedMeetingData,
        related_slot_ids: conferenceMeeting.slots,
      })
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
    let meeting_info_encrypted: Encrypted
    if (slot.account_address) {
      const account = await getAccountFromDB(slot.account_address)
      meeting_info_encrypted = await encryptWithPublicKey(
        account.internal_pub_key,
        JSON.stringify(decryptedMeetingData)
      )
    } else {
      meeting_info_encrypted = await encryptWithPublicKey(
        process.env.NEXT_PUBLIC_SERVER_PUB_KEY!,
        JSON.stringify(decryptedMeetingData)
      )
    }
    await db.supabase
      .from('slots')
      .update({
        meeting_info_encrypted,
        // Don't increment version for background sync operations
        // The version was already incremented during the original cancellation
      })
      .eq('id', slot.id)
  }
}
const deleteRecurringSlotInstances = async (slotIds: string[]) => {
  const { data } = await db.supabase
    .from<Tables<'slot_series'>>('slot_series')
    .delete()
    .in('slot_id', slotIds)
  if (data) {
    const seriesIds = data.map(d => d.id)
    await db.supabase.from('slot_instance').delete().in('series_id', seriesIds)
  }
}
// biome-ignore lint/correctness/noUnusedVariables: The function is intended to be ised for future side effects
const upsertRecurringInstances = async (
  slots: Array<TablesInsert<'slots'>>,
  recurrence: MeetingRepeat,
  newStartDate: string,
  rrule: Array<string> = []
) => {
  if (recurrence === MeetingRepeat.NO_REPEAT) return
  const { data } = await db.supabase
    .from<Tables<'slot_series'>>('slot_series')
    .select()
    .in(
      'slot_id',
      slots.map(s => s.id!)
    )
  const rule = rrulestr(rrule[0], {
    dtstart: new Date(slots[0].start), // The original start time of the series
  })

  if (data) {
    const seriesIds = data.map(d => d.id)
    await db.supabase
      .from<Tables<'slot_instance'>>('slot_instance')
      .update({
        status: RecurringStatus.MODIFIED,
      })
      .in('series_id', seriesIds)
      .lt('start', newStartDate)
    await db.supabase
      .from<Tables<'slot_instance'>>('slot_instance')
      .delete()
      .in('series_id', seriesIds)
      .gte('start', newStartDate)
  }
  const toInsertPromise = slots.map(async (slot: TablesInsert<'slots'>) => {
    const id = data?.find(d => d.slot_id === slot.id)?.id
    if (id) {
      const { data, error } = await db.supabase
        .from<Tables<'slot_series'>>('slot_series')
        .upsert([
          {
            id,
            account_address: slot.account_address || null,
            default_meeting_info_encrypted: slot.meeting_info_encrypted,
            recurrence:
              rrule.length > 0 ? getMeetingRepeatFromRule(rule) : recurrence,
            original_end: slot.end,
            original_start: slot.start,
            slot_id: slot.id!,
            created_at: new Date().toISOString(),
            guest_email: slot.guest_email || null,
            rrule:
              rrule.length > 0
                ? rrule
                : handleRRULEForMeeting(recurrence, new Date(slot.start)),
          },
        ])
      if (error) console.error(error)
      const slotSeries = data?.[0]
      if (!slotSeries) return

      const start = DateTime.fromJSDate(new Date(slot.start))
      const maxLimit = start.plus({ months: 6 })
      const ghostStartTimes = rule.between(
        start.toJSDate(),
        maxLimit.toJSDate(),
        true
      )
      const duration_minutes = DateTime.fromJSDate(new Date(slot.end)).diff(
        DateTime.fromJSDate(new Date(slot.start)),
        'minutes'
      ).minutes
      const toInsert = ghostStartTimes.map(ghostStart => {
        const start = DateTime.fromJSDate(ghostStart)
        const end = start.plus({ minutes: Math.abs(duration_minutes) })
        const newSlot: TablesInsert<'slot_instance'> = {
          account_address: slot.account_address || null,
          override_meeting_info_encrypted: null,
          role: slot.role!,
          id: `${slot.id}_${ghostStart.getTime()}`,
          created_at: new Date().toISOString(),
          version: slot.version!,
          start: ghostStart.toISOString(),
          end: end.toJSDate().toISOString(),
          status: RecurringStatus.CONFIRMED,
          series_id: slotSeries.id,
          guest_email: slot.guest_email || null,
        }
        return newSlot
      })
      return toInsert
    }
    return []
  })
  const toInsertResolved = await Promise.all(toInsertPromise)
  const toInsert = toInsertResolved
    .flat()
    .filter((val): val is TablesInsert<'slot_instance'> => val !== undefined)
  await db.supabase
    .from('slot_instance')
    .insert(toInsert)
    .then(({ error }) => {
      if (error) console.error(error)
    })
}
const deleteMeetingFromDB = async (
  participantActing: ParticipantBaseInfo,
  slotIds: string[],
  guestsToRemove: ParticipantInfo[],
  meeting_id: string,
  timezone: string,
  reason?: string,
  title?: string,
  eventId?: string | null,
  skipRecurrenceUpdate = false
) => {
  if (!slotIds?.length) throw new Error('No slot ids provided')
  const instanceSlotIds = slotIds.filter(slot => slot.includes('_'))
  const compositeSlots = slotIds.filter(slot => !slot.includes('_'))
  const cleanedSlotIds = slotIds.map(id => id.split('_')[0])
  const toDeleteSlotInstances: TablesInsert<'slot_instance'>[] = []
  let addresses: string[] = []
  let start: Date = new Date()
  let end: Date = new Date()
  let created_at: Date = new Date()
  if (instanceSlotIds.length > 0) {
    const { data: instanceSlots } = await db.supabase
      .from<Tables<'slot_instance'>>('slot_instance')
      .select()
      .in('id', instanceSlotIds)
    if (instanceSlots && instanceSlots.length > 0) {
      addresses = addresses.concat(
        instanceSlots
          .map(s => s.account_address)
          .filter((s): s is string => !!s)
      )
      start = new Date(instanceSlots[0].start)
      end = new Date(instanceSlots[0].end)
      created_at = new Date(instanceSlots[0].created_at || new Date())
      for (const instance of instanceSlots) {
        toDeleteSlotInstances.push({
          ...instance,
          status: RecurringStatus.CANCELLED,
        })
      }
    }
    if (toDeleteSlotInstances.length > 0) {
      const { error } = await db.supabase
        .from('slot_instance')
        .upsert(toDeleteSlotInstances)
      if (error) {
        throw new Error(error.message)
      }
    }
  }
  if (compositeSlots.length > 0) {
    const { data: compositeSlotsData } = await db.supabase
      .from<DBSlot>('slots')
      .select()
      .in('id', compositeSlots)
    if (compositeSlotsData && compositeSlotsData.length > 0) {
      addresses = addresses.concat(
        compositeSlotsData
          .map(s => s.account_address)
          .filter((s): s is string => !!s)
      )
      start = new Date(compositeSlotsData[0].start)
      end = new Date(compositeSlotsData[0].end)
      created_at = new Date(compositeSlotsData[0].created_at || new Date())
    }
    const { error } = await db.supabase
      .from('slots')
      .delete()
      .in('id', compositeSlots)
    if (error) {
      throw new Error(error.message)
    }
  }

  if (!skipRecurrenceUpdate) {
    await deleteRecurringSlotInstances(compositeSlots)
  }

  const body: MeetingCancelSyncRequest = {
    participantActing,
    addressesToRemove: addresses,
    guestsToRemove,
    meeting_id,
    start,
    end,
    created_at,
    title,
    timezone,
    reason,
    eventId,
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

  const slots: Array<TablesInsert<'slots'>> = []
  let meetingResponse = {} as TablesInsert<'slots'>
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
      const dbSlot: TablesInsert<'slots'> = {
        id: participant.slot_id!,
        start: new Date(meeting.start).toISOString(),
        end: new Date(meeting.end).toISOString(),
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
    } else if (participant.guest_email && participant.slot_id) {
      const dbSlot: TablesInsert<'slots'> = {
        id: participant.slot_id,
        start: new Date(meeting.start).toISOString(),
        end: new Date(meeting.end).toISOString(),
        version: 0,
        meeting_info_encrypted: participant.privateInfo,
        recurrence: meeting.meetingRepeat,
        role: participant.type,
        guest_email: participant.guest_email,
      }
      slots.push(dbSlot)
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
    version: MeetingVersion.V3,
    slots: meeting.allSlotIds || [],
    title: meeting.title,
    permissions: meeting.meetingPermissions,
    encrypted_metadata: meeting.encrypted_metadata,
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
  if (meeting.meetingRepeat) {
    await saveRecurringMeetings(slots, meeting.meetingRepeat, meeting.rrule)
  }

  // TODO switch this to check if scheduler is guest slot
  meetingResponse.id = data[index].id
  meetingResponse.created_at = data[index].created_at

  const body: MeetingCreationSyncRequest = {
    participantActing,
    meeting_id: meeting.meeting_id,
    start: meeting.start,
    end: meeting.end,
    created_at: new Date(meetingResponse.created_at!),
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
  return {
    ...meetingResponse,
    start: new Date(meetingResponse.start!),
    end: new Date(meetingResponse.end!),
    created_at: new Date(meetingResponse.created_at!),
    version: meetingResponse.version!,
    meeting_info_encrypted:
      meetingResponse.meeting_info_encrypted! as Encrypted,
    recurrence: meetingResponse.recurrence as MeetingRepeat,
    role: meetingResponse.role as ParticipantType,
  }
}
const saveRecurringMeetings = async (
  slots: Array<TablesInsert<'slots'>>,
  recurrence: MeetingRepeat,
  rrule: Array<string> = []
) => {
  if (recurrence === MeetingRepeat.NO_REPEAT) return
  const rule = rrulestr(rrule[0], {
    dtstart: new Date(slots[0].start), // The original start time of the series
  })

  const toInsertPromise = slots.map(async (slot: TablesInsert<'slots'>) => {
    const { data, error } = await db.supabase
      .from<Tables<'slot_series'>>('slot_series')
      .insert([
        {
          account_address: slot.account_address || null,
          default_meeting_info_encrypted: slot.meeting_info_encrypted,
          recurrence:
            rrule.length > 0 ? getMeetingRepeatFromRule(rule) : recurrence,
          original_end: slot.end,
          original_start: slot.start,
          slot_id: slot.id!,
          created_at: new Date().toISOString(),
          guest_email: slot.guest_email || null,
          rrule:
            rrule.length > 0
              ? rrule
              : handleRRULEForMeeting(recurrence, new Date(slot.start)),
        },
      ])
    if (error) console.error(error)
    const slotSeries = data?.[0]
    if (!slotSeries) return

    const start = DateTime.fromJSDate(new Date(slot.start))
    const maxLimit = start.plus({ months: 6 })
    const ghostStartTimes = rule.between(
      start.toJSDate(),
      maxLimit.toJSDate(),
      true
    )
    const duration_minutes = DateTime.fromJSDate(new Date(slot.end)).diff(
      start,
      'minutes'
    ).minutes
    const toInsert = ghostStartTimes.map(ghostStart => {
      const start = DateTime.fromJSDate(ghostStart)
      const end = start.plus({ minutes: Math.abs(duration_minutes) })
      const newSlot: TablesInsert<'slot_instance'> = {
        account_address: slot.account_address || null,
        override_meeting_info_encrypted: null,
        role: slot.role!,
        id: `${slot.id}_${ghostStart.getTime()}`,
        created_at: new Date().toISOString(),
        version: slot.version!,
        start: ghostStart.toISOString(),
        end: end.toJSDate().toISOString(),
        status: RecurringStatus.CONFIRMED,
        series_id: slotSeries.id,
        guest_email: slot.guest_email || null,
      }
      return newSlot
    })
    return toInsert
  })
  const toInsertResolved = await Promise.all(toInsertPromise)
  const toInsert = toInsertResolved
    .flat()
    .filter((val): val is TablesInsert<'slot_instance'> => val !== undefined)
  await db.supabase
    .from('slot_instance')
    .insert(toInsert)
    .then(({ error }) => {
      if (error) console.error(error)
    })
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

// Get account info for billing emails (email and display name)
const getBillingEmailAccountInfo = async (
  accountAddress: string
): Promise<BillingEmailAccountInfo | null> => {
  try {
    // Get email from account notification subscriptions
    const email = await getAccountNotificationSubscriptionEmail(
      accountAddress.toLowerCase()
    )

    if (!email) {
      return null
    }

    // Get account to derive display name
    const account = await getAccountFromDB(accountAddress.toLowerCase(), false)
    const displayName =
      account.preferences?.name || ellipsizeAddress(account.address)

    return {
      email,
      displayName,
    }
  } catch (error) {
    Sentry.captureException(error)
    return null
  }
}

const getGroupsAndMembers = async (
  address: string,
  limit?: string,
  offset?: string,
  search?: string,
  includeInvites?: boolean
): Promise<Array<GetGroupsFullResponse>> => {
  const { data, error } = await db.supabase.rpc<GetGroupsFullResponse>(
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

  return data.map(group => {
    const memberAvailabilities: AvailabilityBlock[] = Array.isArray(
      group.member_availabilities
    )
      ? group.member_availabilities.map((avail: AvailabilityBlock) => ({
          ...avail,
          isDefault: false,
        }))
      : []

    return {
      id: group.id,
      name: group.name,
      slug: group.slug,
      avatar_url: group.avatar_url ?? null,
      description: group.description ?? null,
      members: deduplicateMembers(
        group.members.filter(member => {
          if (includeInvites) {
            return true
          }
          return !member.invitePending
        }) || []
      ),
      member_availabilities: memberAvailabilities,
    }
  }) as GetGroupsFullResponse[]
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
): Promise<Array<Tables<'group_members'>>> => {
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
  void fetch(`${apiUrl}/server/groups/syncAndNotify`, {
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
      .range(offset || 0, (offset || 0) + (limit ? limit - 1 : 1000))
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
    slug,
    avatar_url,
    description
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
  slug?: string,
  avatar_url?: string,
  description?: string
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
  if (avatar_url !== undefined) {
    data.avatar_url = avatar_url
  }
  if (description !== undefined) {
    data.description = description
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
    limit,
  }: {
    syncOnly?: boolean
    limit?: number
  } = {}
): Promise<ConnectedCalendar[]> => {
  const isPro = await isProAccountAsync(address)
  const effectiveLimit = !isPro ? 1 : limit !== undefined ? limit : undefined

  const query = db.supabase
    .from('connected_calendars')
    .select()
    .eq('account_address', address.toLowerCase())
    .order('created', { ascending: true })

  if (effectiveLimit) {
    query.limit(effectiveLimit)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  if (!data) return []

  let connectedCalendars: ConnectedCalendar[] = data

  connectedCalendars = connectedCalendars.filter(cal => {
    if (!cal.calendars || !Array.isArray(cal.calendars)) {
      return false
    }
    return cal.calendars.some((c: { enabled?: boolean }) => c.enabled === true)
  })

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

const getQuickPollCalendars = async (
  participantId: string,
  {
    syncOnly,
    activeOnly: _activeOnly,
  }: {
    syncOnly?: boolean
    activeOnly?: boolean
  }
): Promise<ConnectedCalendar[]> => {
  const { data, error } = await db.supabase
    .from('quick_poll_calendars')
    .select('*')
    .eq('participant_id', participantId)
    .order('id', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  if (!data) return []

  const connectedCalendars: ConnectedCalendar[] = (
    data as QuickPollCalendar[]
  ).map(calendar => ({
    id: calendar.id,
    account_address: '',
    email: calendar.email,
    provider: calendar.provider as TimeSlotSource,
    payload: calendar.payload as Credentials,
    calendars: calendar.calendars || [],
    enabled: true,
    created: new Date(calendar.created_at) || new Date(),
  }))

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

// Count calendar integrations for an account
const countCalendarIntegrations = async (
  account_address: string
): Promise<number> => {
  const { count, error } = await db.supabase
    .from('connected_calendars')
    .select('*', { count: 'exact', head: true })
    .eq('account_address', account_address.toLowerCase())

  if (error) {
    Sentry.captureException(error)
    throw new Error(`Failed to count calendar integrations: ${error.message}`)
  }

  return count || 0
}

// Count calendars with sync enabled for an account
// Optionally exclude a specific integration (when updating that integration)
const countCalendarSyncs = async (
  account_address: string,
  excludeProvider?: TimeSlotSource,
  excludeEmail?: string
): Promise<number> => {
  const { data, error } = await db.supabase
    .from('connected_calendars')
    .select('calendars, provider, email')
    .eq('account_address', account_address.toLowerCase())

  if (error) {
    Sentry.captureException(error)
    throw new Error(`Failed to count calendar syncs: ${error.message}`)
  }

  if (!data) return 0

  // Count calendars with sync: true across all integrations
  // Exclude the specified integration if provided (when updating)
  let syncCount = 0
  for (const integration of data) {
    // Skip excluded integration
    if (
      excludeProvider &&
      excludeEmail &&
      integration.provider === excludeProvider &&
      integration.email?.toLowerCase() === excludeEmail.toLowerCase()
    ) {
      continue
    }

    const calendars = integration.calendars as CalendarSyncInfo[]
    if (Array.isArray(calendars)) {
      syncCount += calendars.filter(cal => cal.sync === true).length
    }
  }

  return syncCount
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
  payload: unknown
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
  // run this as a background operation so it doesn't block the main flow as they'll be added anyways via cron jobs if this fails
  void handleCalendarConnectionCleanups(
    address,
    email,
    provider,
    payload as Credentials,
    calendars,
    calendar
  )
  return calendar
}

const handleCalendarConnectionCleanups = async (
  address: string,
  email: string,
  provider: TimeSlotSource,
  payload: Credentials,
  calendars: CalendarSyncInfo[],
  calendar: ConnectedCalendar
) => {
  try {
    await addNewCalendarToAllExistingMeetingTypes(address, calendar)
  } catch (e) {
    Sentry.captureException(e, {
      extra: {
        accountAddress: address,
        email,
        provider,
      },
    })
  }
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
  integration: IGoogleCalendarService
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
    } else {
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

const updateRecurringSlotInstances = async (
  slots: Array<TablesInsert<'slots'>>,
  rrule: Array<string>
) => {
  const rule = rrulestr(rrule[0], {
    dtstart: new Date(slots[0].start), // The original start time of the series
  })

  const updatePromises = slots.map(async (slot: TablesInsert<'slots'>) => {
    if (!slot.id) return
    const { data, error } = await db.supabase
      .from<Tables<'slot_series'>>('slot_series')
      .upsert(
        [
          {
            account_address: slot.account_address,
            recurrence: getMeetingRepeatFromRule(rule),
            slot_id: slot.id,
            default_meeting_info_encrypted: slot.meeting_info_encrypted,
            rrule,
          },
        ],
        { onConflict: 'slot_id' }
      )

    if (error) {
      Sentry.captureException(error, {
        extra: {
          slot,
        },
      })
      posthogClient.captureException(error, undefined, {
        extra: {
          slot,
        },
      })
    }
    const slotSeries = data ? data[0] : null
    if (!slotSeries) return
    await bulkUpdateSlotSeriesConfirmedSlots(
      slotSeries!.id,
      new Date(slot.start),
      new Date(slot.end)
    )
  })
  await Promise.all(updatePromises)
}
const parseParticipantSlots = async (
  participantActing: ParticipantBaseInfo,
  meetingUpdateRequest: MeetingUpdateRequest
) => {
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
  const slots: Array<TablesInsert<'slots'>> = []
  let meetingResponse = {} as TablesInsert<'slots'>
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

  const timezone =
    schedulerAccount?.timeZone ||
    meetingUpdateRequest.participants_mapping[0].timeZone
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

        if (isEditing && participant.slot_id) {
          let existingSlot: DBSlot
          if (participant.slot_id.includes('_')) {
            existingSlot = await getSlotInstance(participant.slot_id)
          } else {
            existingSlot = await getMeetingFromDB(participant.slot_id)
          }
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
      const dbSlot: TablesInsert<'slots'> = {
        id: participant.slot_id!,
        start: new Date(meetingUpdateRequest.start).toISOString(),
        end: new Date(meetingUpdateRequest.end).toISOString(),
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
    } else if (participant.guest_email && participant.slot_id) {
      const dbSlot: TablesInsert<'slots'> = {
        id: participant.slot_id,
        start: new Date(meetingUpdateRequest.start).toISOString(),
        end: new Date(meetingUpdateRequest.end).toISOString(),
        version: meetingUpdateRequest.version,
        meeting_info_encrypted: participant.privateInfo,
        recurrence: meetingUpdateRequest.meetingRepeat,
        role: participant.type,
        guest_email: participant.guest_email,
      }
      slots.push(dbSlot)
    }
  }
  return { slots, index, meetingResponse, changingTime, timezone }
}
const updateMeeting = async (
  participantActing: ParticipantBaseInfo,
  meetingUpdateRequest: MeetingUpdateRequest,
  options: {
    force?: boolean
    skipRecurrenceUpdate?: boolean
    skipNoitfiation?: boolean
  } = {}
): Promise<DBSlot> => {
  const { meetingResponse, slots, index, changingTime, timezone } =
    await parseParticipantSlots(participantActing, meetingUpdateRequest)

  // one last check to make sure that the version did not change
  if (!options.force) {
    const everySlotId = meetingUpdateRequest.participants_mapping
      .filter(it => it.slot_id)
      .map(it => it.slot_id?.split('_')[0]) as string[]
    const everySlot = await getMeetingsFromDB(everySlotId)

    if (everySlot.find(it => it.version + 1 !== meetingUpdateRequest.version))
      throw new MeetingChangeConflictError()
  }

  // there is no support from supabase to really use optimistic locking,
  // right now we do the best we can assuming that no update will happen in the EXACT same time
  // to the point that our checks will not be able to stop conflicts
  const slotInstances = slots.filter(slot => slot.id && slot.id.includes('_'))
  const slotsFiltered = slots.filter(slot => slot.id && !slot.id.includes('_'))
  const query = await db.supabase.from('slots').upsert(
    slotsFiltered.map(slot => ({ ...slot, id: slot.id })),
    { onConflict: 'id' }
  )

  //TODO: handle error
  const { data, error } = query
  if (slotInstances.length > 0) {
    const seriesMapping = await getSeriesIdMapping(
      slotInstances.map(slot => slot.id.split('_')[0])
    )
    const slotInstanceToInsert: Array<TablesInsert<'slot_instance'>> = []
    for (const slot of slotInstances) {
      const seriesId = seriesMapping.get(slot.id.split('_')[0])
      if (seriesId) {
        slotInstanceToInsert.push({
          id: slot.id,
          override_meeting_info_encrypted: slot.meeting_info_encrypted,
          status: RecurringStatus.MODIFIED,
          series_id: seriesId,
          start: slot.start,
          role: slot.role || ParticipantType.Invitee,
          end: slot.end,
          account_address: slot.account_address,
          created_at: slot.created_at,
          guest_email: slot.guest_email,
          version: slot.version,
        })
      }
    }
    if (slotInstanceToInsert.length > 0) {
      await db.supabase.from('slot_instance').upsert(slotInstanceToInsert, {
        onConflict: 'id',
      })
    }
  }
  if (error) {
    throw new Error(error.message)
  }
  meetingResponse.id = data?.[index]?.id
  meetingResponse.created_at = data?.[index]?.created_at

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
  if (!options.skipRecurrenceUpdate) {
    // now that everything happened without error, it is safe to update the root meeting data
    const dbMeeting = await getConferenceMeetingFromDB(
      meetingUpdateRequest.meeting_id
    )
    const createdRootMeeting = await saveConferenceMeetingToDB({
      id: meetingUpdateRequest.meeting_id,
      start: meetingUpdateRequest.start,
      end: meetingUpdateRequest.end,
      meeting_url: meetingUpdateRequest.meeting_url,
      access_type: MeetingAccessType.OPEN_MEETING,
      provider: meetingUpdateRequest.meetingProvider,
      recurrence: meetingUpdateRequest.meetingRepeat,
      reminders: meetingUpdateRequest.meetingReminders,
      version: MeetingVersion.V3,
      title: meetingUpdateRequest.title,
      slots: updatedSlots.map(s => (s.includes('_') ? s.split('_')[0] : s)),
      permissions: meetingUpdateRequest.meetingPermissions,
      encrypted_metadata: meetingUpdateRequest.encrypted_metadata,
    })
    if (!createdRootMeeting)
      throw new Error(
        'Could not update your meeting right now, get in touch with us if the problem persists'
      )
    if (
      dbMeeting.recurrence &&
      dbMeeting.recurrence !== MeetingRepeat.NO_REPEAT
    ) {
      const slotSeries = await getSlotSeries(slots[0].id!)

      const recurrenceChanged = isDiffRRULE(
        meetingUpdateRequest.rrule || [],
        slotSeries?.rrule || []
      )
      if (
        dbMeeting.recurrence !== meetingUpdateRequest.meetingRepeat ||
        recurrenceChanged
      ) {
        // recurring meeting changed to a different recurrence or to no recurrence
        if (meetingUpdateRequest.eventId) {
          await insertGoogleEventMapping(
            meetingUpdateRequest.eventId,
            meetingUpdateRequest.meeting_id,
            meetingUpdateRequest.calendar_id!
          )
        }
        await deleteRecurringSlotInstances(slots.map(s => s.id!))
        await saveRecurringMeetings(
          slots,
          meetingUpdateRequest.meetingRepeat,
          meetingUpdateRequest.rrule || []
        )
      } else {
        await updateRecurringSlotInstances(
          slots,
          meetingUpdateRequest.rrule || []
        )
      }
    } else if (
      (meetingUpdateRequest.meetingRepeat &&
        meetingUpdateRequest.meetingRepeat !== MeetingRepeat.NO_REPEAT) ||
      meetingUpdateRequest.rrule?.length > 0
    ) {
      // wasn't a recurring meeting but now it is
      await saveRecurringMeetings(
        slots,
        meetingUpdateRequest.meetingRepeat,
        meetingUpdateRequest.rrule || []
      )
    }
  }

  const body: MeetingCreationSyncRequest = {
    participantActing,
    meeting_id: meetingUpdateRequest.meeting_id,
    start: meetingUpdateRequest.start,
    end: meetingUpdateRequest.end,
    created_at: new Date(meetingResponse.created_at!),
    timezone,
    meeting_url: meetingUpdateRequest.meeting_url,
    meetingProvider: meetingUpdateRequest.meetingProvider,
    participants: meetingUpdateRequest.participants_mapping,
    title: meetingUpdateRequest.title,
    content: meetingUpdateRequest.content,
    changes:
      !options.skipNoitfiation && changingTime
        ? { dateChange: changingTime }
        : undefined,
    meetingReminders: meetingUpdateRequest.meetingReminders,
    meetingRepeat: meetingUpdateRequest.meetingRepeat,
    meetingPermissions: meetingUpdateRequest.meetingPermissions,
    eventId: meetingUpdateRequest.eventId,
    meeting_type_id:
      meetingUpdateRequest.meetingTypeId === NO_MEETING_TYPE
        ? undefined
        : meetingUpdateRequest.meetingTypeId,
    skipCalendarSync: options.skipRecurrenceUpdate || false,
    rrule: meetingUpdateRequest.rrule,
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
      timezone || 'UTC',
      undefined,
      meetingUpdateRequest.title,
      meetingUpdateRequest.eventId,
      options.skipRecurrenceUpdate
    )

  return {
    ...meetingResponse,
    start: new Date(meetingResponse.start!),
    end: new Date(meetingResponse.end!),
    created_at: new Date(meetingResponse.created_at!),
    version: meetingResponse.version!,
    meeting_info_encrypted:
      meetingResponse.meeting_info_encrypted! as Encrypted,
    recurrence: meetingResponse.recurrence as MeetingRepeat,
    role: meetingResponse.role as ParticipantType,
  }
}
const getSeriesIdMapping = async (slot_id: string[]) => {
  const { data, error } = await db.supabase
    .from<Tables<'slot_series'>>('slot_series')
    .select('id, slot_id')
    .in(
      'slot_id',
      slot_id.map(id => id.split('_')[0])
    )
  if (error) {
    throw new Error(error.message)
  }
  const map = new Map<string, string>(
    data?.map(item => [item.slot_id, item.id]) || []
  )
  return map
}
const updateMeetingInstance = async (
  participantActing: ParticipantBaseInfo,
  meetingUpdateRequest: MeetingInstanceUpdateRequest
): Promise<DBSlot> => {
  const {
    meetingResponse,
    slots: dbSlots,
    index,
    changingTime,
    timezone,
  } = await parseParticipantSlots(participantActing, meetingUpdateRequest)
  const seriesMapping = await getSeriesIdMapping(
    dbSlots.map(slot => slot.id.split('_')[0])
  )
  const slotInstances: Array<TablesInsert<'slot_instance'>> = []
  const slots: Array<TablesInsert<'slots'>> = []
  for (const slot of dbSlots) {
    const seriesId = seriesMapping.get(slot.id.split('_')[0])
    if (seriesId) {
      slotInstances.push({
        id: slot.id,
        override_meeting_info_encrypted: slot.meeting_info_encrypted,
        status: RecurringStatus.MODIFIED,
        series_id: seriesId,
        start: slot.start,
        role: slot.role || ParticipantType.Invitee,
        end: slot.end,
        account_address: slot.account_address,
        created_at: slot.created_at,
        guest_email: slot.guest_email,
        version: slot.version,
      })
    } else {
      // never had a series so we create a slot for this new participant
      slots.push({
        id: slot.id.split('_')[0],
        start: slot.start,
        role: slot.role || ParticipantType.Invitee,
        end: slot.end,
        account_address: slot.account_address,
        created_at: slot.created_at,
        guest_email: slot.guest_email,
        version: slot.version,
        meeting_info_encrypted: slot.meeting_info_encrypted,
      })
    }
  }

  const query = await db.supabase
    .from('slot_instance')
    .upsert(slotInstances, { onConflict: 'id' })
  if (slots.length > 0) {
    await db.supabase.from('slots').upsert(
      slots.map(slot => ({ ...slot, id: slot.id.split('_')[0] })),
      { onConflict: 'id' }
    )
  }

  await Promise.all([
    db.supabase
      .from('slot_instance')
      .update({ status: RecurringStatus.CANCELLED })
      .in('id', meetingUpdateRequest.slotsToRemove),
  ])

  const { data, error } = query
  if (error) {
    throw new Error(error.message)
  }
  meetingResponse.id = data?.[index]?.id
  meetingResponse.created_at = data?.[index]?.created_at
  const { data: slotSerie } = await db.supabase
    .from<Tables<'slot_series'>>('slot_series')
    .select()
    .eq('id', data[0]?.series_id)
    .maybeSingle()
  if (slotSerie) {
    const newDate = DateTime.fromJSDate(new Date(meetingUpdateRequest.start))
    const originalStartTime = DateTime.fromJSDate(
      new Date(slotSerie?.original_start)
    ).set({
      day: newDate.day,
      month: newDate.month,
      year: newDate.year,
    })
    const body: MeetingInstanceCreationSyncRequest = {
      participantActing,
      meeting_id: meetingUpdateRequest.meeting_id,
      start: meetingUpdateRequest.start,
      end: meetingUpdateRequest.end,
      created_at: new Date(meetingResponse.created_at!),
      timezone,
      meeting_url: meetingUpdateRequest.meeting_url,
      meetingProvider: meetingUpdateRequest.meetingProvider,
      participants: meetingUpdateRequest.participants_mapping,
      title: meetingUpdateRequest.title,
      content: meetingUpdateRequest.content,
      changes: changingTime ? { dateChange: changingTime } : undefined,
      meetingReminders: meetingUpdateRequest.meetingReminders,
      meetingPermissions: meetingUpdateRequest.meetingPermissions,
      skipCalendarSync: false,
      skipNotify: true,
      rrule: meetingUpdateRequest.rrule,
      original_start_time: originalStartTime.toJSDate(),
    }

    // Doing notifications and syncs asynchronously
    fetch(`${apiUrl}/server/meetings/instance/syncAndNotify`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: {
        'X-Server-Secret': process.env.SERVER_SECRET!,
        'Content-Type': 'application/json',
      },
    })
  }
  if (
    meetingUpdateRequest.slotsToRemove.length > 0 ||
    meetingUpdateRequest.guestsToRemove.length > 0
  )
    // TODO: create a new hanbdler for deletying slots from recurring Instance, I.e deleteRecurringMeetingInstanceFromDB
    await deleteMeetingFromDB(
      participantActing,
      meetingUpdateRequest.slotsToRemove,
      meetingUpdateRequest.guestsToRemove,
      meetingUpdateRequest.meeting_id,
      timezone || 'UTC',
      undefined,
      meetingUpdateRequest.title,
      meetingUpdateRequest.eventId
    )

  return {
    ...meetingResponse,
    start: new Date(meetingResponse.start!),
    end: new Date(meetingResponse.end!),
    created_at: new Date(meetingResponse.created_at!),
    version: meetingResponse.version!,
    meeting_info_encrypted:
      meetingResponse.meeting_info_encrypted! as Encrypted,
    recurrence: meetingResponse.recurrence as MeetingRepeat,
    role: meetingResponse.role as ParticipantType,
  }
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
const insertGoogleEventMapping = async (
  event_id: string,
  mww_id: string,
  calendar_id: string
): Promise<void> => {
  await db.supabase
    .from('google_events_mapping')
    .delete()
    .eq('mww_id', mww_id)
    .eq('calendar_id', calendar_id)
  const { error } = await db.supabase
    .from('google_events_mapping')
    .upsert({ event_id, mww_id, calendar_id })

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
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  if (!data) {
    return null
  }
  return data.office_id
}
const getOfficeMeetingIdMappingId = async (
  office_id: string
): Promise<string | null> => {
  const { data, error } = await db.supabase
    .from('office_event_mapping')
    .select()
    .eq('office_id', office_id)
    .maybeSingle()

  if (error) {
    console.error(error)
    return null
  }
  if (!data) {
    return null
  }
  return data.mww_id
}
const getGoogleEventMappingId = async (
  mww_id: string,
  calendar_id: string
): Promise<string | null> => {
  const { data, error } = await db.supabase
    .from('google_events_mapping')
    .select()
    .eq('mww_id', mww_id)
    .eq('calendar_id', calendar_id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  if (!data) {
    return null
  }
  return data.event_id
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
export const getDiscordAccountAndInfo = async (
  account_address: string
): Promise<DiscordAccountInfo | undefined> => {
  const [discord, info] = await Promise.all([
    getDiscordAccount(account_address),
    getDiscordInfoForAddress(account_address),
  ])
  if (!discord) return undefined
  return {
    ...discord,
    ...info,
  }
}
export const getTelegramAccountAndInfo = async (
  account_address: string
): Promise<TelegramAccountInfo | null> => {
  try {
    const subs = await getAccountNotificationSubscriptions(account_address)
    const telegramNotification = subs.notification_types.find(
      n => n.channel === NotificationChannel.TELEGRAM
    )
    if (!telegramNotification) return null
    const userInfo = await getTelegramUserInfo(telegramNotification.destination)
    return {
      ...telegramNotification,
      ...(userInfo || {}),
    }
  } catch (e) {
    Sentry.captureException(e)
  }
  return null
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
    .from<Tables<'group_members'>>('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('member_id', userAddress)
    .eq('role', 'admin')
    .maybeSingle()

  if (error) {
    console.error('Error checking admin status:', error)
    throw error
  }

  return data?.role === MemberType.ADMIN
}

// Count groups for an account
const countGroups = async (account_address: string): Promise<number> => {
  const { count, error } = await db.supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('member_id', account_address.toLowerCase())

  if (error) {
    Sentry.captureException(error)
    throw new Error(`Failed to count groups: ${error.message}`)
  }

  return count || 0
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
    .from<Tables<'subscriptions'>>('subscriptions')
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
    .from<Tables<'subscriptions'>>('subscriptions')
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
    .from<Tables<'subscriptions'>>('subscriptions')
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
    .from<Tables<'subscriptions'>>('subscriptions')
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
const getGroupMembersOrInvite = async (
  group_id: string,
  address: string,
  state: 'pending' | 'accepted'
) => {
  const { data, error: searchError } = await db.supabase
    .from(state === 'accepted' ? 'group_members' : 'group_invites')
    .select()
    .eq('group_id', group_id)
    .eq(state === 'accepted' ? 'member_id' : 'user_id', address)
  if (searchError) {
    throw new Error(searchError.message)
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
  limit = 1000,
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
  return Array.isArray(data) ? data[0] : data
}

const getContactLean = async (
  address: string,
  query = '',
  limit = 1000,
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
  return Array.isArray(data) ? data[0] : data
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
  return Array.isArray(data) ? data[0] : data
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
  return Array.isArray(data) ? data[0] : data
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
    .maybeSingle()
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
    .in(
      'destination',
      deduplicateArray([
        account_address,
        invite?.account_owner_address,
        invite.destination,
      ])
    )

  if (deleteError) {
    throw new Error(deleteError.message)
  }
}
const addContactInvite = async (
  account_address: string,
  contact_address: string
) => {
  const { error: insertError } = await db.supabase.from('contact').insert([
    {
      account_owner_address: account_address,
      contact_address,
      status: ContactStatus.ACTIVE,
    },
    {
      account_owner_address: contact_address,
      contact_address: account_address,
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
    .in('account_owner_address', [account_address, contact_address])
    .in('contact_address', [account_address, contact_address])
    .eq('status', ContactStatus.INACTIVE)

  if (contactClearError) {
    throw new Error(contactClearError.message)
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
  await db.supabase
    .from('contact_invite')
    .delete()
    .in('account_owner_address', [
      account_address,
      invite?.account_owner_address,
    ])
    .in(
      'destination',
      deduplicateArray([
        account_address,
        invite?.account_owner_address,
        invite.destination,
      ])
    )
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
    .maybeSingle()

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

  const { data: existingBlock, error: checkError } = await query.maybeSingle()

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
    .maybeSingle()

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
    .maybeSingle()

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
    .maybeSingle()

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
    .maybeSingle()

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
// Count meeting types for an account (excluding deleted)
const countMeetingTypes = async (account_address: string): Promise<number> => {
  const { count, error } = await db.supabase
    .from('meeting_type')
    .select('*', { count: 'exact', head: true })
    .eq('account_owner_address', account_address)
    .is('deleted_at', null)

  if (error) {
    Sentry.captureException(error)
    throw new Error(`Failed to count meeting types: ${error.message}`)
  }

  return count || 0
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
    .maybeSingle()

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
  const payload: TablesInsert<'meeting_type'> = {
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
          default_token: meetingType?.plan.default_token,
          payment_methods: meetingType?.plan?.payment_methods || [
            PaymentType.CRYPTO,
          ],
        },
      ])
    if (planError) {
      throw new Error(planError.message)
    }
  }
  return data?.[0] as MeetingType
}
const addFiatPaymentMethodToAllMeetingTypes = async (
  account_address: string
) => {
  const { data, error } = await db.supabase.rpc<Tables<'meeting_type_plan'>>(
    'get_meeting_type_plans_by_account',
    {
      account_address,
    }
  )
  if (error) {
    throw new Error(error.message)
  }
  await Promise.all(
    data.map(async plan => {
      if (!plan.payment_methods.includes(PaymentType.FIAT)) {
        const updatedPaymentMethods = [PaymentType.CRYPTO, PaymentType.FIAT]
        const { error: updateError } = await db.supabase
          .from<Tables<'meeting_type_plan'>>('meeting_type_plan')
          .update({
            payment_methods: updatedPaymentMethods,
            updated_at: new Date().toISOString(),
          })
          .eq('meeting_type_id', plan.meeting_type_id)
        if (updateError) {
          return updateError
        }
      }
    })
  )
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
      .from<Tables<'meeting_type_plan'>>('meeting_type_plan')
      .update({
        type: meetingType?.plan.type,
        price_per_slot: meetingType?.plan.price_per_slot,
        no_of_slot: meetingType?.plan.no_of_slot,
        payment_channel: meetingType?.plan.payment_channel,
        payment_address: meetingType?.plan.payment_address,
        default_chain_id: meetingType?.plan.crypto_network,
        default_token: meetingType?.plan.default_token,
        payment_methods: meetingType?.plan?.payment_methods,
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
    .maybeSingle()

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
    .maybeSingle()
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
const getMeetingTypeFromDB = async (
  id: string
): Promise<MeetingType | null> => {
  if (id === NO_MEETING_TYPE) return null

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
    .maybeSingle()
  if (error) {
    throw new Error(error.message)
  }
  if (!data) {
    return null
  }
  data.plan = data.plan?.[0] || null
  data.calendars = data?.connected_calendars?.map(
    (calendar: { connected_calendars: ConnectedCalendarCore }) =>
      calendar.connected_calendars
  )
  return data
}
const getMeetingTypeFromDBLean = async (id: string) => {
  const { data, error } = await db.supabase
    .from<
      Tables<'meeting_type'> & {
        plan: Tables<'meeting_type_plan'>
      }
    >('meeting_type')
    .select(
      `
    *,
    plan: meeting_type_plan(*)
    `
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) {
    throw new Error(error.message)
  }
  if (!data) {
    throw new MeetingTypeNotFound()
  }
  data.plan = Array.isArray(data.plan) ? data.plan[0] : data.plan
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
          await meetingQuery.maybeSingle()

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
            .maybeSingle()
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
  tx: {
    fiat_equivalent: number
    guest_name?: string
    transaction_hash: string
  }
) => {
  try {
    const hostAddress = meetingType?.account_owner_address
    if (!hostAddress) return

    // Respect host preferences: only send if 'receive-tokens' is enabled
    const prefs = await getPaymentPreferences(hostAddress)
    const notifications = prefs?.notification || [
      PaymentNotificationType.RECEIVE_TOKENS,
    ] // default to sending notification if no channel is set
    if (!notifications.includes(PaymentNotificationType.RECEIVE_TOKENS)) return

    const hostEmail = await getAccountNotificationSubscriptionEmail(hostAddress)
    if (!hostEmail) return

    await sendSessionBookingIncomeEmail(hostEmail, {
      amount: tx.fiat_equivalent,
      currency: Currency.USD,
      senderName: tx.guest_name || 'Guest',
      transactionId: tx.transaction_hash,
      transactionDate: new Date().toLocaleString(),
    })
  } catch (e) {
    console.warn('Failed to send session booking income email:', e)
  }
}
const createCheckOutTransaction = async (
  transactionRequest: MeetingCheckoutRequest
) => {
  const transaction_hash = createHash('sha256')
    .update(Date.now().toString())
    .digest('hex')
    .slice(0, 16)
  const payload: TablesInsert<'transactions'> = {
    method: PaymentType.FIAT,
    status: PaymentStatus.PENDING,
    meeting_type_id: transactionRequest.meeting_type_id,
    amount: transactionRequest.amount,
    direction: PaymentDirection.CREDIT,
    initiator_address: transactionRequest.guest_address,
    fiat_equivalent: transactionRequest.amount,
    currency: Currency.USD,
    transaction_hash,
    metadata: {},
  }
  const { data, error } = await db.supabase
    .from<Tables<'transactions'>>('transactions')
    .insert(payload)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }
  return data
}
const getTransactionsById = async (id: string) => {
  const { data, error } = await db.supabase
    .from<Tables<'transactions'>>('transactions')
    .select()
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  return data
}
const getTransactionsStatusById = async (id: string) => {
  const { data, error } = await db.supabase
    .from<Tables<'transactions'>>('transactions')
    .select('status')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  return data?.status
}
const confirmFiatTransaction = async (
  reference_id: string,
  payload: ICheckoutMetadata,
  total_fee: number,
  metadata: Record<string, unknown>
) => {
  const meetingType = await getMeetingTypeFromDB(payload.meeting_type_id)
  if (!meetingType) {
    throw new MeetingTypeNotFound()
  }
  const { data, error } = await db.supabase
    .from<Tables<'transactions'>>('transactions')
    .update({
      status: PaymentStatus.COMPLETED,
      provider_reference_id: reference_id,
      confirmed_at: new Date().toISOString(),
      total_fee,
      fee_breakdown: {
        application_fee: total_fee,
      },
      metadata: {
        ...metadata,
        receiver_address: meetingType.account_owner_address.toLowerCase(),
        sender_address: payload.guest_address,
      },
    })
    .eq('id', payload.transaction_id)
    .single()
  if (error) {
    throw new Error(error.message)
  }
  const totalNoOfSlots = meetingType?.plan?.no_of_slot || 1

  const meetingSessions: Array<BaseMeetingSession> = Array.from(
    { length: totalNoOfSlots },
    (_, i) => ({
      meeting_type_id: payload.meeting_type_id!,
      transaction_id: data?.id,
      session_number: i + 1,
      guest_address: payload.guest_address,
      guest_email: payload?.guest_email,
      guest_name: payload?.guest_name,
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
  if (payload.guest_name) {
    // don't wait for receipt to be sent before serving a response
    sendReceiptEmailToGuest({
      guest_name: payload.guest_name,
      account_address: payload.guest_address,
      guest_email: payload.guest_email,
      plan: meetingType?.title || '',
      number_of_sessions: totalNoOfSlots.toString(),
      price: data.amount?.toString() || '0',
      payment_method: data?.method,
      transaction_fee: String(data.total_fee || 0),
      transaction_status: PaymentStatus.COMPLETED,
      transaction_hash: data.transaction_hash || '',
    })
  }
  sendSessionIncomeEmail(meetingType, {
    fiat_equivalent: data.amount || 0,
    transaction_hash: data.transaction_hash || '',
    guest_name: payload.guest_name,
  })
}
const handleUpdateTransactionStatus = async (
  id: string,
  status: PaymentStatus
) => {
  const { error } = await db.supabase
    .from<Tables<'transactions'>>('transactions')
    .update({ status })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
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
    if (transactionRequest.guest_name) {
      sendReceiptEmailToGuest({
        guest_name: transactionRequest.guest_name,
        guest_email: transactionRequest.guest_email,
        account_address,
        plan: meetingType?.title || '',
        number_of_sessions: totalNoOfSlots.toString(),
        price: transactionRequest.amount.toString(),
        payment_method: transactionRequest.payment_method,
        transaction_fee: String(transactionRequest.total_fee || 0),
        transaction_status: PaymentStatus.COMPLETED,
        transaction_hash: transactionRequest.transaction_hash,
      })
    }

    // Notify host about income
    await sendSessionIncomeEmail(meetingType, transactionRequest)
  }
  return data[0]
}

const sendReceiptEmailToGuest = async (opts: {
  guest_name: string
  guest_email?: string
  account_address?: string
  plan: string
  number_of_sessions: string
  price: string
  payment_method: string
  transaction_fee: string
  transaction_status: PaymentStatus
  transaction_hash: string
}) => {
  try {
    let guest_email = opts.guest_email
    if (!guest_email && opts?.account_address) {
      guest_email = await getAccountNotificationSubscriptionEmail(
        opts.account_address
      )
    }
    if (!guest_email || !opts.guest_name) return

    // don't wait for receipt to be sent before serving a response
    await sendReceiptEmail(guest_email, {
      full_name: opts.guest_name,
      email_address: guest_email,
      plan: opts?.plan || '',
      number_of_sessions: opts?.number_of_sessions || '1',
      price: opts?.price || '0',
      payment_method: opts?.payment_method,
      transaction_fee: opts?.transaction_fee || '0',
      transaction_status: opts?.transaction_status,
      transaction_hash: opts?.transaction_hash,
    })
  } catch (e) {
    console.error('sendReceiptEmailToGuest error:', e)
  }
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
    .maybeSingle()
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
    .eq('status', PaymentStatus.COMPLETED)
    .maybeSingle()

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
    .maybeSingle()
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
    .eq(
      'account_address',
      '0x546F67e57a3980F41251B1cace8AbD10d764cC3F'.toLowerCase()
    )
    .filter('calendars', 'cs', '[{"sync": true}]')
  if (error) {
    throw new Error(error.message)
  }
  for (const calendar of data || []) {
    const integration = getConnectedCalendarIntegration(
      calendar.account_address,
      calendar.email,
      TimeSlotSource.GOOGLE,
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
      } catch (_e) {}
    }
  }
}
const updateResourcesSyncToken = async (
  channelId: string,
  resourceId: string,
  syncToken: string
) => {
  const { error } = await db.supabase
    .from('calendar_webhooks')
    .update({
      sync_token: syncToken,
      resource_id: resourceId,
      channel_id: channelId,
    })
    .eq('channel_id', channelId)
    .eq('resource_id', resourceId)
  if (error) {
    console.error(error)
  }
}

const handleWebhookEvent = async (
  channelId: string,
  resourceId: string,
  resourceState: ResourceState
): Promise<boolean> => {
  console.trace(
    `Received webhook event for channel: ${channelId}, resource: ${resourceId}`
  )
  const { data } = await db.supabase
    .from<
      Tables<'calendar_webhooks'> & {
        connected_calendar: ConnectedCalendar
      }
    >('calendar_webhooks')
    .select(
      `
      *,
      connected_calendar: connected_calendars!inner(*)
      `
    )
    .eq('channel_id', channelId)
    .eq('resource_id', resourceId)
    .maybeSingle()
  if (!data) {
    throw new Error(
      `No webhook found for channel: ${channelId}, resource: ${resourceId}`
    )
  }
  const calendar: ConnectedCalendar = data?.connected_calendar
  if (!calendar) return false
  const start = DateTime.now()
  const end = start.plus({ months: 3 })

  const integration = getConnectedCalendarIntegration(
    calendar.account_address,
    calendar.email,
    TimeSlotSource.GOOGLE,
    calendar.payload
  )
  if (resourceState === 'sync') {
    const syncToken = await integration.initialSync(
      data.calendar_id,
      start.toISO(),
      end.toISO()
    )
    // eslint-disable-next-line no-restricted-syntax
    console.log({ syncToken })
    if (syncToken)
      await updateResourcesSyncToken(channelId, resourceId, syncToken)
    return true
  }
  let allEvents: calendar_v3.Schema$Event[] = []
  try {
    const { events, nextSyncToken } = await integration.listEvents(
      data.calendar_id,
      data.sync_token
    )

    allEvents = events
    if (nextSyncToken)
      await updateResourcesSyncToken(channelId, resourceId, nextSyncToken)
  } catch (error) {
    console.error(`Failed to sync  range:`, error)
  }
  const recentlyUpdated = allEvents.filter(event => {
    const now = new Date()
    // We can't update recently updated meeting to prevent infinite syncing when we update or create meetings
    if (event.extendedProperties?.private?.lastUpdatedAt) {
      const eventLastUpdatedAt = new Date(
        event.extendedProperties?.private?.lastUpdatedAt
      )
      return (
        sub(now, {
          seconds: MODIFIED_BY_APP_TIMEOUT,
        }) >= eventLastUpdatedAt
      )
    }
    return false
  })
  const recurringIdSet = new Set<string>()
  if (recentlyUpdated.length === 0) {
    // eslint-disable-next-line no-restricted-syntax
    console.info('No recently updated events found')
    return false
  }

  // First pass: collect all recurring event IDs
  recentlyUpdated.forEach(meeting => {
    if (meeting.recurringEventId) {
      recurringIdSet.add(meeting.recurringEventId)
    }
  })
  const isRecurringInstance = (meeting: calendar_v3.Schema$Event): boolean => {
    if (meeting.recurringEventId) return true
    if (meeting.recurrence) return true

    if (meeting.id) {
      for (const recId of recurringIdSet) {
        // filter out deleted recurring instances converted to ordinary meetings with deleted recurring instances namespaces
        if (meeting.id.startsWith(recId)) return true
      }
      if (meeting.id?.includes('_')) return true // Google Calendar recurring instances have '_' in their IDs
    }
    return false
  }
  const recentlyUpdatedRecurringMeetings = recentlyUpdated.filter(
    meeting => !!meeting.recurringEventId || !!meeting.recurrence // only consider events with recurringEventId
  )
  const recentlyUpdatedNonRecurringMeetings = recentlyUpdated.filter(
    meeting => !isRecurringInstance(meeting)
  )

  const actions = await Promise.all(
    recentlyUpdatedNonRecurringMeetings
      .map(event => handleSyncEvent(event, calendar))
      .concat(
        handleSyncRecurringEvents(
          recentlyUpdatedRecurringMeetings,
          calendar,
          data.calendar_id
        )
      )
  )
  return actions.length > 0
}

const getEventNotification = async (eventId: string) => {
  const { data, error } = await db.supabase
    .from<Tables<'event_notifications'>>('event_notifications')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle()
  if (error) {
    throw new Error(error.message)
  }
  return data
}
const createOrUpdateEventNotification = async (
  eventNotification: TablesInsert<'event_notifications'>
) => {
  const { data, error } = await db.supabase
    .from<Tables<'event_notifications'>>('event_notifications')
    .upsert(eventNotification, { onConflict: 'event_id' })

  if (error) {
    throw new Error(error.message)
  }
  return data
}

const bulkUpdateSlotSeriesConfirmedSlots = async (
  series_id: string,
  start_time: Date,
  end_time: Date
) => {
  const { error } = await db.supabase.rpc<Database['public']['Functions']>(
    'update_confirmed_slot_times',
    {
      p_series_id: series_id,
      p_new_start_time: DateTime.fromJSDate(start_time).toFormat('HH:mm:ss'),
      p_new_end_time: DateTime.fromJSDate(end_time).toFormat('HH:mm:ss'),
    } as Database['public']['Functions']['update_confirmed_slot_times']['Args']
  )
  if (error) {
    console.error(error)
  }
}
const handleSyncRecurringEvents = async (
  events: calendar_v3.Schema$Event[],
  calendar: ConnectedCalendar,
  calendar_id: string
) => {
  const masterEvents = events.filter(e => e.recurrence && !e.recurringEventId)
  const exceptions = events.filter(e => e.recurringEventId)
  const slotInstanceUpdates: Array<TablesUpdate<'slot_instance'>> = []

  const processed = new Set<string>()
  for (const masterEvent of masterEvents) {
    const meetingId = masterEvent?.extendedProperties?.private?.meetingId
    const meetingTypeId =
      masterEvent?.extendedProperties?.private?.meetingTypeId
    const startTime = masterEvent?.start?.dateTime
    const endTime = masterEvent?.end?.dateTime
    if (!meetingId || !startTime || !endTime) {
      continue
    }
    const { meetingInfo, conferenceMeeting } =
      await getConferenceDecryptedMeeting(meetingId)
    if (!meetingInfo || !masterEvent.recurrence) continue

    const peerEvents = masterEvents.filter(
      peerEvent =>
        peerEvent.id !== masterEvent.id &&
        peerEvent?.extendedProperties?.private?.meetingId ===
          masterEvent?.extendedProperties?.private?.meetingId &&
        peerEvent.status !== 'cancelled'
    )
    if (peerEvents.length > 0) {
      if (processed.has(meetingId)) continue
      const actor = masterEvent.attendees?.find(attendee => attendee.self)
      // REVERT MEETING TO PREVIOUS VERSION IF PEER WITH ID TAKEOVER EXISTS
      await handleUpdateMeetingRsvps(
        calendar.account_address,
        meetingTypeId,
        meetingInfo,
        getParticipationStatus(actor?.responseStatus || ''),
        true
      )
      processed.add(meetingId)
      continue
    }
    if (masterEvent.status === 'cancelled') {
      await handleCancelOrDelete(
        calendar.account_address,
        meetingInfo,
        meetingTypeId,
        masterEvent.id
      )
      continue
    }
    const parsedParticipants = await handleParseParticipants(
      meetingId,
      masterEvent.attendees || [],
      meetingInfo.participants,
      calendar.account_address
    )
    try {
      const rule = rrulestr(masterEvent.recurrence[0], {
        dtstart: new Date(startTime), // The original start time of the series
      })

      await handleUpdateMeeting(
        true,
        calendar.account_address,
        meetingTypeId,
        new Date(startTime),
        new Date(endTime),
        meetingInfo,
        parsedParticipants,
        extractMeetingDescription(masterEvent.description || '') || '',
        masterEvent.location || '',
        conferenceMeeting.provider,
        masterEvent.summary || '',
        conferenceMeeting.reminders,
        getMeetingRepeatFromRule(rule),
        conferenceMeeting.permissions,
        masterEvent.recurrence,
        masterEvent.id,
        calendar_id
      )
    } catch (e) {
      if (e instanceof MeetingDetailsModificationDenied) {
        // update only the rsvp on other calendars
        const actor = masterEvent.attendees?.find(attendee => attendee.self)
        await handleUpdateMeetingRsvps(
          calendar.account_address,
          meetingTypeId,
          meetingInfo,
          getParticipationStatus(actor?.responseStatus || '')
        )
      }
      console.error(e)
      continue
    }
  }
  const otherSlotsPromise = exceptions.map(async exceptionEvent => {
    try {
      const handler =
        exceptionEvent.status?.toLowerCase() === 'cancelled'
          ? handleCancelOrDeleteForRecurringInstance
          : handleUpdateSingleRecurringInstance
      return handler(exceptionEvent, calendar.account_address)
    } catch (e) {
      console.error(e)
      return undefined
    }
  })

  const resolvedOtherSlots = await Promise.all(otherSlotsPromise)
  const otherSlots = resolvedOtherSlots
    .flat(2)
    .filter((val): val is TablesUpdate<'slot_instance'> => Boolean(val))
  slotInstanceUpdates.push(...otherSlots)

  if (slotInstanceUpdates.length > 0) {
    await db.supabase
      .from('slot_instance')
      .upsert(slotInstanceUpdates, {
        onConflict: 'id',
      })
      .then(({ error }) => {
        if (error) {
          console.error('Error updating slot_instance:', error)
        }
      })
  }
}
const getSlotSeriesId = async (slot_id: string) => {
  const { data } = await db.supabase
    .from<Tables<'slot_series'>>('slot_series')
    .select('id')
    .eq('slot_id', slot_id)
    .maybeSingle()
  return data?.id
}
const getSlotSeries = async (slot_id: string) => {
  const { data } = await db.supabase
    .from<Tables<'slot_series'>>('slot_series')
    .select()
    .eq('slot_id', slot_id)
    .maybeSingle()
  return data
}
const getConferenceDecryptedMeeting = async (meetingId: string) => {
  const conferenceMeeting = await getConferenceMeetingFromDB(meetingId)
  if (!conferenceMeeting || conferenceMeeting.version !== MeetingVersion.V3)
    return {
      meetingInfo: null,
      conferenceMeeting,
    }
  const meetingInfo = await decryptConferenceMeeting(conferenceMeeting)
  if (!meetingInfo)
    return {
      meetingInfo: null,
      conferenceMeeting,
    }
  const { data } = await db.supabase
    .from<Tables<'slots'>>('slots')
    .select('version')
    .in('id', conferenceMeeting.slots)
    .limit(1)
  meetingInfo.version = data?.[0]?.version || 0
  return { meetingInfo, conferenceMeeting }
}
const handleSyncEvent = async (
  event: calendar_v3.Schema$Event,
  calendar: ConnectedCalendar
) => {
  const meetingId = event?.extendedProperties?.private?.meetingId
  const meetingTypeId = event?.extendedProperties?.private?.meetingTypeId
  const includesParticipants =
    event?.extendedProperties?.private?.includesParticipants === 'true'
  if (!meetingId) {
    console.warn(`Skipping event ${event.id} due to missing  meetingId`)
    return
  }
  // Single participant events are created when the scheduler creates an event without inviting others, when they have multiple calendars ignore sync for such events for now.
  if (!includesParticipants) {
    console.warn(`Skipping event ${event.id} due to only scheduler attendee`)
    return
  }
  const { meetingInfo, conferenceMeeting } =
    await getConferenceDecryptedMeeting(meetingId)
  if (!meetingInfo) return
  if (!event.start?.dateTime || !event.end?.dateTime) return
  try {
    // eslint-disable-next-line no-restricted-syntax
    let meeting
    if (event.status === 'cancelled') {
      meeting = await handleCancelOrDelete(
        calendar.account_address,
        meetingInfo,
        meetingTypeId
      )
    } else {
      const parsedParticipants = await handleParseParticipants(
        meetingId,
        event.attendees || [],
        meetingInfo.participants,
        calendar.account_address
      )
      meeting = await handleUpdateMeeting(
        true,
        calendar.account_address,
        meetingTypeId,
        new Date(event.start?.dateTime),
        new Date(event.end?.dateTime),
        meetingInfo,
        parsedParticipants,
        extractMeetingDescription(event.description || '') || '',
        event.location || '',
        conferenceMeeting.provider,
        event.summary || '',
        conferenceMeeting.reminders,
        conferenceMeeting.recurrence,
        conferenceMeeting.permissions,
        undefined,
        event.id
      )
    }
    return meeting
  } catch (e) {
    console.error(e)
    if (e instanceof MeetingDetailsModificationDenied) {
      // update only the rsvp on other calendars
      const actor = event.attendees?.find(attendee => attendee.self)
      return await handleUpdateMeetingRsvps(
        calendar.account_address,
        meetingTypeId,
        meetingInfo,
        getParticipationStatus(actor?.responseStatus || '')
      )
    } else {
      throw e
    }
  }
}
const getAccountDomainUrl = (
  account: Pick<Account, 'address' | 'subscriptions'>,
  ellipsize?: boolean
): string => {
  if (isProAccount(account)) {
    const domain = account.subscriptions?.find(
      sub => new Date(sub.expiry_time) > new Date()
    )?.domain
    if (domain) {
      return domain
    }
  }
  return `address/${
    ellipsize ? ellipsizeAddress(account?.address) : account?.address
  }`
}

const getAccountCalendarUrl = async (
  account: Pick<Account, 'address' | 'subscriptions'>,
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
    const ownerAccount: Pick<Account, 'address' | 'subscriptions'> = {
      subscriptions: await getSubscriptionFromDBForAccount(ownerAccountAddress),
      address: ownerAccountAddress,
    }
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
  const chainId =
    (await getChainIdFromOnrampMoneyNetwork(event.chainId)) || event.chainId
  const payload: BaseTransaction = {
    method: PaymentType.CRYPTO,
    transaction_hash: event.transactionHash.toLowerCase() as Address,
    amount: event.actualFiatAmount,
    direction:
      event.eventType.toLowerCase() === 'offramp'
        ? PaymentDirection.DEBIT
        : PaymentDirection.CREDIT,
    chain_id: chainId,
    token_address: await getOnrampMoneyTokenAddress(event.coinCode, chainId),
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
    .select()
    .eq('owner_account_address', owner_account_address.toLowerCase())
    .maybeSingle()

  if (error) {
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
      .upsert(
        {
          ...insertData,
          owner_account_address: owner_account_address.toLowerCase(),
        },
        { onConflict: 'owner_account_address' }
      )
      .select()
      .maybeSingle()

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
      .select()
      .maybeSingle()

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
      .maybeSingle()

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

const generateUniquePollSlug = async (title: string): Promise<string> => {
  try {
    let slug = generatePollSlug(title)
    let attempts = 0

    while (
      (await checkPollSlugExists(slug)) &&
      attempts < QUICKPOLL_SLUG_MAX_ATTEMPTS
    ) {
      slug = generatePollSlug(title)
      attempts++
    }

    if (attempts >= QUICKPOLL_SLUG_MAX_ATTEMPTS) {
      // Fallback with timestamp
      const timestamp = Date.now().toString(36)
      slug = `${generatePollSlug(title).substring(
        0,
        QUICKPOLL_SLUG_FALLBACK_LENGTH
      )}-${timestamp}`
    }

    return slug
  } catch (error) {
    throw new QuickPollSlugGenerationError(
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

const checkPollSlugExists = async (slug: string): Promise<boolean> => {
  try {
    const { data, error } = await db.supabase
      .from('quick_polls')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (error) {
      throw error
    }

    return !!data
  } catch (error) {
    throw new QuickPollSlugGenerationError(
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

// Count active QuickPolls for an account (polls where user is scheduler/owner)
const countActiveQuickPolls = async (
  account_address: string
): Promise<number> => {
  const now = new Date().toISOString()

  // First, get all poll IDs where the account is a scheduler (owner)
  const { data: participations, error: participationError } = await db.supabase
    .from('quick_poll_participants')
    .select('poll_id')
    .eq('account_address', account_address.toLowerCase())
    .eq('participant_type', QuickPollParticipantType.SCHEDULER)

  if (participationError) {
    Sentry.captureException(participationError)
    throw new Error(
      `Failed to count active QuickPolls: ${participationError.message}`
    )
  }

  if (!participations || participations.length === 0) {
    return 0
  }

  const pollIds = participations.map(p => p.poll_id)

  // Count active polls (ONGOING status and not expired)
  const { count, error } = await db.supabase
    .from('quick_polls')
    .select('*', { count: 'exact', head: true })
    .in('id', pollIds)
    .eq('status', PollStatus.ONGOING)
    .gt('expires_at', now)

  if (error) {
    Sentry.captureException(error)
    throw new Error(`Failed to count active QuickPolls: ${error.message}`)
  }

  return count || 0
}

const createQuickPoll = async (
  owner_address: string,
  pollData: CreateQuickPollRequest
) => {
  try {
    const slug = await generateUniquePollSlug(pollData.title)

    // Create the poll
    const { data: poll, error: pollError } = await db.supabase
      .from('quick_polls')
      .insert([
        {
          title: pollData.title,
          description: pollData.description,
          duration_minutes: pollData.duration_minutes,
          starts_at: pollData.starts_at,
          ends_at: pollData.ends_at,
          expires_at: pollData.expires_at,
          status: PollStatus.ONGOING,
          visibility: PollVisibility.PUBLIC,
          permissions: pollData.permissions,
          slug,
        },
      ])
      .select()
      .maybeSingle()

    if (pollError) throw pollError

    // Add the owner as a participant
    const ownerAccount = await getAccountFromDB(owner_address)
    const ownerEmail = await getAccountNotificationSubscriptionEmail(
      owner_address
    )

    // Get owner's availability
    let ownerAvailableSlots: AvailabilitySlot[] = []
    try {
      const availabilityId = await getDefaultAvailabilityBlockId(owner_address)
      if (availabilityId) {
        const { data: availability } = await db.supabase
          .from('availabilities')
          .select('weekly_availability')
          .eq('id', availabilityId)
          .maybeSingle()

        if (availability?.weekly_availability) {
          ownerAvailableSlots = availability.weekly_availability.map(
            (day: AvailabilitySlot) => ({
              weekday: day.weekday,
              ranges: day.ranges || [],
            })
          )
        }
      }
    } catch (error) {
      console.warn(`Could not fetch owner availability:`, error)
    }

    const ownerParticipant = {
      poll_id: poll.id,
      account_address: owner_address,
      guest_name: ownerAccount.preferences?.name || '',
      guest_email: ownerEmail || '',
      status: QuickPollParticipantStatus.ACCEPTED,
      participant_type: QuickPollParticipantType.SCHEDULER,
      timezone: ownerAccount.preferences?.timezone || 'UTC',
      available_slots: ownerAvailableSlots,
    }

    const invitees = await Promise.all(
      (pollData.participants || []).map(async p => {
        let timezone = 'UTC'
        let email = ''
        let availableSlots: AvailabilitySlot[] = []
        let participantStatus = QuickPollParticipantStatus.PENDING

        // For account owners, fetch their timezone and availability from account preferences
        if (p.account_address) {
          try {
            const participantAccount = await getAccountFromDB(p.account_address)
            email = await getAccountNotificationSubscriptionEmail(
              p.account_address
            )
            timezone = participantAccount.preferences?.timezone || 'UTC'
            participantStatus = QuickPollParticipantStatus.ACCEPTED

            // Get the user's default availability block
            const availabilityId = await getDefaultAvailabilityBlockId(
              p.account_address
            )
            if (availabilityId) {
              const { data: availability } = await db.supabase
                .from('availabilities')
                .select('weekly_availability')
                .eq('id', availabilityId)
                .maybeSingle()

              if (availability?.weekly_availability) {
                // Convert weekly availability to poll format
                availableSlots = availability.weekly_availability.map(
                  (day: AvailabilitySlot) => ({
                    weekday: day.weekday,
                    ranges: day.ranges || [],
                  })
                )
              }
            }
          } catch (error) {
            console.warn(
              `Could not fetch timezone/availability for ${p.account_address}:`,
              error
            )
          }
        } else if (p.guest_email) {
          // For guest participants, use the provided email directly
          email = p.guest_email
          participantStatus = QuickPollParticipantStatus.PENDING
        }

        return {
          poll_id: poll.id,
          account_address: p.account_address,
          guest_name: p.name || '',
          guest_email: email || '',
          status: participantStatus,
          participant_type: QuickPollParticipantType.INVITEE,
          timezone,
          available_slots: availableSlots,
        }
      })
    )

    const participantsToAdd = [ownerParticipant, ...invitees]

    const { error: participantsError } = await db.supabase
      .from('quick_poll_participants')
      .insert(participantsToAdd)

    if (participantsError) throw participantsError

    // Send invitation emails to all participants (excluding the host)
    const inviterName =
      ownerAccount.preferences?.name || ellipsizeAddress(owner_address)

    for (const participant of invitees) {
      if (participant.guest_email) {
        emailQueue.add(async () => {
          try {
            await sendPollInviteEmail(
              participant.guest_email,
              inviterName,
              pollData.title,
              slug
            )
            return true
          } catch (error) {
            console.error(
              `Failed to send invitation email to ${participant.guest_email}:`,
              error
            )
            return false
          }
        })
      }
    }

    return poll
  } catch (error) {
    if (error instanceof QuickPollSlugGenerationError) {
      throw error
    }
    throw new QuickPollCreationError(
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

const getQuickPollById = async (pollId: string, requestingAddress?: string) => {
  try {
    // Get the poll
    const { data: poll, error: pollError } = await db.supabase
      .from('quick_polls')
      .select('*')
      .eq('id', pollId)
      .maybeSingle()

    if (pollError) throw pollError
    if (!poll) {
      throw new QuickPollNotFoundError(pollId)
    }

    // Get participants with account information
    const { data: participants, error: participantsError } = await db.supabase
      .from('quick_poll_participants')
      .select(
        `
        *,
        accounts:account_address (
          address,
          account_preferences (
            name,
            description
          )
        )
      `
      )
      .eq('poll_id', pollId)
      .neq('status', QuickPollParticipantStatus.DELETED)
      .neq('status', QuickPollParticipantStatus.PENDING)
      .order('created_at', { ascending: true })

    if (participantsError) throw participantsError

    // Get host information
    const hostParticipant = participants.find(
      p => p.participant_type === QuickPollParticipantType.SCHEDULER
    )
    let hostName = ''
    let hostAddress = ''

    if (hostParticipant) {
      hostAddress = hostParticipant.account_address || ''
      if (hostParticipant.accounts?.account_preferences?.[0]?.name) {
        hostName = hostParticipant.accounts.account_preferences[0].name
      } else if (hostParticipant.guest_name) {
        hostName = hostParticipant.guest_name
      }
    }

    // Check if requesting user is a participant
    const isParticipant = requestingAddress
      ? participants.some(p => p.account_address === requestingAddress)
      : false

    // Check if requesting user can edit (is scheduler/owner)
    const canEdit = requestingAddress
      ? participants.some(
          p =>
            p.account_address === requestingAddress &&
            (p.participant_type === QuickPollParticipantType.SCHEDULER ||
              p.participant_type === QuickPollParticipantType.OWNER)
        )
      : false

    return {
      poll: {
        ...poll,
        participants: participants.map(p => ({
          ...p,
          account_name:
            p.accounts?.account_preferences?.[0]?.name || p.guest_name,
        })),
        participant_count: participants.length,
        host_name: hostName,
        host_address: hostAddress,
      },
      is_participant: isParticipant,
      can_edit: canEdit,
    }
  } catch (error) {
    if (error instanceof QuickPollNotFoundError) {
      throw error
    }
    throw new Error(error instanceof Error ? error.message : 'Unknown error')
  }
}

const getQuickPollBySlug = async (slug: string, requestingAddress?: string) => {
  try {
    // Get the poll
    const { data: poll, error: pollError } = await db.supabase
      .from('quick_polls')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()

    if (pollError) throw pollError
    if (!poll) {
      throw new QuickPollSlugNotFoundError(slug)
    }

    return getQuickPollById(poll.id, requestingAddress)
  } catch (error) {
    if (
      error instanceof QuickPollSlugNotFoundError ||
      error instanceof QuickPollNotFoundError
    ) {
      throw error
    }
    throw new Error(error instanceof Error ? error.message : 'Unknown error')
  }
}

const getQuickPollsForAccount = async (
  accountAddress: string,
  limit = QUICKPOLL_DEFAULT_LIMIT,
  offset = QUICKPOLL_DEFAULT_OFFSET,
  status?: PollStatus | PollStatus[],
  searchQuery?: string
) => {
  try {
    const safeLimit = Math.min(limit, QUICKPOLL_MAX_LIMIT)

    const { data: userParticipations, error: participationError } =
      await db.supabase
        .from('quick_poll_participants')
        .select('poll_id')
        .eq('account_address', accountAddress)

    if (participationError) throw participationError

    if (!userParticipations || userParticipations.length === 0) {
      return {
        polls: [],
        total_count: 0,
        has_more: false,
      }
    }

    const pollIds = userParticipations.map(p => p.poll_id)

    // Now get all polls with all their participants
    let query = db.supabase
      .from('quick_polls')
      .select(
        `
        *,
        quick_poll_participants (
          participant_type,
          status,
          account_address,
          guest_name,
          accounts:account_address (
            account_preferences (name)
          )
        )
      `
      )
      .in('id', pollIds)
      .order('created_at', { ascending: true })
      .range(offset, offset + safeLimit - 1)

    if (status) {
      if (Array.isArray(status)) {
        query = query.in('status', status)
      } else {
        query = query.eq('status', status)
      }
    }

    if (searchQuery && searchQuery.trim()) {
      query = query.ilike('title', `%${searchQuery.trim()}%`)
    }

    const { data: polls, error } = await query

    if (error) throw error

    let countQuery = db.supabase
      .from('quick_polls')
      .select('*', { count: 'exact', head: true })
      .in('id', pollIds)

    if (status) {
      if (Array.isArray(status)) {
        countQuery = countQuery.in('status', status)
      } else {
        countQuery = countQuery.eq('status', status)
      }
    }

    if (searchQuery && searchQuery.trim()) {
      countQuery = countQuery.ilike('title', `%${searchQuery.trim()}%`)
    }

    const { count: totalCount, error: countError } = await countQuery

    if (countError) throw countError

    // Process the results
    const processedPolls = polls.map(poll => {
      // Find the requesting user's participation details
      const userParticipating = poll.quick_poll_participants.find(
        (p: QuickPollParticipant) => p.account_address === accountAddress
      )

      // Find the host (scheduler)
      const host = poll.quick_poll_participants.find(
        (p: QuickPollParticipant) =>
          p.participant_type === QuickPollParticipantType.SCHEDULER
      )

      return {
        ...poll,
        host_name:
          host?.accounts?.account_preferences?.name ||
          host?.guest_name ||
          'Unknown',
        host_address: host?.account_address || '',
        user_participant_type: userParticipating?.participant_type,
        user_status: userParticipating?.status,
      }
    })

    return {
      polls: processedPolls,
      total_count: totalCount || 0,
      has_more: offset + processedPolls.length < (totalCount || 0),
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Unknown error')
  }
}

const updateQuickPoll = async (
  pollId: string,
  ownerAddress: string,
  updates: UpdateQuickPollRequest
) => {
  try {
    // Verify the user can edit this poll
    const { data: participant, error: participantError } = await db.supabase
      .from('quick_poll_participants')
      .select('participant_type')
      .eq('poll_id', pollId)
      .eq('account_address', ownerAddress)
      .in('participant_type', ['scheduler', 'owner'])
      .maybeSingle()

    if (participantError || !participant) {
      throw new QuickPollUnauthorizedError('You cannot edit this poll')
    }

    // Handle participant updates if provided
    if (updates.participants) {
      await updateQuickPollParticipants(pollId, updates.participants)
    }

    const { participants: _, ...pollUpdates } = updates

    const { data: poll, error } = await db.supabase
      .from('quick_polls')
      .update({ ...pollUpdates, updated_at: new Date().toISOString() })
      .eq('id', pollId)
      .select()
      .maybeSingle()

    if (error) throw error

    return poll
  } catch (error) {
    if (error instanceof QuickPollUnauthorizedError) {
      throw error
    }
    throw new QuickPollUpdateError(
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

const updateQuickPollParticipants = async (
  pollId: string,
  participantUpdates: {
    toAdd?: AddParticipantData[]
    toRemove?: string[]
  }
) => {
  try {
    // Get poll details for email
    const { data: poll, error: pollError } = await db.supabase
      .from('quick_polls')
      .select('title, slug')
      .eq('id', pollId)
      .maybeSingle()

    if (pollError) throw pollError

    // Get poll owner info for email
    const { data: ownerParticipant, error: ownerError } = await db.supabase
      .from('quick_poll_participants')
      .select('account_address, guest_name')
      .eq('poll_id', pollId)
      .eq('participant_type', QuickPollParticipantType.SCHEDULER)
      .maybeSingle()

    if (ownerError || !ownerParticipant) {
      throw new QuickPollUpdateError('Poll owner not found')
    }

    const inviterName = ownerParticipant.guest_name || 'Poll Host'

    // Add new participants
    if (participantUpdates.toAdd && participantUpdates.toAdd.length > 0) {
      for (const participantData of participantUpdates.toAdd) {
        try {
          const status =
            participantData.status || QuickPollParticipantStatus.PENDING
          await addQuickPollParticipant(pollId, participantData, status)

          if (status === QuickPollParticipantStatus.PENDING) {
            const participantEmail =
              participantData.guest_email ||
              (participantData.account_address
                ? await getAccountNotificationSubscriptionEmail(
                    participantData.account_address
                  )
                : '')
            if (participantEmail) {
              emailQueue.add(async () => {
                try {
                  await sendPollInviteEmail(
                    participantEmail,
                    inviterName,
                    poll.title,
                    poll.slug
                  )
                  return true
                } catch (emailError) {
                  console.error(
                    `Failed to send invitation email to ${participantEmail}:`,
                    emailError
                  )
                  return false
                }
              })
            }
          }
        } catch (addError) {
          throw addError
        }
      }
    }

    if (participantUpdates.toRemove && participantUpdates.toRemove.length > 0) {
      const { error: removeError } = await db.supabase
        .from('quick_poll_participants')
        .update({ status: QuickPollParticipantStatus.DELETED })
        .in('id', participantUpdates.toRemove)
        .eq('poll_id', pollId)
        .select()

      if (removeError) {
        throw removeError
      }
    }
  } catch (error) {
    if (error instanceof QuickPollParticipantCreationError) {
      throw error
    }

    throw new QuickPollUpdateError(
      `Failed to update participants: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }
}

const deleteQuickPoll = async (pollId: string, ownerAddress: string) => {
  try {
    // Verify the user can delete this poll
    const { data: participant, error: participantError } = await db.supabase
      .from('quick_poll_participants')
      .select('participant_type')
      .eq('poll_id', pollId)
      .eq('account_address', ownerAddress)
      .in('participant_type', ['scheduler', 'owner'])
      .maybeSingle()

    if (participantError || !participant) {
      throw new QuickPollUnauthorizedError('You cannot delete this poll')
    }

    // Delete participants first
    const { error: participantsError } = await db.supabase
      .from('quick_poll_participants')
      .delete()
      .eq('poll_id', pollId)

    if (participantsError) throw participantsError

    // Delete the poll
    const { error: pollError } = await db.supabase
      .from('quick_polls')
      .delete()
      .eq('id', pollId)

    if (pollError) throw pollError

    return { success: true }
  } catch (error) {
    if (error instanceof QuickPollUnauthorizedError) {
      throw error
    }
    throw new QuickPollDeletionError(
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

const expireStalePolls = async () => {
  try {
    const now = new Date().toISOString()

    const { data, error } = await db.supabase
      .from('quick_polls')
      .update({ status: PollStatus.EXPIRED, updated_at: now })
      .eq('status', PollStatus.ONGOING)
      .lt('expires_at', now)
      .select('id')

    if (error) throw error

    const expiredCount = data?.length || 0

    return {
      success: true,
      expiredCount,
      timestamp: now,
    }
  } catch (error) {
    throw new Error(
      `Failed to expire polls: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }
}

const updateQuickPollParticipantStatus = async (
  participantId: string,
  status: QuickPollParticipantStatus,
  availableSlots?: Record<string, unknown>[]
) => {
  try {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (availableSlots) {
      updates.available_slots = availableSlots
    }

    const { data: participant, error } = await db.supabase
      .from('quick_poll_participants')
      .update(updates)
      .eq('id', participantId)
      .select()
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new QuickPollParticipantNotFoundError(participantId)
      }
      throw error
    }
    if (!participant) {
      throw new QuickPollParticipantNotFoundError(participantId)
    }

    return participant
  } catch (error) {
    if (error instanceof QuickPollParticipantNotFoundError) {
      throw error
    }
    throw new QuickPollParticipantUpdateError(
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

const getQuickPollParticipants = async (pollId: string) => {
  try {
    const { data: participants, error } = await db.supabase
      .from('quick_poll_participants')
      .select(
        `
        *,
        accounts:account_address (
          account_preferences (
            name,
            description
          )
        )
      `
      )
      .eq('poll_id', pollId)
      .neq('status', QuickPollParticipantStatus.DELETED)
      .neq('status', QuickPollParticipantStatus.PENDING)
      .order('created_at', { ascending: true })

    if (error) throw error

    return participants.map(p => ({
      ...p,
      account_name: p.accounts?.account_preferences?.[0]?.name || p.guest_name,
    }))
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Unknown error')
  }
}

const addQuickPollParticipant = async (
  pollId: string,
  participantData: AddParticipantData,
  status: QuickPollParticipantStatus = QuickPollParticipantStatus.PENDING
) => {
  try {
    // If a matching deleted participant exists, revive instead of inserting new
    let existingParticipant: Tables<'quick_poll_participants'> | null = null

    if (participantData.account_address) {
      const { data, error: existingByAccountError } = await db.supabase
        .from<Tables<'quick_poll_participants'>>('quick_poll_participants')
        .select('*')
        .eq('poll_id', pollId)
        .eq('account_address', participantData.account_address)
        .maybeSingle()

      if (existingByAccountError) {
        if (existingByAccountError.code === 'PGRST116') {
          existingParticipant = null
        } else {
          throw existingByAccountError
        }
      } else {
        existingParticipant = data
      }
    } else if (participantData.guest_email) {
      const { data, error: existingByEmailError } = await db.supabase
        .from('quick_poll_participants')
        .select('*')
        .eq('poll_id', pollId)
        .eq('guest_email', participantData.guest_email)
        .maybeSingle()

      if (existingByEmailError) {
        if (existingByEmailError.code === 'PGRST116') {
          existingParticipant = null
        } else {
          throw existingByEmailError
        }
      } else {
        existingParticipant = data
      }
    }

    if (existingParticipant) {
      if (existingParticipant.status === QuickPollParticipantStatus.DELETED) {
        const updates: QuickPollParticipantUpdateFields = {
          status,
        }
        // Optionally refresh name or type if provided now
        if (participantData.guest_name)
          updates.guest_name = participantData.guest_name

        const { data: revivedParticipant, error: reviveParticipantError } =
          await db.supabase
            .from('quick_poll_participants')
            .update(updates)
            .eq('id', existingParticipant.id)
            .select()
            .maybeSingle()

        if (reviveParticipantError) throw reviveParticipantError
        return revivedParticipant
      }

      // Already present and not deleted: throw a specific error based on status
      if (existingParticipant.status === QuickPollParticipantStatus.PENDING) {
        throw new QuickPollParticipantCreationError(
          'This participant has already been invited but has not yet provided their availability. They will be able to join once they accept the invitation and add their availability.'
        )
      }

      // Status is ACCEPTED - they're already part of the poll
      throw new QuickPollParticipantCreationError(
        'This participant is already part of the poll'
      )
    }

    // For account owners, fetch their weekly availability
    let availableSlots: AvailabilitySlot[] = []
    let timezone = 'UTC'

    if (participantData.account_address) {
      try {
        const participantAccount = await getAccountFromDB(
          participantData.account_address
        )
        timezone = participantAccount.preferences?.timezone || 'UTC'

        // Get the user's default availability block
        const availabilityId = await getDefaultAvailabilityBlockId(
          participantData.account_address
        )
        if (availabilityId) {
          const { data: availability } = await db.supabase
            .from('availabilities')
            .select('weekly_availability')
            .eq('id', availabilityId)
            .maybeSingle()

          if (availability?.weekly_availability) {
            // Convert weekly availability to poll format
            availableSlots = availability.weekly_availability.map(
              (day: AvailabilitySlot) => ({
                weekday: day.weekday,
                ranges: day.ranges || [],
              })
            )
          }
        }
      } catch (error) {
        console.warn(
          `Could not fetch timezone/availability for ${participantData.account_address}:`,
          error
        )
      }
    }

    const { data: participant, error } = await db.supabase
      .from('quick_poll_participants')
      .insert([
        {
          poll_id: pollId,
          account_address: participantData.account_address,
          guest_name: participantData.guest_name,
          guest_email: participantData.guest_email,
          status,
          participant_type: participantData.participant_type,
          timezone,
          available_slots: availableSlots,
        },
      ])
      .select()
      .maybeSingle()

    if (error) throw error

    return participant
  } catch (error) {
    throw new QuickPollParticipantCreationError(
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

const cancelQuickPoll = async (pollId: string, ownerAddress: string) => {
  try {
    const { data: poll, error: pollError } = await db.supabase
      .from('quick_polls')
      .select('id, status')
      .eq('id', pollId)
      .maybeSingle()

    if (pollError) throw pollError
    if (!poll) {
      throw new QuickPollNotFoundError(pollId)
    }

    if (poll.status === PollStatus.CANCELLED) {
      throw new QuickPollAlreadyCancelledError()
    }

    if (poll.status === PollStatus.COMPLETED) {
      throw new QuickPollAlreadyCompletedError()
    }

    // Check if user is the owner (has SCHEDULER role)
    const { data: participant, error: participantError } = await db.supabase
      .from('quick_poll_participants')
      .select('participant_type')
      .eq('poll_id', pollId)
      .eq('account_address', ownerAddress)
      .eq('participant_type', QuickPollParticipantType.SCHEDULER)
      .maybeSingle()

    if (participantError || !participant) {
      throw new QuickPollUnauthorizedError(
        'Only the poll creator can cancel this poll'
      )
    }

    // Update poll status to cancelled and set expires_at to current time
    const { data: updatedPoll, error: updateError } = await db.supabase
      .from('quick_polls')
      .update({
        status: PollStatus.CANCELLED,
        expires_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', pollId)
      .select()
      .maybeSingle()

    if (updateError) throw updateError

    return updatedPoll
  } catch (error) {
    if (
      error instanceof QuickPollNotFoundError ||
      error instanceof QuickPollUnauthorizedError ||
      error instanceof QuickPollAlreadyCancelledError ||
      error instanceof QuickPollAlreadyCompletedError
    ) {
      throw error
    }
    throw new QuickPollCancellationError(
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

const updateQuickPollParticipantAvailability = async (
  participantId: string,
  availableSlots: AvailabilitySlot[],
  timezone?: string
) => {
  try {
    const updates: Record<string, unknown> = {
      available_slots: availableSlots,
      updated_at: new Date().toISOString(),
    }

    if (timezone) {
      updates.timezone = timezone
    }

    const { data: participant, error } = await db.supabase
      .from('quick_poll_participants')
      .update(updates)
      .eq('id', participantId)
      .select()
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new QuickPollParticipantNotFoundError(participantId)
      }
      throw error
    }
    if (!participant) {
      throw new QuickPollParticipantNotFoundError(participantId)
    }

    return participant
  } catch (error) {
    if (error instanceof QuickPollParticipantNotFoundError) {
      throw error
    }
    throw new QuickPollParticipantUpdateError(
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

const updateQuickPollGuestDetails = async (
  participantId: string,
  guestName: string,
  guestEmail: string
) => {
  try {
    const updates = {
      guest_name: guestName,
      guest_email: guestEmail,
      status: QuickPollParticipantStatus.ACCEPTED,
      updated_at: new Date().toISOString(),
    }

    const { data: participant, error } = await db.supabase
      .from('quick_poll_participants')
      .update(updates)
      .eq('id', participantId)
      .select()
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new QuickPollParticipantNotFoundError(participantId)
      }
      throw error
    }
    if (!participant) {
      throw new QuickPollParticipantNotFoundError(participantId)
    }

    return participant
  } catch (error) {
    if (error instanceof QuickPollParticipantNotFoundError) {
      throw error
    }
    throw new QuickPollParticipantUpdateError(
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

const saveQuickPollCalendar = async (
  participantId: string,
  email: string,
  provider: string,
  payload?: Record<string, unknown>,
  calendars?: unknown
) => {
  try {
    const { data: calendar, error } = await db.supabase
      .from('quick_poll_calendars')
      .insert([
        {
          participant_id: participantId,
          email,
          provider,
          payload,
          calendars: calendars || [],
        },
      ])
      .select()
      .maybeSingle()

    if (error) throw error
    return calendar
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Failed to save calendar'
    )
  }
}

const getQuickPollParticipantById = async (participantId: string) => {
  try {
    const { data: participant, error } = await db.supabase
      .from('quick_poll_participants')
      .select('*')
      .eq('id', participantId)
      .maybeSingle()

    if (error) throw error
    if (!participant) {
      throw new QuickPollParticipantNotFoundError(participantId)
    }

    return participant
  } catch (error) {
    if (error instanceof QuickPollParticipantNotFoundError) {
      throw error
    }
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get participant'
    )
  }
}

const getQuickPollParticipantByIdentifier = async (
  pollId: string,
  identifier: string // either account_address or guest_email
) => {
  try {
    const { data: participant, error } = await db.supabase
      .from('quick_poll_participants')
      .select('*')
      .eq('poll_id', pollId)
      .or(`account_address.eq.${identifier},guest_email.eq.${identifier}`)
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new QuickPollParticipantNotFoundError(identifier)
      }
      throw error
    }
    if (!participant) {
      throw new QuickPollParticipantNotFoundError(identifier)
    }

    return participant
  } catch (error) {
    if (error instanceof QuickPollParticipantNotFoundError) {
      throw error
    }
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get participant'
    )
  }
}
const getActivePaymentAccountDB = async (
  account_address: string,
  provider = PaymentProvider.STRIPE
) => {
  const { data, error } = await db.supabase
    .from<Tables<'payment_accounts'>>('payment_accounts')
    .select()
    .eq('owner_account_address', account_address)
    .eq('provider', provider)
    .neq('status', PaymentAccountStatus.DISCONNECTED)

  if (error) {
    throw new Error('Could not fetch payment account')
  }

  return Array.isArray(data) ? data[0] : data
}
const getActivePaymentAccount = async (
  account_address: string,
  provider = PaymentProvider.STRIPE
): Promise<ActivePaymentAccount> => {
  const payment_account = await getActivePaymentAccountDB(
    account_address,
    provider
  )
  if (
    payment_account?.provider_account_id &&
    payment_account.provider === PaymentProvider.STRIPE
  ) {
    const stripe = new StripeService()
    const account = await stripe.accounts.retrieve(
      payment_account?.provider_account_id
    )

    return {
      ...payment_account,
      username:
        account?.business_profile?.name ||
        (account?.individual?.first_name
          ? `${account.individual.first_name} ${account.individual.last_name}`
          : 'Unnamed'),
    }
  }
  return payment_account
}
const getPaymentAccountByProviderId = async (
  provider_account_id: string,
  provider = PaymentProvider.STRIPE
): Promise<Tables<'payment_accounts'> | null> => {
  const { data: payment_account, error } = await db.supabase
    .from<Tables<'payment_accounts'>>('payment_accounts')
    .select()
    .eq('provider_account_id', provider_account_id)
    .eq('provider', provider)
    .maybeSingle()
  if (error) {
    throw new Error('Could not fetch payment account')
  }
  return payment_account
}
const getOrCreatePaymentAccount = async (
  account_address: string,
  provider = PaymentProvider.STRIPE
): Promise<Tables<'payment_accounts'>> => {
  const { data: payment_account, error } = await db.supabase
    .from<Tables<'payment_accounts'>>('payment_accounts')
    .select()
    .eq('owner_account_address', account_address)
    .eq('provider', provider)
  if (error) {
    throw new Error('Could not fetch payment account')
  }
  if (!payment_account || payment_account.length === 0) {
    const { data, error: insertError } = await db.supabase
      .from<Tables<'payment_accounts'>>('payment_accounts')
      .insert([
        {
          owner_account_address: account_address,
          provider,
          status: PaymentAccountStatus.PENDING,
        },
      ])
      .select()
      .single()
    if (insertError) {
      throw new Error('Could not create payment account')
    }
    await addFiatPaymentMethodToAllMeetingTypes(account_address)
    return data
  } else {
    return payment_account[0]
  }
}

const updatePaymentAccount = async (
  id: number,
  owner_account_address: string,
  data: TablesUpdate<'payment_accounts'>
) => {
  const { data: updatedPaymentAccount, error } = await db.supabase
    .from<Tables<'payment_accounts'>>('payment_accounts')
    .update({
      ...data,
      owner_account_address,
      id,
    })
    .eq('id', id)
    .eq('owner_account_address', owner_account_address)
  if (error) {
    throw new Error('Could not update payment account')
  }
  return Array.isArray(updatedPaymentAccount)
    ? updatedPaymentAccount[0]
    : updatedPaymentAccount
}

// Get all billing plans from the database
const getBillingPlans = async (): Promise<Tables<'billing_plans'>[]> => {
  const { data, error } = await db.supabase
    .from('billing_plans')
    .select('*')
    .order('billing_cycle', { ascending: true })

  if (error) {
    Sentry.captureException(error)
    throw new BillingPlansFetchError(error.message)
  }

  return data || []
}

// Get a single billing plan by ID
const getBillingPlanById = async (
  planId: string
): Promise<Tables<'billing_plans'> | null> => {
  const { data, error } = await db.supabase
    .from('billing_plans')
    .select('*')
    .eq('id', planId)
    .maybeSingle()

  if (error) {
    Sentry.captureException(error)
    throw new BillingPlanFetchError(planId, error.message)
  }

  return data
}

// Get all billing plan providers, optionally filtered by provider
// Returns providers with plan details (joined with billing_plans)
const getBillingPlanProviders = async (
  provider?: BillingPaymentProvider
): Promise<
  Array<
    Tables<'billing_plan_providers'> & {
      billing_plan: Tables<'billing_plans'>
    }
  >
> => {
  let query = db.supabase.from('billing_plan_providers').select(
    `
      *,
      billing_plan: billing_plans(*)
    `
  )

  if (provider) {
    query = query.eq('provider', provider)
  }

  const { data, error } = await query.order('created_at', { ascending: true })

  if (error) {
    Sentry.captureException(error)
    throw new BillingPlanProvidersFetchError(error.message)
  }

  return data || []
}

// Get provider mapping for a specific plan
const getBillingPlanProvider = async (
  planId: string,
  provider: BillingPaymentProvider
): Promise<string | null> => {
  const { data, error } = await db.supabase
    .from('billing_plan_providers')
    .select('provider_product_id')
    .eq('billing_plan_id', planId)
    .eq('provider', provider)
    .maybeSingle()

  if (error) {
    Sentry.captureException(error)
    throw new BillingPlanProviderFetchError(planId, provider, error.message)
  }

  return data?.provider_product_id || null
}

// Get billing plan ID from Stripe product ID
const getBillingPlanIdFromStripeProduct = async (
  stripeProductId: string,
  provider: BillingPaymentProvider = BillingPaymentProvider.STRIPE
): Promise<string | null> => {
  const { data, error } = await db.supabase
    .from('billing_plan_providers')
    .select('billing_plan_id')
    .eq('provider_product_id', stripeProductId)
    .eq('provider', provider)
    .maybeSingle()

  if (error) {
    Sentry.captureException(error)
    throw new BillingPlanFromStripeProductError(stripeProductId, error.message)
  }

  return data?.billing_plan_id || null
}

// Stripe Subscription Helpers

// Create a new Stripe subscription record
const createStripeSubscription = async (
  accountAddress: string,
  stripeSubscriptionId: string,
  stripeCustomerId: string,
  billingPlanId: string
): Promise<Tables<'stripe_subscriptions'>> => {
  const { data, error } = await db.supabase
    .from('stripe_subscriptions')
    .insert([
      {
        account_address: accountAddress.toLowerCase(),
        stripe_subscription_id: stripeSubscriptionId,
        stripe_customer_id: stripeCustomerId,
        billing_plan_id: billingPlanId,
      },
    ])
    .select()
    .single()

  if (error) {
    Sentry.captureException(error)
    throw new StripeSubscriptionCreationError(error.message)
  }

  if (!data) {
    throw new StripeSubscriptionCreationError('No data returned')
  }

  return data
}

// Get Stripe subscription by account address
const getStripeSubscriptionByAccount = async (
  accountAddress: string
): Promise<Tables<'stripe_subscriptions'> | null> => {
  const { data, error } = await db.supabase
    .from('stripe_subscriptions')
    .select('*')
    .eq('account_address', accountAddress.toLowerCase())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    Sentry.captureException(error)
    throw new StripeSubscriptionFetchError(accountAddress, error.message)
  }

  return data
}

// Get Stripe subscription by Stripe subscription ID
const getStripeSubscriptionById = async (
  stripeSubscriptionId: string
): Promise<Tables<'stripe_subscriptions'> | null> => {
  const { data, error } = await db.supabase
    .from('stripe_subscriptions')
    .select('*')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .maybeSingle()

  if (error) {
    Sentry.captureException(error)
    throw new StripeSubscriptionFetchError(stripeSubscriptionId, error.message)
  }

  return data
}

// Update Stripe subscription record
const updateStripeSubscription = async (
  stripeSubscriptionId: string,
  updates: {
    billing_plan_id?: string
    stripe_customer_id?: string
  }
): Promise<Tables<'stripe_subscriptions'>> => {
  const { data, error } = await db.supabase
    .from('stripe_subscriptions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .select()
    .single()

  if (error) {
    Sentry.captureException(error)
    throw new StripeSubscriptionUpdateError(stripeSubscriptionId, error.message)
  }

  if (!data) {
    throw new StripeSubscriptionUpdateError(
      stripeSubscriptionId,
      'No data returned'
    )
  }

  return data
}

// Link a transaction to a Stripe subscription
const linkTransactionToStripeSubscription = async (
  stripeSubscriptionId: string,
  transactionId: string
): Promise<Tables<'stripe_subscription_transactions'>> => {
  const { data, error } = await db.supabase
    .from('stripe_subscription_transactions')
    .insert([
      {
        stripe_subscription_id: stripeSubscriptionId,
        transaction_id: transactionId,
      },
    ])
    .select()
    .single()

  if (error) {
    Sentry.captureException(error)
    throw new StripeSubscriptionTransactionLinkError(error.message)
  }

  if (!data) {
    throw new StripeSubscriptionTransactionLinkError('No data returned')
  }

  return data
}

// Create a subscription transaction (for billing subscriptions)
const createSubscriptionTransaction = async (
  payload: TablesInsert<'transactions'>
): Promise<Tables<'transactions'>> => {
  const { data, error } = await db.supabase
    .from('transactions')
    .insert([payload])
    .select()
    .single()

  if (error) {
    Sentry.captureException(error)
    throw new SubscriptionTransactionCreationError(error.message)
  }

  if (!data) {
    throw new SubscriptionTransactionCreationError('No data returned')
  }

  return data
}

// Subscription Period Helpers

// Create a new subscription period
const createSubscriptionPeriod = async (
  ownerAccount: string,
  billingPlanId: string,
  status: 'active' | 'cancelled' | 'expired',
  expiryTime: string,
  transactionId: string | null
): Promise<Tables<'subscriptions'>> => {
  const { data, error } = await db.supabase
    .from('subscriptions')
    .insert([
      {
        owner_account: ownerAccount.toLowerCase(),
        billing_plan_id: billingPlanId,
        status,
        expiry_time: expiryTime,
        transaction_id: transactionId,
        registered_at: new Date().toISOString(),
      },
    ])
    .select()
    .single()

  if (error) {
    Sentry.captureException(error)
    throw new SubscriptionPeriodCreationError(error.message)
  }

  if (!data) {
    throw new SubscriptionPeriodCreationError('No data returned')
  }

  return data
}

// Get active subscription period for an account
// Returns the subscription with the farthest expiry_time among all active subscriptions
// Note: Includes both 'active' and 'cancelled' statuses, as cancelled subscriptions
// should still grant Pro access until expiry_time passes
const getActiveSubscriptionPeriod = async (
  accountAddress: string
): Promise<Tables<'subscriptions'> | null> => {
  const { data, error } = await db.supabase
    .from('subscriptions')
    .select('*')
    .eq('owner_account', accountAddress.toLowerCase())
    .in('status', ['active', 'cancelled'])
    .gt('expiry_time', new Date().toISOString())
    .order('expiry_time', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    Sentry.captureException(error)
    throw new SubscriptionPeriodFetchError(accountAddress, error.message)
  }

  return data
}

// Check if an account has Pro access (billing or domain subscription)
const isProAccountAsync = async (accountAddress: string): Promise<boolean> => {
  try {
    // Check billing subscription periods
    const activePeriod = await getActiveSubscriptionPeriod(accountAddress)
    if (activePeriod && activePeriod.billing_plan_id) {
      return true
    }

    // Check domain subscriptions (billing_plan_id is null, domain is not null)
    const domainSubscriptions = await getSubscriptionFromDBForAccount(
      accountAddress
    )
    const hasDomain = domainSubscriptions.some(
      sub => sub.billing_plan_id === null && sub.domain !== null
    )

    return hasDomain
  } catch (error) {
    Sentry.captureException(error)
    return false
  }
}

// Check if an account has any subscription history
const hasSubscriptionHistory = async (
  accountAddress: string
): Promise<boolean> => {
  const { count, error } = await db.supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('owner_account', accountAddress.toLowerCase())

  if (error) {
    Sentry.captureException(error)
    throw new SubscriptionHistoryCheckError(accountAddress, error.message)
  }

  return (count ?? 0) > 0
}

// Get all subscription periods for an account (history)
const getSubscriptionPeriodsByAccount = async (
  accountAddress: string
): Promise<Tables<'subscriptions'>[]> => {
  const { data, error } = await db.supabase
    .from('subscriptions')
    .select('*')
    .eq('owner_account', accountAddress.toLowerCase())
    .order('registered_at', { ascending: false })

  if (error) {
    Sentry.captureException(error)
    throw new SubscriptionPeriodsFetchError(accountAddress, error.message)
  }

  return data || []
}

// Get subscription history with pagination (for payment history)
// Returns subscription periods with transaction and billing plan data
const getSubscriptionHistory = async (
  accountAddress: string,
  limit = 10,
  offset = 0
): Promise<{ periods: Tables<'subscriptions'>[]; total: number }> => {
  // First, get total count of billing subscriptions
  const { count, error: countError } = await db.supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('owner_account', accountAddress.toLowerCase())
    .not('billing_plan_id', 'is', null) // Only billing subscriptions

  if (countError) {
    Sentry.captureException(countError)
    throw new SubscriptionHistoryFetchError(accountAddress, countError.message)
  }

  // Get paginated subscription periods
  const { data, error } = await db.supabase
    .from('subscriptions')
    .select('*')
    .eq('owner_account', accountAddress.toLowerCase())
    .not('billing_plan_id', 'is', null) // Only billing subscriptions
    .order('registered_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    Sentry.captureException(error)
    throw new SubscriptionHistoryFetchError(accountAddress, error.message)
  }

  return {
    periods: data || [],
    total: count || 0,
  }
}

// Get billing subscription periods expiring within a date range
const getBillingPeriodsByExpiryWindow = async (
  startDate: Date,
  endDate: Date,
  statuses: ('active' | 'cancelled')[] = ['active', 'cancelled']
): Promise<Tables<'subscriptions'>[]> => {
  const { data, error } = await db.supabase
    .from('subscriptions')
    .select('*')
    .not('billing_plan_id', 'is', null) // Only billing subscriptions
    .in('status', statuses)
    .gte('expiry_time', startDate.toISOString())
    .lte('expiry_time', endDate.toISOString())
    .gt('expiry_time', new Date().toISOString()) // Not expired yet
    .order('expiry_time', { ascending: true })

  if (error) {
    Sentry.captureException(error)
    throw new BillingPeriodsFetchError(error.message)
  }

  return data || []
}

// Expire stale subscription periods (expiry_time in the past)
const expireStaleSubscriptionPeriods = async (): Promise<{
  success: boolean
  expiredPeriods: Tables<'subscriptions'>[]
  expiredCount: number
  timestamp: string
}> => {
  try {
    const now = new Date().toISOString()

    // First, get the periods that need to be expired (before updating)
    const { data: periodsToExpire, error: selectError } = await db.supabase
      .from('subscriptions')
      .select('*')
      .not('billing_plan_id', 'is', null) // Only billing subscriptions
      .in('status', ['active', 'cancelled'])
      .lte('expiry_time', now) // Expired (in the past)

    if (selectError) throw selectError

    if (!periodsToExpire || periodsToExpire.length === 0) {
      return {
        success: true,
        expiredPeriods: [],
        expiredCount: 0,
        timestamp: now,
      }
    }

    // Update all expired periods to 'expired' status
    const periodIds = periodsToExpire.map(p => p.id)
    const { error: updateError } = await db.supabase
      .from('subscriptions')
      .update({ status: 'expired', updated_at: now })
      .in('id', periodIds)
      .in('status', ['active', 'cancelled'])

    if (updateError) throw updateError

    return {
      success: true,
      expiredPeriods: periodsToExpire,
      expiredCount: periodsToExpire.length,
      timestamp: now,
    }
  } catch (error) {
    Sentry.captureException(error)
    throw new SubscriptionPeriodsExpirationError(
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

// Update subscription period status
const updateSubscriptionPeriodStatus = async (
  subscriptionId: string,
  status: 'active' | 'cancelled' | 'expired'
): Promise<Tables<'subscriptions'>> => {
  const { data, error } = await db.supabase
    .from('subscriptions')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .select()
    .single()

  if (error) {
    Sentry.captureException(error)
    throw new SubscriptionPeriodStatusUpdateError(subscriptionId, error.message)
  }

  if (!data) {
    throw new SubscriptionPeriodStatusUpdateError(
      subscriptionId,
      'No data returned'
    )
  }

  return data
}

// Update subscription period transaction_id
const updateSubscriptionPeriodTransaction = async (
  subscriptionId: string,
  transactionId: string
): Promise<Tables<'subscriptions'>> => {
  const { data, error } = await db.supabase
    .from('subscriptions')
    .update({
      transaction_id: transactionId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .select()
    .single()

  if (error) {
    Sentry.captureException(error)
    throw new SubscriptionPeriodTransactionUpdateError(
      subscriptionId,
      error.message
    )
  }

  if (!data) {
    throw new SubscriptionPeriodTransactionUpdateError(
      subscriptionId,
      'No data returned'
    )
  }

  return data
}

const findSubscriptionPeriodByPlanAndExpiry = async (
  accountAddress: string,
  billingPlanId: string,
  expiryTime: string
): Promise<Tables<'subscriptions'> | null> => {
  const { data, error } = await db.supabase
    .from('subscriptions')
    .select('*')
    .eq('owner_account', accountAddress.toLowerCase())
    .eq('billing_plan_id', billingPlanId)
    .is('transaction_id', null)
    .order('registered_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    Sentry.captureException(error)
    throw new SubscriptionPeriodFindError(error.message)
  }

  return data
}

const findRecentSubscriptionPeriodByPlan = async (
  accountAddress: string,
  billingPlanId: string,
  createdAfter: string
): Promise<Tables<'subscriptions'> | null> => {
  const { data, error } = await db.supabase
    .from('subscriptions')
    .select('*')
    .eq('owner_account', accountAddress.toLowerCase())
    .eq('billing_plan_id', billingPlanId)
    .gte('registered_at', createdAfter)
    .order('registered_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    Sentry.captureException(error)
    throw new SubscriptionPeriodFindError(error.message)
  }

  return data
}

const getSlotInstance = async (slotInstanceId: string) => {
  const { data: slotInstance, error } = await db.supabase.rpc<SlotInstance>(
    'get_slot_instance_by_id',
    { instance_id: slotInstanceId }
  )
  if (error) {
    throw new Error('Could not fetch slot instance')
  }
  if (!slotInstance) {
    throw new Error('Slot instance not found')
  }
  return Array.isArray(slotInstance) ? slotInstance[0] : slotInstance
}

export {
  acceptContactInvite,
  addContactInvite,
  addOrUpdateConnectedCalendar,
  addQuickPollParticipant,
  addUserToGroup,
  cancelQuickPoll,
  changeGroupRole,
  checkContactExists,
  cleanupExpiredVerifications,
  confirmFiatTransaction,
  connectedCalendarExists,
  contactInviteByEmailExists,
  countActiveQuickPolls,
  countCalendarIntegrations,
  countCalendarSyncs,
  countGroups,
  countMeetingTypes,
  createCheckOutTransaction,
  createCryptoTransaction,
  createMeetingType,
  createOrUpdateEventNotification,
  createPaymentPreferences,
  createPinHash,
  createQuickPoll,
  createStripeSubscription,
  createSubscriptionPeriod,
  createSubscriptionTransaction,
  createTgConnection,
  createVerification,
  deleteAllTgConnections,
  deleteGateCondition,
  deleteGroup,
  deleteMeetingFromDB,
  deleteMeetingType,
  deleteQuickPoll,
  deleteTgConnection,
  deleteVerifications,
  editGroup,
  expireStalePolls,
  expireStaleSubscriptionPeriods,
  findAccountByEmail,
  findAccountByIdentifier,
  findAccountsByEmails,
  findAccountsByText,
  findRecentSubscriptionPeriodByPlan,
  findSubscriptionPeriodByPlanAndExpiry,
  getAccountAvatarUrl,
  getAccountFromDB,
  getAccountFromDBPublic,
  getAccountNonce,
  getAccountNotificationSubscriptionEmail,
  getAccountNotificationSubscriptions,
  getAccountPreferencesLean,
  getAccountsNotificationSubscriptionEmails,
  getAccountsWithTgConnected,
  getActivePaymentAccount,
  getActivePaymentAccountDB,
  getActiveSubscriptionPeriod,
  getBillingEmailAccountInfo,
  getBillingPeriodsByExpiryWindow,
  getBillingPlanById,
  getBillingPlanIdFromStripeProduct,
  getBillingPlanProvider,
  getBillingPlanProviders,
  getBillingPlans,
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
  getEventNotification,
  getExistingAccountsFromDB,
  getGateCondition,
  getGateConditionsForAccount,
  getGoogleEventMappingId,
  getGroup,
  getGroupInternal,
  getGroupInvites,
  getGroupInvitesCount,
  getGroupMemberAvailabilities,
  getGroupMembersAvailabilities,
  getGroupMembersOrInvite,
  getGroupName,
  getGroupsAndMembers,
  getGroupsEmpty,
  getGroupUsers,
  getGroupUsersInternal,
  getGuestSlotById,
  getMeetingFromDB,
  getMeetingSessionsByTxHash,
  getMeetingTypeFromDB,
  getMeetingTypeFromDBLean,
  getMeetingTypes,
  getMeetingTypesForAvailabilityBlock,
  getNewestCoupon,
  getOfficeEventMappingId,
  getOfficeMeetingIdMappingId,
  getOrCreateContactInvite,
  getOrCreatePaymentAccount,
  getOwnerPublicUrlServer,
  getPaidSessionsByMeetingType,
  getPaymentAccountByProviderId,
  getPaymentPreferences,
  getQuickPollById,
  getQuickPollBySlug,
  getQuickPollCalendars,
  getQuickPollParticipantById,
  getQuickPollParticipantByIdentifier,
  getQuickPollParticipants,
  getQuickPollsForAccount,
  getSlotById,
  getSlotByMeetingIdAndAccount,
  getSlotInstance,
  getSlotsByIds,
  getSlotSeries,
  getSlotSeriesId,
  getSlotsForAccount,
  getSlotsForAccountMinimal,
  getSlotsForAccountWithConference,
  getSlotsForDashboard,
  getStripeSubscriptionByAccount,
  getStripeSubscriptionById,
  getSubscriptionHistory,
  getSubscriptionPeriodsByAccount,
  getTgConnection,
  getTgConnectionByTgId,
  getTransactionsById,
  getTransactionsStatusById,
  handleGuestCancel,
  handleMeetingCancelSync,
  handleUpdateTransactionStatus,
  handleWebhookEvent,
  hasSubscriptionHistory,
  initAccountDBForWallet,
  initDB,
  insertOfficeEventMapping,
  invalidatePreviousVerifications,
  isGroupAdmin,
  isProAccountAsync,
  isSlotAvailable as isSlotFree,
  isUserContact,
  leaveGroup,
  linkTransactionToStripeSubscription,
  manageGroupInvite,
  parseParticipantSlots,
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
  saveQuickPollCalendar,
  selectTeamMeetingRequest,
  setAccountNotificationSubscriptions,
  subscribeWithCoupon,
  syncAllSeries,
  syncWebhooks,
  updateAccountFromInvite,
  updateAccountPreferences,
  updateAllRecurringSlots,
  updateAvailabilityBlockMeetingTypes,
  updateContactInviteCooldown,
  updateCustomSubscriptionDomain,
  updateGroupAvatar,
  updateGroupMemberAvailabilities,
  updateMeeting,
  updateMeetingInstance,
  updateMeetingType,
  updatePaymentAccount,
  updatePaymentPreferences,
  updatePreferenceAvatar,
  updatePreferenceBanner,
  updateQuickPoll,
  updateQuickPollGuestDetails,
  updateQuickPollParticipantAvailability,
  updateQuickPollParticipants,
  updateQuickPollParticipantStatus,
  updateRecurringSlots,
  updateStripeSubscription,
  updateSubscriptionPeriodStatus,
  updateSubscriptionPeriodTransaction,
  upsertGateCondition,
  verifyUserPin,
  verifyVerificationCode,
  workMeetingTypeGates,
  getSeriesIdMapping,
}
