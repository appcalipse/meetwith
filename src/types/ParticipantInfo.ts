import { ConferenceMeeting } from './Meeting'

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
export interface ParticipantBaseInfo {
  account_address?: string
  name?: string
  guest_email?: string
}

export interface ParticipantInfo extends ParticipantBaseInfo {
  status: ParticipationStatus
  meeting_id: ConferenceMeeting['id']
  slot_id?: string
  type: ParticipantType
}

export interface InvitedUser extends ParticipantBaseInfo {
  account_address: string
  groupId: string
  role: 'admin' | 'member'
  invitePending: boolean
  email?: string
  userId?: string
}
