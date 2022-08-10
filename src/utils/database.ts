import * as Sentry from '@sentry/node'
import { createClient } from '@supabase/supabase-js'
import { addMinutes, isAfter } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'
import EthCrypto, {
  decryptWithPrivateKey,
  Encrypted,
  encryptWithPublicKey,
} from 'eth-crypto'
import { validate } from 'uuid'

import {
  GateConditionObject,
  GateUsage,
  GateUsageType,
} from '@/types/TokenGating'

import {
  Account,
  AccountPreferences,
  MeetingType,
  SimpleAccountInfo,
} from '../types/Account'
import {
  AccountNotifications,
  NotificationChannel,
} from '../types/AccountNotifications'
import {
  ConnectedCalendar,
  ConnectedCalendarCorePayload,
} from '../types/CalendarConnections'
import {
  DBSlot,
  DBSlotEnhanced,
  GroupMeetingRequest,
  MeetingCreationRequest,
  MeetingICS,
  ParticipantType,
  TimeSlotSource,
} from '../types/Meeting'
import { Subscription } from '../types/Subscription'
import {
  AccountNotFoundError,
  GateConditionNotValidError,
  GateInUseError,
  MeetingCreationError,
  MeetingNotFoundError,
  TimeNotAvailableError,
  UnauthorizedError,
} from '../utils/errors'
import {
  generateDefaultAvailabilities,
  generateDefaultMeetingType,
  isTimeInsideAvailabilities,
} from './calendar_manager'
import { apiUrl } from './constants'
import { encryptContent } from './cryptography'
import { addContentToIPFS, fetchContentFromIPFS } from './ipfs_helper'
import { isProAccount } from './subscription_manager'
import { isConditionValid } from './token.gate.service'
import { isValidEVMAddress } from './validations'

const db: { ready: boolean } & Record<string, any> = { ready: false }

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
    await getAccountFromDB(address)
    return await updateAccountFromInvite(address, signature, timezone, nonce)
  } catch (error) {}

  const newIdentity = EthCrypto.createIdentity()

  const encryptedPvtKey = encryptContent(signature, newIdentity.privateKey)

  const { data, error } = await db.supabase.from('accounts').insert([
    {
      address: address.toLowerCase(),
      internal_pub_key: newIdentity.publicKey,
      encoded_signature: encryptedPvtKey,
      preferences_path: '',
      nonce,
      is_invited: is_invited || false,
    },
  ])

  if (error) {
    Sentry.captureException(error)
    throw new Error("Account couldn't be created")
  }

  const availabilities = generateDefaultAvailabilities()

  const preferences: AccountPreferences = {
    availableTypes: [generateDefaultMeetingType()],
    description: '',
    availabilities,
    socialLinks: [],
    timezone,
  }

  const path = await addContentToIPFS(preferences)
  //TODO handle ipfs error

  const responsePrefs = await db.supabase
    .from('accounts')
    .update({
      preferences_path: path,
    })
    .match({ id: data[0].id })

  if (responsePrefs.error) {
    Sentry.captureException(responsePrefs.error)
    //TODO: handle error
  }

  const account = responsePrefs.data[0] as Account
  account.preferences = preferences
  account.is_invited = is_invited || false

  return account
}

const updateAccountFromInvite = async (
  account_address: string,
  signature: string,
  timezone: string,
  nonce: number
): Promise<Account> => {
  const exitingAccount = await getAccountFromDB(account_address)
  if (!exitingAccount.is_invited) {
    // do not screw up accounts that already have been set up
    return exitingAccount
  }

  //fetch this before changing internal pub key
  const currentMeetings = await getSlotsForAccount(account_address)

  const newIdentity = EthCrypto.createIdentity()

  const encryptedPvtKey = encryptContent(signature, newIdentity.privateKey)

  const { _, error } = await db.supabase.from('accounts').upsert(
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
    Sentry.captureException(error)
    throw new Error("Account couldn't be created")
  }

  const account = await getAccountFromDB(account_address)
  account.preferences!.timezone = timezone

  await updateAccountPreferences(account)

  for (const slot of currentMeetings) {
    const encrypted = (await fetchContentFromIPFS(
      slot.meeting_info_file_path
    )) as Encrypted

    const privateInfo = await decryptWithPrivateKey(
      process.env.NEXT_SERVER_PVT_KEY!,
      encrypted
    )
    const newPvtInfo = await encryptWithPublicKey(
      newIdentity.publicKey,
      privateInfo
    )
    const newEncryptedPath = await addContentToIPFS(newPvtInfo)

    const { _, error } = await db.supabase
      .from('slots')
      .update({
        account_address: newIdentity.address,
        meeting_info_file_path: newEncryptedPath,
      })
      .match({ id: slot.id })

    if (error) {
      Sentry.captureException(error)
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
  const path = await addContentToIPFS(account.preferences!)
  //TODO handle ipfs error

  await workMeetingTypeGates(account.preferences!.availableTypes || [])
  const { data, error } = await db.supabase
    .from('accounts')
    .update({
      preferences_path: path,
    })
    .match({ id: account.id })

  if (error) {
    Sentry.captureException(error)
    //TODO: handle error
  }

  const _account = { ...data[0], preferences: account.preferences }
  _account.subscriptions = await getSubscriptionFromDBForAccount(
    account.address
  )

  return _account as Account
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
    return data[0].nonce as number
  }

  throw new AccountNotFoundError(identifier)
}

const getExistingAccountsFromDB = async (
  addresses: string[]
): Promise<SimpleAccountInfo[]> => {
  const { data, error } = await db.supabase
    .from('accounts')
    .select('address, internal_pub_key')
    .in(
      'address',
      addresses.map(address => address.toLowerCase())
    )

  if (error) {
    Sentry.captureException(error)
    throw new Error("Couldn't get accounts")
  }

  return data
}

const getAccountFromDB = async (identifier: string): Promise<Account> => {
  const { data, error } = await db.supabase.rpc('fetch_account', {
    identifier: identifier,
  })

  if (data) {
    const account = data as Account
    account.preferences = (await fetchContentFromIPFS(
      account.preferences_path
    )) as AccountPreferences

    account.subscriptions = await getSubscriptionFromDBForAccount(
      account.address
    )

    return account
  } else {
    Sentry.captureException(error)
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
    Sentry.captureException(error)
    // //TODO: handle error
  }

  return data || []
}

const getSlotsForDashboard = async (
  identifier: string,
  end: Date,
  limit: number,
  offset: number
): Promise<DBSlot[]> => {
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
    Sentry.captureException(error)
    // //TODO: handle error
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

const getMeetingFromDB = async (slot_id: string): Promise<DBSlotEnhanced> => {
  const { data, error } = await db.supabase
    .from('slots')
    .select()
    .eq('id', slot_id)

  if (error) {
    Sentry.captureException(error)
    // todo handle error
  }

  if (data.length == 0) {
    throw new MeetingNotFoundError(slot_id)
  }

  const dbMeeting = data[0] as DBSlot
  const meeting: DBSlotEnhanced = {
    ...dbMeeting,
    meeting_info_encrypted: (await fetchContentFromIPFS(
      dbMeeting.meeting_info_file_path
    )) as Encrypted,
  }

  return meeting
}

const saveMeeting = async (
  meeting: MeetingCreationRequest
): Promise<DBSlotEnhanced> => {
  if (
    new Set(
      meeting.participants_mapping.map(p => p.account_address || p.guest_email)
    ).size !== meeting.participants_mapping.length
  ) {
    //means there are duplicate participants
    throw new MeetingCreationError()
  }

  const slots = []
  let meetingResponse = {} as DBSlotEnhanced
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

  const ownerIsNotScheduler = Boolean(
    ownerParticipant &&
      schedulerAccount &&
      ownerParticipant.account_address !== schedulerAccount.account_address
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

      if (!valid) {
        throw new GateConditionNotValidError()
      }
    }
  }

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
            ownerParticipant.account_address === participant.account_address
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
            utcToZonedTime(meeting.start, ownerAccount!.preferences!.timezone!),
            utcToZonedTime(meeting.end, ownerAccount!.preferences!.timezone!),
            ownerAccount!.preferences!.availabilities
          )
        if (
          participantIsOwner &&
          ownerIsNotScheduler &&
          (!isTimeAvailable() || (await slotIsTaken()))
        ) {
          throw new TimeNotAvailableError()
        }
      }

      let account: Account

      if (
        existingAccounts
          .map(account => account.address)
          .includes(participant.account_address!)
      ) {
        account = await getAccountFromDB(participant.account_address!)
        participant.timeZone = account.preferences!.timezone
      } else {
        account = await initAccountDBForWallet(
          participant.account_address!,
          '',
          participant.timeZone,
          0,
          true
        )
      }

      const path = await addContentToIPFS(participant.privateInfo)

      // Not adding source here given on our database the source is always MWW
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const dbSlot: DBSlot = {
        id: participant.slot_id,
        start: meeting.start,
        end: meeting.end,
        account_address: account.address,
        meeting_info_file_path: path,
      }

      slots.push(dbSlot)

      if (
        participant.account_address === schedulerAccount?.account_address ||
        (!schedulerAccount &&
          participant.account_address === ownerAccount?.address)
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
    Sentry.captureException(error)
  }

  meetingResponse.id = data[index].id
  meetingResponse.created_at = data[index].created_at

  const meetingICS: MeetingICS = {
    db_slot: meetingResponse,
    meeting,
  }

  // Doing notifications and syncs asyncrounously
  fetch(`${apiUrl}/server/meetings/syncAndNotify`, {
    method: 'POST',
    body: JSON.stringify(meetingICS),
    headers: {
      'X-Server-Secret': process.env.SERVER_SECRET!,
    },
  })

  return meetingResponse
}

const getAccountNotificationSubscriptions = async (
  address: string
): Promise<AccountNotifications> => {
  const { data, error } = await db.supabase
    .from('account_notifications')
    .select()
    .eq('account_address', address.toLowerCase())

  if (error) {
    Sentry.captureException(error)
  }

  if (data && data[0]) {
    return data[0] as AccountNotifications
  }
  return { account_address: address, notification_types: [] }
}

const setAccountNotificationSubscriptions = async (
  address: string,
  notifications: AccountNotifications
): Promise<AccountNotifications> => {
  const account = await getAccountFromDB(address)
  if (!isProAccount(account)) {
    notifications.notification_types = notifications.notification_types.filter(
      n => n.channel === NotificationChannel.EMAIL
    )
  }

  const { _, error } = await db.supabase
    .from('account_notifications')
    .upsert(notifications, { onConflict: 'account_address' })
    .eq('account_address', address.toLowerCase())

  if (error) {
    Sentry.captureException(error)
  }

  return notifications
}

const saveEmailToDB = async (email: string, plan: string): Promise<boolean> => {
  const { _, error } = await db.supabase.from('emails').upsert([
    {
      email,
      plan,
    },
  ])

  if (!error) {
    return true
  }
  Sentry.captureException(error)

  return false
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
    Sentry.captureException(error)
  }

  if (!data) {
    return []
  }

  const connectedCalendars: ConnectedCalendar[] =
    !isProAccount(account) && activeOnly ? data.slice(0, 1) : data

  if (syncOnly) {
    return connectedCalendars.filter(({ sync }) => sync)
  }

  return connectedCalendars
}

const connectedCalendarExists = async (
  address: string,
  email: string,
  provider: TimeSlotSource
): Promise<boolean> => {
  const { count, error } = await db.supabase
    .from('connected_calendars')
    .select('*', { count: 'exact' })
    .eq('account_address', address.toLowerCase())
    .eq('email', email.toLowerCase())
    .eq('provider', provider)

  if (error) {
    Sentry.captureException(error)
  }

  return count > 0
}

const addOrUpdateConnectedCalendar = async (
  address: string,
  payload: ConnectedCalendarCorePayload
): Promise<ConnectedCalendar> => {
  const existingConnection = await connectedCalendarExists(
    address,
    payload.email,
    payload.provider
  )
  let queryPromise
  if (existingConnection) {
    queryPromise = db.supabase
      .from('connected_calendars')
      .update({ ...payload, updated: new Date() })
      .eq('account_address', address.toLowerCase())
      .eq('email', payload.email.toLowerCase())
      .eq('provider', payload.provider)
  } else {
    queryPromise = db.supabase
      .from('connected_calendars')
      .insert({ ...payload, created: new Date(), account_address: address })
  }

  const { data, error } = await queryPromise

  if (error) {
    Sentry.captureException(error)
  }

  return data as ConnectedCalendar
}

const changeConnectedCalendarSync = async (
  address: string,
  email: string,
  provider: TimeSlotSource,
  sync?: boolean,
  payload?: ConnectedCalendarCorePayload['payload']
): Promise<ConnectedCalendar> => {
  const { data, error } = await db.supabase
    .from('connected_calendars')
    .update({ sync, payload, updated: new Date() })
    .eq('account_address', address.toLowerCase())
    .eq('email', email.toLowerCase())
    .eq('provider', provider)

  if (error) {
    Sentry.captureException(error)
  }

  return data as ConnectedCalendar
}

const removeConnectedCalendar = async (
  address: string,
  email: string,
  provider: TimeSlotSource
): Promise<ConnectedCalendar> => {
  const { data, error } = await db.supabase
    .from('connected_calendars')
    .delete()
    .eq('account_address', address.toLowerCase())
    .eq('email', email.toLowerCase())
    .eq('provider', provider)

  if (error) {
    Sentry.captureException(error)
  }

  return data as ConnectedCalendar
}

export const getSubscriptionFromDBForAccount = async (
  accountAddress: string
): Promise<Subscription[]> => {
  const { data, error } = await db.supabase
    .from('subscriptions')
    .select()
    .gt('expiry_time', new Date().toISOString())
    .eq('owner_account', accountAddress.toLowerCase())

  if (error) {
    Sentry.captureException(error)
    return []
  }

  if (data && data.length > 0) {
    let subscriptions = data as Subscription[]

    const collisionExists = await db.supabase
      .from('subscriptions')
      .select()
      .neq('owner_account', accountAddress.toLowerCase())
      .or(subscriptions.map(s => `domain.ilike.${s.domain}`).join(','))

    if (collisionExists.error) {
      Sentry.captureException(error)
    }

    // If for any reason some smart ass registered a domain manually on the blockchain, but such domain already existed for someone else and is not expired, we remove it here
    for (const collision of collisionExists.data) {
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
    .ilike('domain', domain)
    .gt('expiry_time', new Date().toISOString())
    .order('registered_at', { ascending: true })

  if (error) {
    Sentry.captureException(error)
  }

  if (data) {
    return data[0] as Subscription
  }
  return undefined
}

export const updateAccountSubscriptions = async (
  subscriptions: Subscription[]
): Promise<Subscription[]> => {
  for (const subscription of subscriptions) {
    const { data, error } = await db.supabase
      .from('subscriptions')
      .update({
        expiry_time: subscription.expiry_time,
        config_ipfs_hash: subscription.config_ipfs_hash,
        plan_id: subscription.plan_id,
        owner_account: subscription.owner_account,
      })
      .eq('domain', subscription.domain)
      .eq('chain', subscription.chain)

    if (error && error.length > 0) {
      console.error(error)
      Sentry.captureException(error)
    }

    if (!data || data.length == 0) {
      const { error } = await db.supabase
        .from('subscriptions')
        .insert(subscription)

      if (error) {
        Sentry.captureException(error)
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

  const toUpsert = {
    definition: gateCondition.definition,
    title: gateCondition.title.trim(),
    owner: ownerAccount.toLowerCase(),
  }

  if (gateCondition.id) {
    ;(toUpsert as any).id = gateCondition.id
  }

  const { data, error } = await db.supabase
    .from('gate_definition')
    .upsert([toUpsert])

  if (!error) {
    return data[0] as GateConditionObject
  }
  Sentry.captureException(error)

  return null
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
  } else if (usageResponse.count > 0) {
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

  const { _, error } = await db.supabase
    .from('gate_definition')
    .delete()
    .eq('id', idToDelete)

  if (!error) {
    return true
  }
  Sentry.captureException(error)

  return false
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
  Sentry.captureException(error)

  return null
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
  Sentry.captureException(error)

  return []
}

const getAppToken = async (tokenType: string): Promise<any | null> => {
  const { data, error } = await db.supabase
    .from('application_tokens')
    .select()
    .eq('type', tokenType)

  if (!error) {
    return data[0]
  }

  return null
}

const upsertAppToken = async (
  tokenType: string,
  token: object
): Promise<void> => {
  const { _, error } = await db.supabase.from('application_tokens').upsert(
    [
      {
        type: tokenType,
        token,
      },
    ],
    { onConflict: 'type' }
  )

  if (error) {
    Sentry.captureException(error)
  }

  return
}

const selectTeamMeetingRequest = async (
  id: string
): Promise<GroupMeetingRequest | null> => {
  const { data, error } = await db.supabase
    .from('group_meeting_request')
    .select()
    .eq('id', id)

  if (!error) {
    return data[0] as GroupMeetingRequest
  }

  return null
}

export {
  addOrUpdateConnectedCalendar,
  changeConnectedCalendarSync,
  connectedCalendarExists,
  deleteGateCondition,
  getAccountFromDB,
  getAccountNonce,
  getAccountNotificationSubscriptions,
  getAppToken,
  getConnectedCalendars,
  getExistingAccountsFromDB,
  getGateCondition,
  getGateConditionsForAccount,
  getMeetingFromDB,
  getSlotsForAccount,
  getSlotsForDashboard,
  initAccountDBForWallet,
  initDB,
  isSlotFree,
  removeConnectedCalendar,
  saveEmailToDB,
  saveMeeting,
  selectTeamMeetingRequest,
  setAccountNotificationSubscriptions,
  updateAccountFromInvite,
  updateAccountPreferences,
  upsertAppToken,
  upsertGateCondition,
  workMeetingTypeGates,
}
