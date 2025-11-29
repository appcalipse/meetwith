import { Interval } from 'date-fns'
import { Encrypted } from 'eth-crypto'

import { ConditionRelation } from '@/types/common'
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
}
export interface DBSlot extends Interval {
  id?: string
  created_at?: Date
  version: number
  meeting_info_encrypted: Encrypted
  recurrence: MeetingRepeat
  public_decrypted_data?: MeetingDecrypted
  role?: ParticipantType
  guest_email?: string | null
  account_address?: string | null
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
}

export interface MeetingDecrypted extends MeetingInfo {
  id: string
  start: Date
  end: Date
  version: DBSlot['version']
  meeting_info_encrypted: Encrypted
  user_type?: 'account' | 'guest'
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
