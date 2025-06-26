import { Encrypted } from 'eth-crypto'

import { MeetingPermissions } from '@/utils/constants/schedule'

import { Account } from './Account'
import { MeetingReminders } from './common'
import { MemberType } from './Group'
import {
  ConferenceMeeting,
  GroupNotificationType,
  MeetingDecrypted,
  MeetingProvider,
  MeetingRepeat,
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
  meetingReminders?: Array<MeetingReminders>
  meetingRepeat: MeetingRepeat
  allSlotIds?: Array<string>
  meetingPermissions?: Array<MeetingPermissions>
  ignoreOwnerAvailability?: boolean
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
  meetingReminders?: Array<MeetingReminders>
  meetingRepeat?: MeetingRepeat
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
export interface GuestMeetingCancelRequest extends MeetingCancelRequest {
  guest_email: string
  reason: string
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
  meetingReminders?: Array<MeetingReminders>
  meetingRepeat?: MeetingRepeat
  meetingPermissions?: Array<MeetingPermissions>
}
export interface GroupInviteNotifyRequest {
  group_id: string
  accountsToNotify: string[]
  notifyType: GroupNotificationType
}
export interface MeetingCancelSyncRequest extends MeetingSyncRequest {
  addressesToRemove: string[]
  guestsToRemove: ParticipantInfo[]
  reason?: string
  title?: string
}

export interface DiscordAccountInfoRequest {
  scheduler_discord_id: string
  participantsDiscordIds: string[]
}
export interface SetTelegramNotificationOptionRequest {
  chat_id: string
  tg_id: string
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
  provider: MeetingProvider
  reminder?: MeetingReminders
}

export interface ChangeGroupAdminRequest {
  address?: string
  userId?: string
  invitePending: boolean
  role: MemberType
}

export interface CouponSubscriptionRequest {
  coupon: string
  domain?: string
}

export interface SubscriptionUpdateRequest {
  domain: string
}
