import { DateTime, Interval } from 'luxon'
import { Frequency } from 'rrule'
import { MeetingPermissions } from '@/utils/constants/schedule'
import {
  WebDAVAttendeeExtensions,
  WebDAVEventExtensions,
} from '@/utils/services/caldav.mapper'
import {
  GoogleAttendeeExtensions,
  GoogleEventExtensions,
} from '@/utils/services/google.mapper'
import {
  ExtendedDBSlot,
  ExtendedSlotInstance,
  ExtendedSlotSeries,
  MeetingDecrypted,
  TimeSlotSource,
} from './Meeting'
import {
  EventImportance,
  EventSensitivity,
  FreeBusyStatus,
  Location,
  Attendee as Office365Attendee,
  OnlineMeetingInfo,
  OnlineMeetingProviderType,
  RecurrencePattern,
  RecurrenceRange,
} from './Office365'
import { ParticipationStatus } from './ParticipantInfo'
export type Optional<T> = T | undefined | null
export type Nullable<T> = {
  [K in keyof T]: T[K] | null | undefined
}

export interface UnifiedEvent<T = Date> {
  id: string
  title: string
  description: Optional<string>
  start: T
  end: T
  isAllDay: boolean

  source: TimeSlotSource
  sourceEventId: string
  calendarId: string
  calendarName: string
  accountEmail: string

  meeting_url?: Optional<string>
  webLink?: Optional<string>
  attendees?: UnifiedAttendee[]
  recurrence?: UnifiedRecurrence | null
  status?: EventStatus

  permissions: MeetingPermissions[]

  providerData?: {
    google?: Nullable<GoogleEventExtensions>
    office365?: Office365EventExtensions
    webdav?: WebDAVEventExtensions
  }

  lastModified: Date
  etag?: Optional<string>
}

export interface UnifiedAttendee {
  email: string
  name: Optional<string>
  status: AttendeeStatus
  isOrganizer?: boolean
  providerData: {
    google?: Nullable<GoogleAttendeeExtensions>
    office365?: Office365Attendee
    webdav?: Nullable<WebDAVAttendeeExtensions>
  }
}

export interface Office365EventExtensions {
  importance?: EventImportance
  sensitivity?: EventSensitivity
  showAs?: FreeBusyStatus
  isOnlineMeeting?: boolean
  onlineMeetingProvider?: OnlineMeetingProviderType
  onlineMeetingUrl?: string
  iCalUId?: string
  categories?: string[]
  reminderMinutesBeforeStart?: number
  isReminderOn?: boolean
  allowNewTimeProposals?: boolean
  responseRequested?: boolean
  hideAttendees?: boolean
  locations?: Location[]
  onlineMeeting?: OnlineMeetingInfo
}

export interface UnifiedRecurrence {
  frequency: Frequency
  interval: number

  endDate: Optional<Date>
  occurrenceCount: Optional<number>

  daysOfWeek?: DayOfWeek[]
  dayOfMonth?: number
  weekOfMonth?: number

  excludeDates?: Date[]

  providerRecurrence?: {
    google?: {
      rrule: string[]
    }
    office365?: {
      pattern: RecurrencePattern
      range: RecurrenceRange
    }
    webdav?: {
      rrule: string
    }
  }
}

export enum DayOfWeek {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}

export enum AttendeeStatus {
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  TENTATIVE = 'tentative',
  NEEDS_ACTION = 'needsAction',
  DELEGATED = 'delegated',
  COMPLETED = 'completed',
}
export enum EventStatus {
  CANCELLED = 'cancelled',
  CONFIRMED = 'confirmed',
  TENTATIVE = 'tentative',
  DECLINED = 'declined',
}

export interface CalendarEvents {
  mwwEvents: Array<ExtendedDBSlot | ExtendedSlotInstance | ExtendedSlotSeries>
  calendarEvents: Array<UnifiedEvent>
}
export type DashBoardMwwEvents = (ExtendedDBSlot | ExtendedSlotInstance) & {
  decrypted: MeetingDecrypted
}

export interface ExtendedCalendarEvents {
  mwwEvents: Array<DashBoardMwwEvents>
  calendarEvents: Array<UnifiedEvent>
}
export type WithInterval<T> = T & {
  interval: Interval
}

export const isCalendarEvent = <T extends object = DateTime>(
  slot: WithInterval<UnifiedEvent<T> | MeetingDecrypted<T>>
): slot is WithInterval<UnifiedEvent<T>> => {
  return 'calendarId' in slot
}
export const isCalendarEventWithoutDateTime = (
  slot: WithInterval<UnifiedEvent | MeetingDecrypted>
): slot is WithInterval<UnifiedEvent> => {
  return 'calendarId' in slot
}

const DECLINED_STATUSES = [
  ParticipationStatus.Rejected,
  AttendeeStatus.DECLINED,
] as const

const PENDING_ACTION_STATUSES = [
  ParticipationStatus.Pending,
  AttendeeStatus.TENTATIVE,
  AttendeeStatus.NEEDS_ACTION,
  AttendeeStatus.DELEGATED,
] as const

const ACCEPTED_STATUSES = [
  ParticipationStatus.Accepted,
  AttendeeStatus.ACCEPTED,
  AttendeeStatus.COMPLETED,
] as const

type AttendeeStatusType =
  | ParticipationStatus
  | AttendeeStatus
  | null
  | undefined

const includesStatus = (
  statuses: readonly (ParticipationStatus | AttendeeStatus)[],
  status: AttendeeStatusType
): boolean => {
  return status != null && status != undefined && statuses.includes(status)
}

export const isDeclined = (status: AttendeeStatusType): boolean => {
  return includesStatus(DECLINED_STATUSES, status)
}

export const isPendingAction = (status: AttendeeStatusType): boolean => {
  return includesStatus(PENDING_ACTION_STATUSES, status)
}

export const isAccepted = (status: AttendeeStatusType): boolean => {
  return includesStatus(ACCEPTED_STATUSES, status)
}

export const mapParticipationStatusToAttendeeStatus = (
  status: ParticipationStatus
): AttendeeStatus => {
  switch (status) {
    case ParticipationStatus.Accepted:
      return AttendeeStatus.ACCEPTED
    case ParticipationStatus.Rejected:
      return AttendeeStatus.DECLINED
    case ParticipationStatus.Pending:
    default:
      return AttendeeStatus.NEEDS_ACTION
  }
}
export const mapAttendeeStatusToParticipationStatus = (
  status: AttendeeStatus
): ParticipationStatus => {
  switch (status) {
    case AttendeeStatus.ACCEPTED:
    case AttendeeStatus.COMPLETED:
      return ParticipationStatus.Accepted
    case AttendeeStatus.DECLINED:
      return ParticipationStatus.Rejected
    case AttendeeStatus.TENTATIVE:
    case AttendeeStatus.NEEDS_ACTION:
    case AttendeeStatus.DELEGATED:
    default:
      return ParticipationStatus.Pending
  }
}
