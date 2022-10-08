import { Interval } from 'date-fns'
import { Encrypted } from 'eth-crypto'

import { ConditionRelation } from '@/types/common'
export enum ParticipationStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Rejected = 'rejected',
}

export enum ParticipantType {
  Scheduler = 'scheduler',
  Owner = 'owner',
  Invitee = 'invitee',
}

export enum SchedulingType {
  REGULAR,
  GUEST,
}

export interface MeetingUpdateRequest extends MeetingCreationRequest {
  slotsToRemove: string[]
  guestsToRemove: ParticipantInfo[]
  version: number
}

export interface MeetingCreationRequest {
  type: SchedulingType
  participants_mapping: RequestParticipantMapping[]
  meetingTypeId: string
  start: Date
  end: Date
  content?: string
  meeting_url: string
  meeting_id: ConferenceMeeting['id']
}

export enum ParticipantMappingType {
  ADD = 'add',
  REMOVE = 'remove',
  KEEP = 'keep',
}

export interface RequestParticipantMapping {
  account_address?: string
  slot_id: string
  meeting_id: ConferenceMeeting['id']
  type: ParticipantType
  privateInfo: Encrypted
  privateInfoHash: string
  timeZone: string
  name: string
  status: ParticipationStatus
  meeting_id: string
  guest_email?: string
  mappingType?: ParticipantMappingType
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
  meeting_info_file_path: string
  version: number
}

export interface DBSlotEnhanced extends DBSlot {
  meeting_info_encrypted: Encrypted
}

export interface MeetingICS {
  db_slot: DBSlot
  meeting: MeetingCreationRequest
}

export interface ParticipantBaseInfo {
  account_address?: string
  type: ParticipantType
}

export interface ParticipantInfo extends ParticipantBaseInfo {
  status: ParticipationStatus
  meeting_id: string
  name?: string
  guest_email?: string
  meeting_id: ConferenceMeeting['id']
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

export interface IPFSMeetingInfo {
  created_at: Date
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
  meeting_info_file_path: string
  content?: string
  related_slot_ids: string[]
  version: DBSlot['version']
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
