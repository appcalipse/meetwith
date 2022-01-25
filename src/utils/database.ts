import * as Sentry from '@sentry/node'
import { createClient } from '@supabase/supabase-js'
import { addMinutes, isAfter } from 'date-fns'
import EthCrypto, { Encrypted } from 'eth-crypto'
import { validate } from 'uuid'

import {
  Account,
  AccountPreferences,
  EnhancedAccount,
  SimpleAccountInfo,
} from '../types/Account'
import { AccountNotifications } from '../types/AccountNotifications'
import {
  DBSlot,
  DBSlotEnhanced,
  MeetingCreationRequest,
} from '../types/Meeting'
import {
  AccountNotFoundError,
  MeetingNotFoundError,
  MeetingWithYourselfError,
  TimeNotAvailableError,
} from '../utils/errors'
import {
  generateDefaultAvailabilities,
  generateDefaultMeetingType,
} from './calendar_manager'
import { encryptContent } from './cryptography'
import { addContentToIPFS, fetchContentFromIPFS } from './ipfs_helper'
import { notifyForNewMeeting } from './notification_helper'

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
  from_invite?: boolean
): Promise<EnhancedAccount> => {
  const newIdentity = EthCrypto.createIdentity()

  const encryptedPvtKey = encryptContent(signature, newIdentity.privateKey)

  const { data, error } = await db.supabase.from('accounts').insert([
    {
      address: address.toLowerCase(),
      internal_pub_key: newIdentity.publicKey,
      encoded_signature: encryptedPvtKey,
      preferences_path: '',
      nonce,
      from_invite,
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

  const account = responsePrefs.data[0] as EnhancedAccount
  account.preferences = preferences
  account.new_account = true
  account.is_invited = from_invite || false

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
    Sentry.captureException(error)
    //TODO: handle error
  }

  return { ...data[0], preferences: account.preferences } as Account
}

const getAccountNonce = async (identifier: string): Promise<number> => {
  const query = validate(identifier)
    ? `id.eq.${identifier}`
    : `address.ilike.${identifier.toLowerCase()},special_domain.ilike.${identifier},internal_pub_key.eq.${identifier}`

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
    // //TODO: handle error
  }

  return data
}

const getAccountFromDB = async (identifier: string): Promise<Account> => {
  const query = validate(identifier)
    ? `id.eq.${identifier}`
    : `address.ilike.${identifier.toLowerCase()},special_domain.ilike.${identifier},internal_pub_key.eq.${identifier}`

  const { data, error } = await db.supabase
    .from('accounts')
    .select()
    .or(query)
    .order('created_at')

  if (!error && data.length > 0) {
    const account = data[0] as Account
    account.preferences = (await fetchContentFromIPFS(
      account.preferences_path
    )) as AccountPreferences
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
    mt => mt.id === meetingTypeId
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
  requesterAddress: string
): Promise<DBSlotEnhanced> => {
  if (
    new Set(meeting.participants_mapping.map(p => p.account_address)).size !==
    meeting.participants_mapping.length
  ) {
    //means there are duplicate participants
    throw new MeetingWithYourselfError()
  }

  const slots = []
  let meetingResponse = {} as DBSlotEnhanced
  let index = 0
  let i = 0

  for (const participant of meeting.participants_mapping) {
    if (
      await !isSlotFree(
        participant.account_address,
        new Date(meeting.start),
        new Date(meeting.end),
        meeting.meetingTypeId
      )
    ) {
      throw new TimeNotAvailableError()
    }

    //TODO validate availabilities

    const account = await getAccountFromDB(participant.account_address)

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
  const { data, error } = await db.supabase.from('emails').upsert([
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

export {
  getAccountFromDB,
  getAccountNonce,
  getAccountNotificationSubscriptions,
  getExistingAccountsFromDB,
  getMeetingFromDB,
  getSlotsForAccount,
  getSlotsForDashboard,
  initAccountDBForWallet,
  initDB,
  isSlotFree,
  saveEmailToDB,
  saveMeeting,
  setAccountNotificationSubscriptions,
  updateAccountPreferences,
}
