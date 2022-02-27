import { Encrypted } from 'eth-crypto'

export enum ParticipationStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Rejected = 'rejected',
}

export enum ParticipantType {
  Scheduler = 'scheduler',
  Owner = 'owner',
  Invitee = 'invitee',
  Guest = 'guest',
}

export enum SchedulingType {
  REGULAR,
  GUEST,
}

export interface MeetingCreationRequest {
  type: SchedulingType
  participants_mapping: CreationRequestParticipantMapping[]
  meetingTypeId: string
  start: Date
  end: Date
}

export interface CreationRequestParticipantMapping {
  account_address?: string
  slot_id: string
  type: ParticipantType
  privateInfo: Encrypted
  email?: string
}

export interface TimeSlot {
  start: Date
  end: Date
}

export interface DBSlot extends TimeSlot {
  id?: string
  created_at?: Date
  account_pub_key?: string
  guest_email?: string
  meeting_info_file_path: string
}

export interface DBSlotEnhanced extends DBSlot {
  meeting_info_encrypted: Encrypted
}

export interface ParticipantBaseInfo {
  account_address?: string
  type: ParticipantType
}

export interface ParticipantInfo extends ParticipantBaseInfo {
  status: ParticipationStatus
  slot_id: string
  name?: string
  email?: string
}

export interface IPFSMeetingInfo {
  created_at: Date
  content?: string
  meeting_url: string
  participants: ParticipantInfo[]
  change_history_paths: string[]
}

export interface MeetingDecrypted {
  id: string
  created_at: Date
  start: Date
  end: Date
  participants: ParticipantInfo[]
  meeting_url: string
  content?: string
}
