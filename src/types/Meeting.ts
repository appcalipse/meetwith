import { Interval } from 'date-fns'
import { Encrypted } from 'eth-crypto'

import { ConditionRelation, RecurringStatus } from '@/types/common'
import { MeetingPermissions } from '@/utils/constants/schedule'

import { MeetingReminders } from './common'
import { ParticipantInfo, ParticipantType } from './ParticipantInfo'

export enum SchedulingType {
  REGULAR,
  GUEST,
  DISCORD,
}

export enum ParticipantMappingType {
  ADD = 'add',
  REMOVE = 'remove',
  KEEP = 'keep',
}

export enum TimeSlotSource {
  MWW = 'mww',
  GOOGLE = 'Google',
  ICLOUD = 'iCloud',
  OFFICE = 'Office 365',
  WEBDAV = 'Webdav',
  WEBCAL = 'Webcal', // read-only streams
}
export interface ExistingMeetingData {
  title?: string
  content?: string
  meetingUrl?: string
  participants?: ParticipantInfo[]
  start?: Date
  end?: Date
}
export interface TimeSlot extends Interval {
  source?: string
  eventTitle?: string
  eventId?: string
  eventWebLink?: string
  eventEmail?: string
  account_address: string
}
export interface DBSlot extends Interval {
  id?: string
  account_address?: string | null
  created_at?: Date
  guest_email?: string | null
  role?: ParticipantType
  source?: string
  version: number
  meeting_info_encrypted: Encrypted
  recurrence: MeetingRepeat
  public_decrypted_data?: MeetingDecrypted
}
export interface SlotInstance extends DBSlot {
  series_id: string
  status: RecurringStatus
  slot_id: string
}
export interface SlotSeries extends Omit<DBSlot, 'start' | 'end' | 'version'> {
  rrule: string[]
  template_end: string | Date
  template_start: string | Date
  effective_end: string | Date | null
  effective_start: string | Date
  ical_uid: string
  meeting_id: string
}
export interface AccountSlot extends DBSlot {
  priority: 1
  user_type: 'account'
}
export interface GuestSlot extends DBSlot {
  priority: 2 | 3
  user_type: 'guest'
}
export interface ExtendedDBSlot extends DBSlot {
  conferenceData?: ConferenceMeeting
}
export interface ExtendedEventDBSlot extends DBSlot {
  meeting_id?: string
}
export interface ExtendedSlotInstance extends SlotInstance {
  meeting_id: string
}
export interface ExtendedSlotSeries extends SlotSeries {}
export const isSlotInstance = (
  slot: DBSlot | SlotInstance | SlotSeries
): slot is SlotInstance => {
  return (slot as SlotInstance).series_id !== undefined
}
export const isSlotSeries = (
  slot: DBSlot | SlotInstance | SlotSeries
): slot is SlotSeries => {
  return (slot as SlotSeries).rrule !== undefined
}
export const isDBSlot = (
  slot: DBSlot | SlotInstance | SlotSeries
): slot is DBSlot => {
  return (
    (slot as SlotInstance).series_id === undefined &&
    (slot as SlotSeries).rrule === undefined
  )
}

/**
 * Meetings providers list
 */
export enum MeetingProvider {
  /**
   * This meeting will be handled by huddle01
   */
  HUDDLE = 'huddle01',

  /**
   * This meeting will be handled by Google
   */
  GOOGLE_MEET = 'google-meet',

  ZOOM = 'zoom',

  JITSI_MEET = 'jitsi-meet',

  /**
   * User will provide the meeting link
   */
  CUSTOM = 'custom',
}

/**
 * Options for access meetings
 */
export enum MeetingAccessType {
  /**
   * Open for everyone with the correct link
   */
  OPEN_MEETING = 'open',

  /**
   * We will allow access only for participants that have paid the meeting,
   * meaning that the user will be required to authenticate within MWW
   */
  PAID_MEETING = 'paid-meeting',
}
export enum MeetingVersion {
  V1 = 'V1',
  V2 = 'V2',
  V3 = 'V3',
}
export interface ConferenceMeeting {
  id: string
  start: Date
  end: Date
  title?: string
  access_type: MeetingAccessType
  provider: MeetingProvider
  reminders?: Array<MeetingReminders>
  recurrence?: MeetingRepeat
  meeting_url: string
  created_at: Date
  slots: Array<string>
  version: MeetingVersion
  permissions?: Array<MeetingPermissions>
  encrypted_metadata?: Encrypted
}

export interface MeetingInfo {
  created_at: Date
  title?: string
  content?: string
  meeting_url: string
  participants: ParticipantInfo[]
  change_history_paths?: string[]
  reminders?: Array<MeetingReminders>
  related_slot_ids: string[]
  meeting_id: ConferenceMeeting['id']
  provider?: MeetingProvider
  recurrence?: MeetingRepeat
  permissions?: Array<MeetingPermissions>
  rrule: string[]
}

export interface MeetingDecrypted<T = Date> extends MeetingInfo {
  id: string
  start: T
  end: T
  version: DBSlot['version']
  meeting_info_encrypted: Encrypted
  user_type?: 'account' | 'guest'
  series_id?: string | null
}

export interface ExistingMeetingData {
  title?: string
  content?: string
  meetingUrl?: string
  participants?: ParticipantInfo[]
  start?: Date
  end?: Date
}

export enum GroupMeetingType {
  TEAM = 'team',
  CUSTOM = 'custom',
}

export interface GroupMeetingParticipantsStructure {
  relationship: ConditionRelation
  type: GroupMeetingType
  team_id?: string
  participants_accounts?: string[]
}

export interface GroupMeetingRequest {
  owner: string
  id: string
  duration_in_minutes: number
  range_start: Date
  range_end?: Date
  title?: string
  team_structure: GroupMeetingParticipantsStructure
}

export enum MeetingChangeType {
  CREATE,
  UPDATE,
  DELETE,
}
export enum GroupNotificationType {
  INVITE,
  JOIN,
  REJECT,
  LEAVE,
}

export enum NotBefore {
  OneHour = 1,
  TwoHours = 2,
  SixHours = 6,
  TwelveHours = 12,
  Tomorrow = 500,
  NextWeek = 1000,
}
export enum MeetingRepeat {
  NO_REPEAT = 'no-repeat',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export interface GuestMeetingCancel {
  metadata: string
  currentTimezone: string
  reason?: string
}

export interface MeetingCancelSyncRequest {
  decryptedMeetingData: MeetingInfo
  slotId: string
}
