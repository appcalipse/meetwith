import {
  PaymentChannel,
  PaymentType,
  PlanType,
  SessionType,
  TokenType,
} from '@utils/constants/meeting-types'
import { Encrypted } from 'eth-crypto'

import { AcceptedToken, SupportedChain } from '@/types/chains'
import { Address } from '@/types/Transactions'
import { MeetingPermissions } from '@/utils/constants/schedule'

import { Account, TimeRange } from './Account'
import { AttendeeStatus } from './Calendar'
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
  eventId?: string | null
  calendar_id?: string | null
}
export interface MeetingInstanceUpdateRequest extends MeetingUpdateRequest {}

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
  txHash?: Address | null
  encrypted_metadata?: Encrypted
  rrule: Array<string>
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
  meeting_type_id?: string
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
  eventId?: string | null
  notification_hash?: string
  rrule?: Array<string>
  skipCalendarSync?: boolean
  skipNotify?: boolean
}
export interface MeetingInstanceCreationSyncRequest
  extends Omit<MeetingCreationSyncRequest, 'meetingRepeat'> {
  original_start_time: Date
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
  eventId?: string | null
  original_start_time?: Date
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

export interface CreateAvailabilityBlockRequest {
  title: string
  timezone: string
  weekly_availability: Array<{ weekday: number; ranges: TimeRange[] }>
  is_default?: boolean
}

export interface UpdateAvailabilityBlockRequest
  extends CreateAvailabilityBlockRequest {
  id: string
}

export interface DuplicateAvailabilityBlockRequest {
  id: string
  modifiedData: {
    title: string
    timezone: string
    weekly_availability: Array<{ weekday: number; ranges: TimeRange[] }>
    is_default: boolean
  }
}

export interface UpdateAvailabilityBlockMeetingTypesRequest {
  availability_block_id: string
  meeting_type_ids: string[]
}

export interface CreateMeetingTypeRequest {
  title: string
  description?: string
  type: SessionType
  duration_minutes: number
  min_notice_minutes: number
  scheduleGate?: string
  custom_link?: string
  fixed_link?: boolean
  slug: string
  availability_ids?: string[]
  calendars?: number[]
  meeting_platforms?: MeetingProvider[]
  plan?: {
    type?: PlanType
    price_per_slot?: number
    no_of_slot?: number
    payment_channel?: PaymentChannel
    payment_address?: string
    crypto_network?: number
    default_token?: AcceptedToken
    payment_methods?: PaymentType[]
  }
}

export interface UpdateMeetingTypeRequest extends CreateMeetingTypeRequest {
  id: string
}

export interface DeleteMeetingTypeRequest {
  typeId: string
}

export interface ConfirmCryptoTransactionRequest {
  transaction_hash: Address
  amount: number
  meeting_type_id: string | null
  token_address: string
  token_type: TokenType
  chain: SupportedChain
  fiat_equivalent: number
  receiver_address?: string
  guest_address?: string
  guest_email?: string
  guest_name?: string
  payment_method: PaymentType
  provider_reference_id?: string
  total_fee?: number
  metadata?: Record<string, unknown>
  fee_breakdown?: {
    [key: string]: number
  }
}

export interface RequestInvoiceRequest {
  guest_email: string
  guest_name: string
  meeting_type_id: string
  payment_method: PaymentType
  url: string
}

export interface MeetingCheckoutRequest {
  meeting_type_id: string
  // message_channel: string
  guest_email?: string
  guest_name: string
  guest_address?: string
  amount: number
  redirectUrl: string
}

export interface WebcalRequestBody {
  url?: string
  email?: string
}

export interface UpdateCalendarEventRequest {
  rsvp_status: AttendeeStatus
  attendee_email: string
}
export interface ParseParticipantInfo {
  account_address?: string
  guest_email?: string
  slot_id: string
}

export interface ParseParticipantsRequest {
  participants: ParseParticipantInfo[]
}
