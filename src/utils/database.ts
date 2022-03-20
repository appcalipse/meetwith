import { filter } from '@chakra-ui/react'
import * as Sentry from '@sentry/node'
import { createClient } from '@supabase/supabase-js'
import { addMinutes, isAfter } from 'date-fns'
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
} from '../types/Account'
import {
  AccountNotifications,
  NotificationChannel,
} from '../types/AccountNotifications'
import {
  ConnectedCalendar,
  ConnectedCalendarCorePayload,
  ConnectedCalendarProvider,
} from '../types/CalendarConnections'
import {
  DBSlot,
  DBSlotEnhanced,
  MeetingCreationRequest,
  ParticipantType,
} from '../types/Meeting'
import { Plan, Subscription } from '../types/Subscription'
import {
  AccountNotFoundError,
  MeetingCreationError,
  MeetingNotFoundError,
  TimeNotAvailableError,
} from '../utils/errors'
import {
  generateDefaultAvailabilities,
  generateDefaultMeetingType,
} from './calendar_manager'
import { encryptContent } from './cryptography'
import { addContentToIPFS, fetchContentFromIPFS } from './ipfs_helper'
import { notifyForNewMeeting } from './notification_helper'
import { isProAccount } from './subscription_manager'
import { isValidEVMAddress } from './validations'

const db: any = { ready: false }

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
        account_pub_key: newIdentity.publicKey,
        meeting_info_file_path: newEncryptedPath,
      })
      .match({ id: slot.id })

    if (error) {
      Sentry.captureException(error)
    }
  }

  return account
}

const updateAccountPreferences = async (account: Account): Promise<Account> => {
  const path = await addContentToIPFS(account.preferences!)
  //TODO handle ipfs error

  const { data, error } = await db.supabase
    .from('accounts')
    .update({
      preferences_path: path,
    })
    .match({ id: account.id })

  if (error) {
    // Try-catch to handle browser error
    try {
      Sentry.captureException(error)
    } catch {}
    //TODO: handle error
  }

  return { ...data[0], preferences: account.preferences } as Account
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
    // try-catch to handle browser error
    try {
      Sentry.captureException(error)
    } catch {}
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
    .eq('account_pub_key', account.internal_pub_key)
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
    .eq('account_pub_key', account.internal_pub_key)
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

  if (minTime && minTime.length > 0) {
    if (
      !minTime[0].minAdvanceTime ||
      isAfter(addMinutes(new Date(), minTime[0].minAdvanceTime), start)
    ) {
      return false
    }
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
  meeting: MeetingCreationRequest,
  requesterAddress?: string
): Promise<DBSlotEnhanced> => {
  if (
    new Set(meeting.participants_mapping.map(p => p.account_address)).size !==
    meeting.participants_mapping.length
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
  const ownerAccount =
    meeting.participants_mapping.find(p => p.type === ParticipantType.Owner) ||
    null
  const schedulerAccount =
    meeting.participants_mapping.find(
      p => p.type === ParticipantType.Scheduler
    ) || null
  for (const participant of meeting.participants_mapping) {
    if (participant.account_address) {
      if (
        existingAccounts
          .map(account => account.address)
          .includes(participant.account_address!) &&
        participant.type === ParticipantType.Owner
      ) {
        // only validate slot if meeting is being scheduled ons omeones calendar and not by itself
        if (
          ownerAccount &&
          ownerAccount.account_address === participant.account_address &&
          ownerAccount.account_address !== schedulerAccount?.account_address &&
          (await !isSlotFree(
            participant.account_address!,
            new Date(meeting.start),
            new Date(meeting.end),
            meeting.meetingTypeId
          ))
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
      } else {
        account = await initAccountDBForWallet(
          participant.account_address!,
          '',
          'UTC',
          0,
          true
        )
      }

      const path = await addContentToIPFS(participant.privateInfo)

      const dbSlot: DBSlot = {
        id: participant.slot_id,
        start: meeting.start,
        end: meeting.end,
        account_pub_key: account.internal_pub_key,
        meeting_info_file_path: path,
      }

      slots.push(dbSlot)

      if (participant.account_address === requesterAddress) {
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

  await notifyForNewMeeting(meeting)

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
  syncOnly?: boolean
): Promise<ConnectedCalendar[]> => {
  const query = db.supabase
    .from('connected_calendars')
    .select()
    .eq('account_address', address.toLowerCase())

  if (syncOnly) {
    query.eq('sync', true)
  }

  const { data, error } = await query

  if (error) {
    Sentry.captureException(error)
  }

  if (data) {
    return data as ConnectedCalendar[]
  }

  return []
}

const connectedCalendarExists = async (
  address: string,
  email: string,
  provider: ConnectedCalendarProvider
): Promise<boolean> => {
  const { data, count, error } = await db.supabase
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
  provider: ConnectedCalendarProvider,
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
  provider: ConnectedCalendarProvider
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
    try {
      Sentry.captureException(error)
    } catch {}
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
      })
      .eq('domain', subscription.domain)
      .eq('owner_account', subscription.owner_account)

    if (error && error.length > 0) {
      console.log(error)
      Sentry.captureException(error)
    }

    if (!data || data.length == 0) {
      const { data, error } = await db.supabase
        .from('subscriptions')
        .insert(subscription)

      if (error) {
        Sentry.captureException(error)
      }
    }
  }

  return subscriptions
}

export {
  addOrUpdateConnectedCalendar,
  changeConnectedCalendarSync,
  connectedCalendarExists,
  getAccountFromDB,
  getAccountNonce,
  getAccountNotificationSubscriptions,
  getConnectedCalendars,
  getExistingAccountsFromDB,
  getMeetingFromDB,
  getSlotsForAccount,
  getSlotsForDashboard,
  initAccountDBForWallet,
  initDB,
  isSlotFree,
  removeConnectedCalendar,
  saveEmailToDB,
  saveMeeting,
  setAccountNotificationSubscriptions,
  updateAccountFromInvite,
  updateAccountPreferences,
}
