import * as Sentry from '@sentry/nextjs'
import { type SupabaseClient, createClient } from '@supabase/supabase-js'
import CryptoJS from 'crypto-js'
import { addMinutes, addMonths, isAfter } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'
import EthCrypto, {
  decryptWithPrivateKey,
  Encrypted,
  encryptWithPublicKey,
} from 'eth-crypto'
import { validate } from 'uuid'

import {
  Account,
  AccountPreferences,
  MeetingType,
  SimpleAccountInfo,
} from '@/types/Account'
import {
  AccountNotifications,
  NotificationChannel,
} from '@/types/AccountNotifications'
import {
  CalendarSyncInfo,
  ConnectedCalendar,
} from '@/types/CalendarConnections'
import { SupportedChain } from '@/types/chains'
import { DiscordAccount } from '@/types/Discord'
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
  ConferenceMeeting,
  DBSlot,
  ExtendedDBSlot,
  GroupMeetingRequest,
  GroupNotificationType,
  MeetingAccessType,
  MeetingDecrypted,
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
  AccountNotFoundError,
  AdminBelowOneError,
  AlreadyGroupMemberError,
  CouponAlreadyUsed,
  CouponExpired,
  CouponNotValid,
  GateConditionNotValidError,
  GateInUseError,
  GroupCreationError,
  GroupNotExistsError,
  IsGroupAdminError,
  MeetingChangeConflictError,
  MeetingCreationError,
  MeetingNotFoundError,
  NoActiveSubscription,
  NotGroupAdminError,
  NotGroupMemberError,
  SubscriptionNotCustom,
  TimeNotAvailableError,
  UnauthorizedError,
} from '@/utils/errors'
import { ParticipantInfoForNotification } from '@/utils/notification_helper'

import {
  generateDefaultMeetingType,
  generateEmptyAvailabilities,
} from './calendar_manager'
import { apiUrl } from './constants'
import { decryptContent, encryptContent } from './cryptography'
import { addRecurrence } from './date_helper'
import { isTimeInsideAvailabilities } from './slots.helper'
import { isProAccount } from './subscription_manager'
import { isConditionValid } from './token.gate.service'
import { isValidEVMAddress } from './validations'

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
      .from<AccountPreferences>('account_preferences')
      .select()
      .match({ owner_account_address: owner_account_address.toLowerCase() })

  if (
    account_preferences_error ||
    !account_preferences ||
    account_preferences.length === 0
  ) {
    console.error(account_preferences_error)
    throw new Error("Couldn't get account's preferences")
  }

  // fix badly migrated accounts - should be removed at some point in the future
  if (account_preferences[0].availabilities.length === 0) {
    const defaultAvailabilities = generateEmptyAvailabilities()
    const { data: newPreferences, error: newPreferencesError } =
      await db.supabase
        .from<AccountPreferences>('account_preferences')
        .update({
          availabilities: defaultAvailabilities,
        })
        .match({ owner_account_address: owner_account_address.toLowerCase() })

    if (newPreferencesError) {
      console.error(newPreferences)
      throw new Error('Error while completing empty preferences')
    }

    return Array.isArray(newPreferences) ? newPreferences[0] : newPreferences
  }

  return account_preferences[0]
}

const getExistingAccountsFromDB = async (
  addresses: string[],
  fullInformation?: boolean
): Promise<SimpleAccountInfo[] | Account[]> => {
  let queryString = ` 
      address,
      internal_pub_key
    `
  if (fullInformation) {
    queryString += `
      ,calendars: connected_calendars(provider),
      preferences: account_preferences(*)
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
      const discord_account = await getDiscordAccount(account.address)

      account.discord_account = discord_account
    }
    return account
  } else if (error) {
    throw new Error(error.message)
  }
  throw new AccountNotFoundError(identifier)
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

const isSlotFree = async (
  account_address: string,
  start: Date,
  end: Date,
  meetingTypeId: string
): Promise<boolean> => {
  const account = await getAccountFromDB(account_address)

  const minTime = account.preferences?.availableTypes.filter(
    (mt: MeetingType) => mt.id === meetingTypeId
  )

  if (
    minTime &&
    minTime.length > 0 &&
    minTime[0].minAdvanceTime &&
    isAfter(addMinutes(new Date(), minTime[0].minAdvanceTime), start)
  ) {
    return false
  }

  return (
    (await (await getSlotsForAccount(account_address, start, end)).length) == 0
  )
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
    slots: conferenceMeeting.slots.filter(s => slotsToRemove.includes(s)),
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
  decryptedMeetingData: MeetingDecrypted
) => {
  const conferenceMeeting = await getConferenceMeetingFromDB(
    decryptedMeetingData.meeting_id
  )
  if (!conferenceMeeting) {
    throw new MeetingNotFoundError(decryptedMeetingData.meeting_id)
  }
  decryptedMeetingData.related_slot_ids =
    decryptedMeetingData.related_slot_ids.filter(id =>
      conferenceMeeting?.slots.includes(id)
    )
  decryptedMeetingData.participants = decryptedMeetingData.participants.filter(
    p => conferenceMeeting?.slots.includes(p.slot_id!)
  )
  const { error, data: oldSlots } = await db.supabase
    .from<DBSlot>('slots')
    .select()
    .in('id', conferenceMeeting.slots)
  if (error) {
    throw new Error(error.message)
  }

  for (const slot of oldSlots) {
    const account = await getAccountFromDB(slot.account_address)
    await db.supabase
      .from('slots')
      .update({
        meeting_info_encrypted: await encryptWithPublicKey(
          account.internal_pub_key,
          JSON.stringify(decryptedMeetingData)
        ),
        version: slot.version + 1,
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
  reason?: string
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

  const ownerParticipant =
    meeting.participants_mapping.find(p => p.type === ParticipantType.Owner) ||
    null

  const ownerAccount = ownerParticipant
    ? await getAccountFromDB(ownerParticipant.account_address!)
    : null

  const schedulerAccount =
    meeting.participants_mapping.find(
      p => p.type === ParticipantType.Scheduler
    ) || null

  const ownerIsNotScheduler =
    !!ownerParticipant &&
    !!schedulerAccount &&
    ownerParticipant.account_address !== schedulerAccount.account_address

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
  })
  if (!createdRootMeeting) {
    throw new Error(
      'Could not create your meeting right now, get in touch with us if the problem persists'
    )
  }
  const timezone = meeting.participants_mapping[0].timeZone
  for (const participant of meeting.participants_mapping) {
    if (participant.account_address) {
      if (
        existingAccounts
          .map(account => account.address)
          .includes(participant.account_address!) &&
        participant.type === ParticipantType.Owner
      ) {
        // only validate slot if meeting is being scheduled on someone's calendar and not by the person itself (from dashboard for example)
        const participantIsOwner = Boolean(
          ownerParticipant &&
            ownerParticipant.account_address?.toLowerCase() ===
              participant.account_address.toLowerCase()
        )

        const slotIsTaken = async () =>
          !(await isSlotFree(
            participant.account_address!,
            new Date(meeting.start),
            new Date(meeting.end),
            meeting.meetingTypeId
          ))
        const isTimeAvailable = () =>
          isTimeInsideAvailabilities(
            utcToZonedTime(meeting.start, ownerAccount!.preferences.timezone),
            utcToZonedTime(meeting.end, ownerAccount!.preferences.timezone),
            ownerAccount!.preferences.availabilities
          )
        if (
          participantIsOwner &&
          ownerIsNotScheduler &&
          (!isTimeAvailable() || (await slotIsTaken()))
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
        participant.timeZone = account.preferences.timezone
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

const getUserGroups = async (
  address: string,
  limit: number,
  offset: number,
  email?: string
): Promise<Array<UserGroups>> => {
  const { data: invites, error: invitesError } = await db.supabase
    .from('group_invites')
    .select(
      `
      role,
      group: groups( id, name, slug )
  `
    )
    .or(
      `user_id.eq.${address.toLowerCase()}${email ? `,email.eq.${email}` : ''}`
    )
    .range(
      offset || 0,
      (offset || 0) + (limit ? limit - 1 : 999_999_999_999_999)
    )
  const { data, error } = await db.supabase
    .from('group_members')
    .select(
      `
      role,
      group: groups( id, name, slug )
  `
    )
    .eq('member_id', address.toLowerCase())
    .range(
      offset || 0,
      (offset || 0) +
        (limit ? limit - 1 - (invites?.length || 0) : 999_999_999_999_999)
    )

  if (invitesError) {
    throw new Error(invitesError.message)
  }
  if (error) {
    throw new Error(error.message)
  }
  if (data || invites) {
    return invites
      .map(val => ({ ...val, invitePending: true }))
      .concat(data.map(val => ({ ...val, invitePending: false })))
  }
  return []
}
const getGroupsAndMembers = async (
  address: string,
  limit: number,
  offset: number
): Promise<Array<GetGroupsFullResponse>> => {
  const { data, error } = await db.supabase
    .from('group_members')
    .select(
      `
      role,
      group: groups( id, name, slug )
  `
    )
    .eq('member_id', address.toLowerCase())
    .range(
      offset || 0,
      (offset || 0) + (limit ? limit - 1 : 999_999_999_999_999)
    )
  if (error) {
    throw new Error(error.message)
  }
  const groups = []
  for (const group of data) {
    const { data: membersData, error: membersError } = await db.supabase
      .from('group_members')
      .select()
      .eq('group_id', group.group.id)
    if (membersError) {
      throw new Error(membersError.message)
    }
    const addresses = membersData.map(
      (member: GroupMemberQuery) => member.member_id
    )
    const { data: members, error } = await db.supabase
      .from('accounts')
      .select(
        `
         group_members: group_members(*),
         preferences: account_preferences(name),
         calendars: connected_calendars(calendars)
    `
      )
      .in('address', addresses)
      .filter('group_members.group_id', 'eq', group.group.id)
      .range(
        offset || 0,
        (offset || 0) + (limit ? limit - 1 : 999_999_999_999_999)
      )
    if (error) {
      throw new Error(error.message)
    }

    if (data) {
      groups.push({
        ...group.group,
        members: members.map(member => ({
          userId: member.group_members?.[0]?.id,
          displayName: member.preferences?.name,
          address: member.group_members?.[0]?.member_id as string,
          role: member.group_members?.[0].role,
          invitePending: false,
          calendarConnected: !!member.calendars[0]?.calendars?.length,
        })),
      })
    }
  }
  return groups
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
}: GroupInviteFilters): Promise<Array<UserGroups>> => {
  let query = db.supabase.from('group_invites').select(`
    id,
    role,
    group: groups(id, name, slug)
  `)
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
  query = query.range(
    offset || 0,
    (offset || 0) + (limit ? limit - 1 : 999999999999999)
  )

  try {
    const { data, error } = await query
    if (error) {
      console.error('Error executing query:', error)
      throw new Error(error.message)
    }

    const result = data.map((item: any) => ({
      ...item,
      invitePending: true, // Since this is from group_invites, set invitePending to true
    }))
    return result
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error in getGroupInvites function:', error.message)
      throw new Error(error.message)
    } else {
      console.error('Unexpected error in getGroupInvites function:', error)
      throw new Error('An unexpected error occurred')
    }
  }
}
const publicGroupJoin = async (group_id: string, address: string) => {
  const groupUsers = await getGroupMembersInternal(group_id)
  if (groupUsers.map(val => val.member_id).includes(address.toLowerCase())) {
    throw new AlreadyGroupMemberError()
  }
  const { error: memberError } = await db.supabase
    .from('group_members')
    .insert({
      group_id,
      member_id: address.toLowerCase(),
      role: MemberType.MEMBER,
    })
  if (memberError) {
    throw new Error(memberError.message)
  }
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
  const { error: memberError } = await db.supabase
    .from('group_members')
    .insert({
      group_id,
      member_id: address.toLowerCase(),
      role: data[0].role,
    })
  if (memberError) {
    throw new Error(memberError.message)
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
      calendars: connected_calendars(calendars)
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
    activeOnly,
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

  const [{ data, error }, account] = await Promise.all([
    query,
    getAccountFromDB(address),
  ])

  if (error) {
    throw new Error(error.message)
  }

  if (!data) return []

  const connectedCalendars: ConnectedCalendar[] =
    !isProAccount(account) && activeOnly ? data.slice(0, 1) : data

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

  return data[0] as ConnectedCalendar
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

  if (error) {
    throw new Error(error.message)
  }

  return Array.isArray(data) ? data[0] : data
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
      meetingUpdateRequest.participants_mapping.map(p => p.account_address)
    ).size !== meetingUpdateRequest.participants_mapping.length
  ) {
    //means there are duplicate participants
    throw new MeetingCreationError()
  }

  const slots = []
  let meetingResponse = {} as DBSlot
  let index = 0
  let i = 0

  const existingAccounts = await getExistingAccountsFromDB(
    meetingUpdateRequest.participants_mapping.map(p => p.account_address!)
  )
  const ownerParticipant =
    meetingUpdateRequest.participants_mapping.find(
      p => p.type === ParticipantType.Owner
    ) || null

  const ownerAccount = ownerParticipant
    ? await getAccountFromDB(ownerParticipant.account_address!)
    : null

  const schedulerAccount =
    meetingUpdateRequest.participants_mapping.find(
      p => p.type === ParticipantType.Scheduler
    ) || null

  const timezone = meetingUpdateRequest.participants_mapping[0].timeZone
  let changingTime = null

  for (const participant of meetingUpdateRequest.participants_mapping) {
    const isEditing = participant.mappingType === ParticipantMappingType.KEEP

    if (participant.account_address) {
      if (
        existingAccounts
          .map(account => account.address)
          .includes(participant.account_address!)
      ) {
        // only validate slot if meeting is being scheduled on someones calendar and not by the person itself (from dashboard for example)
        const participantIsOwner = Boolean(
          ownerParticipant &&
            ownerParticipant.account_address?.toLowerCase() ===
              participant.account_address.toLowerCase()
        )
        const ownerIsNotScheduler = Boolean(
          ownerParticipant &&
            schedulerAccount &&
            ownerParticipant.account_address !==
              schedulerAccount.account_address
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
          !(await isSlotFree(
            participant.account_address!,
            new Date(meetingUpdateRequest.start),
            new Date(meetingUpdateRequest.end),
            meetingUpdateRequest.meetingTypeId
          ))

        const isTimeAvailable = () =>
          isTimeInsideAvailabilities(
            utcToZonedTime(
              meetingUpdateRequest.start,
              ownerAccount!.preferences.timezone
            ),
            utcToZonedTime(
              meetingUpdateRequest.end,
              ownerAccount!.preferences.timezone
            ),
            ownerAccount!.preferences.availabilities
          )

        if (
          participantIsOwner &&
          ownerIsNotScheduler &&
          !isEditingToSameTime &&
          participantActing.account_address !== participant.account_address &&
          (!isTimeAvailable() || (await slotIsTaken()))
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

  // TODO: for now
  let meetingProvider = MeetingProvider.CUSTOM
  if (meetingUpdateRequest.meeting_url.includes('huddle')) {
    meetingProvider = MeetingProvider.HUDDLE
  }
  const meeting = await getConferenceMeetingFromDB(
    meetingUpdateRequest.meeting_id
  )
  // now that everything happened without error, it is safe to update the root meeting data
  const createdRootMeeting = await saveConferenceMeetingToDB({
    id: meetingUpdateRequest.meeting_id,
    start: meetingUpdateRequest.start,
    end: meetingUpdateRequest.end,
    meeting_url: meetingUpdateRequest.meeting_url,
    access_type: MeetingAccessType.OPEN_MEETING,
    provider: meetingProvider,
    recurrence: meetingUpdateRequest.meetingRepeat,
    version: MeetingVersion.V2,
    slots: meeting.slots?.filter(
      val => !meetingUpdateRequest.slotsToRemove.includes(val)
    ),
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
      timezone
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
export {
  addOrUpdateConnectedCalendar,
  changeGroupRole,
  connectedCalendarExists,
  createTgConnection,
  deleteAllTgConnections,
  deleteGateCondition,
  deleteGroup,
  deleteMeetingFromDB,
  deleteTgConnection,
  editGroup,
  getAccountFromDB,
  getAccountNonce,
  getAccountNotificationSubscriptionEmail,
  getAccountNotificationSubscriptions,
  getAccountsNotificationSubscriptionEmails,
  getAppToken,
  getConferenceDataBySlotId,
  getConferenceMeetingFromDB,
  getConnectedCalendars,
  getExistingAccountsFromDB,
  getGateCondition,
  getGateConditionsForAccount,
  getGroup,
  getGroupInternal,
  getGroupInvites,
  getGroupName,
  getGroupsAndMembers,
  getGroupsEmpty,
  getGroupUsers,
  getGroupUsersInternal,
  getMeetingFromDB,
  getNewestCoupon,
  getOfficeEventMappingId,
  getSlotsForAccount,
  getSlotsForDashboard,
  getTgConnection,
  getTgConnectionByTgId,
  getUserGroups,
  handleGuestCancel,
  handleMeetingCancelSync,
  initAccountDBForWallet,
  initDB,
  insertOfficeEventMapping,
  isGroupAdmin,
  isSlotFree,
  leaveGroup,
  manageGroupInvite,
  publicGroupJoin,
  rejectGroupInvite,
  removeConnectedCalendar,
  removeMember,
  saveConferenceMeetingToDB,
  saveEmailToDB,
  saveMeeting,
  selectTeamMeetingRequest,
  setAccountNotificationSubscriptions,
  subscribeWithCoupon,
  updateAccountFromInvite,
  updateAccountPreferences,
  updateAllRecurringSlots,
  updateCustomSubscriptionDomain,
  updateMeeting,
  updateRecurringSlots,
  upsertGateCondition,
  workMeetingTypeGates,
}
