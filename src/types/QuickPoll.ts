import { Auth } from 'googleapis'
import { DateTime } from 'luxon'
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
  availability_block_ids?: string[]
  availability_block_titles?: string[]
  has_block_based_availability?: boolean
}

export interface QuickPollJoinContext {
  pollId: string
  pollSlug: string
  pollTitle: string
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

export interface QuickPollListItem extends Omit<QuickPoll, 'participants'> {
  quick_poll_participants: QuickPollParticipant[]
  participant_count: number
  host_name?: string
  host_address?: string
  user_participant_type?: QuickPollParticipantType
  user_status?: string
  user_availability_block_ids?: string[]
  user_availability_block_titles?: string[]
  user_available_slots?: QuickPollParticipant['available_slots']
  user_timezone?: string
}

export interface QuickPollParticipantWithAccount extends QuickPollParticipant {
  account_name?: string
  account_avatar?: string
}

// Poll-specific availability: either selected block IDs or custom schedule
export interface PollCustomAvailability {
  timezone: string
  weekly_availability: Array<{
    weekday: number
    ranges: Array<{ start: string; end: string }>
  }>
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
  /** When set, owner's availability is derived from these blocks (merged). Ignored if custom_availability is set. */
  availability_block_ids?: string[]
  /** When set, owner's availability uses this config instead of blocks. */
  custom_availability?: PollCustomAvailability
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
  availability_block_ids?: string[]
  custom_availability?: PollCustomAvailability
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

export interface UpdateQuickPollParticipantAvailabilityOptions {
  availability_block_ids?: string[] | null
}

export interface UpdateParticipantAvailabilityRequest {
  available_slots: AvailabilitySlot[]
  timezone?: string
  availability_block_ids?: string[] | null
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
  polls: QuickPollListItem[]
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

export type PollDateRange = {
  pollStart: DateTime
  pollEnd: DateTime
}

export type MonthOption = { value: string; label: string }
