import { Encrypted } from 'eth-crypto'

import { Account } from './Account'
import { MemberType } from './Group'
import {
  ConferenceMeeting,
  GroupNotificationType,
  MeetingDecrypted,
  MeetingProvider,
  NotBefore,
  ParticipantMappingType,
  SchedulingType,
} from './Meeting'
import {
  ParticipantBaseInfo,
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from './ParticipantInfo'

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
  meetingProvider: MeetingProvider
  content?: string
  title?: string
  meeting_url: string
  meeting_id: ConferenceMeeting['id']
  emailToSendReminders?: string
}
export interface UrlCreationRequest {
  participants_mapping: (ParticipantInfo | RequestParticipantMapping)[]
  start: Date
  end: Date
  meetingProvider: MeetingProvider
  accounts?: Account[]
  content?: string
  title?: string
  meeting_id: ConferenceMeeting['id']
}
export interface RequestParticipantMapping {
  account_address?: string
  slot_id?: string
  meeting_id: ConferenceMeeting['id']
  type: ParticipantType
  privateInfo: Encrypted
  privateInfoHash: string
  timeZone: string
  name: string
  status: ParticipationStatus
  guest_email?: string
  mappingType?: ParticipantMappingType
}

export interface MeetingCancelRequest {
  meeting: MeetingDecrypted
  currentTimezone: string
}

export interface MeetingSyncRequest {
  participantActing: ParticipantBaseInfo
  meeting_id: string
  start: Date
  end: Date
  created_at: Date
  timezone: string
}

export interface MeetingChange {
  dateChange?: { oldStart: Date; oldEnd: Date }
}
export interface MeetingCreationSyncRequest extends MeetingSyncRequest {
  meeting_url: string
  participants: RequestParticipantMapping[]
  changes?: MeetingChange
  title?: string
  content?: string
  meetingProvider: MeetingProvider
}
export interface GroupInviteNotifyRequest {
  group_id: string
  accountsToNotify: string[]
  notifyType: GroupNotificationType
}
export interface MeetingCancelSyncRequest extends MeetingSyncRequest {
  addressesToRemove: string[]
  guestsToRemove: ParticipantInfo[]
}

export interface DiscordAccountInfoRequest {
  scheduler_discord_id: string
  participantsDiscordIds: string[]
}

export interface DiscordAccountInfoResponse {
  accounts: Account[]
  discordParticipantIds: string[]
  discordParticipantsWithoutAccountIds: string[]
}

export interface DiscordMeetingRequest {
  schedulerDiscordId: string
  accounts: Account[]
  duration: number
  interval: number
  title: string
  description: string
  notBefore?: NotBefore
}

export interface ChangeGroupAdminRequest {
  address?: string
  userId?: string
  invitePending: boolean
  role: MemberType
}
