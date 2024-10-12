import { Interval } from 'date-fns'
import { Encrypted } from 'eth-crypto'

import { ConditionRelation } from '@/types/common'

import { ParticipantInfo } from './ParticipantInfo'

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

export interface TimeSlot extends Interval {
  source?: string
  account_address: string
}

export interface DBSlot extends TimeSlot {
  id?: string
  created_at?: Date
  version: number
  meeting_info_encrypted: Encrypted
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

export interface ConferenceMeeting {
  id: string
  start: Date
  end: Date
  title?: string
  access_type: MeetingAccessType
  provider: MeetingProvider
  meeting_url: string
  created_at: Date
}

export interface MeetingInfo {
  created_at: Date
  title?: string
  content?: string
  meeting_url: string
  participants: ParticipantInfo[]
  change_history_paths: string[]
  related_slot_ids: string[]
  meeting_id: ConferenceMeeting['id']
}

export interface MeetingDecrypted {
  id: string
  meeting_id: ConferenceMeeting['id']
  created_at: Date
  start: Date
  end: Date
  participants: ParticipantInfo[]
  meeting_url: string
  title?: string
  content?: string
  related_slot_ids: string[]
  version: DBSlot['version']
  meeting_info_encrypted: Encrypted
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
