import { Auth } from 'googleapis'
import { MeetingPermissions } from '@/utils/constants/schedule'
import { CaldavCredentials } from '@/utils/services/caldav.service'
import { O365AuthCredentials } from '@/utils/services/office365.credential'
import { CalendarSyncInfo } from './CalendarConnections'

// Enums
export enum PollStatus {
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum PollVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export enum QuickPollParticipantStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  DELETED = 'deleted',
}

export enum QuickPollParticipantType {
  SCHEDULER = 'scheduler',
  INVITEE = 'invitee',
  OWNER = 'owner',
}

export enum QuickPollIntent {
  SCHEDULE = 'schedule',
  EDIT_AVAILABILITY = 'edit_availability',
}

export interface AvailabilitySlot {
  weekday: number
  ranges: Array<{ start: string; end: string }>
  date?: string
  overrides?: {
    additions?: Array<{ start: string; end: string }>
    removals?: Array<{ start: string; end: string }>
  }
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
  expires_at: string | null
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
  account_name?: string
  guest_email: string
  status: QuickPollParticipantStatus
  available_slots: AvailabilitySlot[]
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
  payload?: string | Auth.Credentials | O365AuthCredentials | CaldavCredentials
  calendars: CalendarSyncInfo[]
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
  description?: string
  duration_minutes: number
  starts_at: string
  ends_at: string
  expires_at: string | null
  permissions: MeetingPermissions[]
  participants?: {
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
  expires_at?: string | null
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
  status?: QuickPollParticipantStatus
}

export type QuickPollBulkAddParticipants = AddParticipantData[]

export interface QuickPollParticipantUpdateFields {
  status: QuickPollParticipantStatus
  guest_name?: string
  participant_type?: QuickPollParticipantType
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

export interface AddOrUpdateGuestParticipantRequest {
  guest_email: string
  guest_name?: string
  available_slots: AvailabilitySlot[]
  timezone: string
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
  isPro?: boolean
  canSchedule?: boolean
  upgradeRequired?: boolean
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

export interface QuickPollBusyParticipant {
  account_address?: string
  participant_id?: string
}

export interface GuestPollDetails {
  participantId: string
  email: string
  name: string
}

export interface QuickPollSignInContext {
  pollSlug: string
  pollId: string
  pollTitle: string
  returnUrl: string
  timestamp: number
}
