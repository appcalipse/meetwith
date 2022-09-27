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
  version: number
}

export interface MeetingCreationRequest {
  type: SchedulingType
  participants_mapping: CreationRequestParticipantMapping[]
  meetingTypeId: string
  start: Date
  end: Date
  content?: string
  meeting_url: string
}

export enum ParticipantMappingType {
  ADD = 'add',
  REMOVE = 'remove',
  KEEP = 'keep',
}

export interface CreationRequestParticipantMapping {
  account_address?: string
  slot_id: string
  type: ParticipantType
  privateInfo: Encrypted
  privateInfoHash: string
  timeZone: string
  name: string
  status: ParticipationStatus
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
  slot_id: string
  name?: string
  guest_email?: string
}

export interface IPFSMeetingInfo {
  created_at: Date
  content?: string
  meeting_url: string
  participants: ParticipantInfo[]
  change_history_paths: string[]
  related_slot_ids: string[]
}

export interface MeetingDecrypted {
  id: string
  created_at: Date
  start: Date
  end: Date
  participants: ParticipantInfo[]
  meeting_url: string
  meeting_info_file_path: string
  content?: string
  related_slot_ids: string[]
  version: DBSlot['version']
  title?: string
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
