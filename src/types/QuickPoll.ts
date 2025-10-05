import { MeetingPermissions } from '@/utils/constants/schedule'

// Enums
export enum PollStatus {
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PollVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export enum QuickPollParticipantStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
}

export enum QuickPollParticipantType {
  SCHEDULER = 'scheduler',
  INVITEE = 'invitee',
  OWNER = 'owner',
}

// Base interfaces
export interface QuickPoll {
  id: string
  created_at: string
  updated_at?: string
  title: string
  description: string
  duration_minutes: number
  starts_at: string
  ends_at: string
  expires_at: string
  status: PollStatus
  visibility: PollVisibility
  permissions: MeetingPermissions[]
  slug: string
  meeting_url?: string
}

export interface QuickPollParticipant {
  id: string
  created_at: string
  updated_at?: string
  poll_id: string
  account_address?: string
  guest_name?: string
  guest_email: string
  status: QuickPollParticipantStatus
  available_slots: Array<{
    weekday: number
    ranges: Array<{ start: string; end: string }>
  }>
  timezone?: string
  participant_type: QuickPollParticipantType
}

export interface QuickPollCalendar {
  id: number
  created_at: string
  updated_at?: string
  participant_id: string
  email: string
  provider: string
  payload?: Record<string, unknown>
}

// Extended interfaces for API responses
export interface QuickPollWithParticipants extends QuickPoll {
  participants: QuickPollParticipant[]
  participant_count: number
  host_name?: string
  host_address?: string
}

export interface QuickPollParticipantWithAccount extends QuickPollParticipant {
  account_name?: string
  account_avatar?: string
}

// Request interfaces
export interface CreateQuickPollRequest {
  title: string
  description: string
  duration_minutes: number
  starts_at: string
  ends_at: string
  expires_at: string
  permissions: MeetingPermissions[]
  participants: {
    account_address?: string
    name?: string
    guest_email?: string
    participant_type: QuickPollParticipantType
    timezone?: string
  }[]
}

export interface UpdateQuickPollRequest {
  status?: PollStatus
  title?: string
  description?: string
  duration_minutes?: number
  starts_at?: string
  ends_at?: string
  expires_at?: string
  permissions?: MeetingPermissions[]
  participants?: {
    toAdd?: AddParticipantData[]
    toRemove?: string[]
  }
}

export interface AddParticipantRequest {
  poll_id: string
  account_address?: string
  guest_name?: string
  guest_email: string
  participant_type: QuickPollParticipantType
}

export interface AddParticipantData {
  account_address?: string
  guest_name?: string
  guest_email: string
  participant_type: QuickPollParticipantType
}

export interface UpdateParticipantAvailabilityRequest {
  available_slots: AvailabilitySlot[]
  timezone?: string
}

export interface SaveParticipantCalendarRequest {
  email: string
  provider: string
  payload: Record<string, unknown>
}

export interface UpdateGuestDetailsRequest {
  guest_name: string
  guest_email: string
}

export interface OAuthCallbackQuery {
  code?: string | string[]
  error?: string | string[]
  state?: string | string[]
}

export interface OAuthConnectQuery {
  state?: string | string[]
}

// Response interfaces
export interface QuickPollListResponse {
  polls: QuickPollWithParticipants[]
  total_count: number
  has_more: boolean
}

export interface QuickPollResponse {
  poll: QuickPollWithParticipants
  is_participant: boolean
  can_edit: boolean
}

export interface CancelQuickPollResponse {
  success: boolean
  poll: QuickPoll
}

export interface CreatePollProps {
  isEditMode?: boolean
  pollSlug?: string
}

export interface QuickPollBySlugResponse {
  poll: QuickPollWithParticipants
  is_participant: boolean
  can_edit: boolean
}

export interface AvailabilitySlot {
  weekday: number
  ranges: Array<{ start: string; end: string }>
}

export interface QuickPollBusyParticipant {
  account_address?: string
  participant_id?: string
}
