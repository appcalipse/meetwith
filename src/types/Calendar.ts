import {
  WebDAVAttendeeExtensions,
  WebDAVEventExtensions,
} from '@/utils/services/caldav.mapper'
import {
  GoogleAttendeeExtensions,
  GoogleEventExtensions,
} from '@/utils/services/google.mapper'

import { DBSlot, MeetingRepeat, TimeSlotSource } from './Meeting'
import {
  Attendee as Office365Attendee,
  EventImportance,
  EventSensitivity,
  FreeBusyStatus,
  Location,
  OnlineMeetingInfo,
  OnlineMeetingProviderType,
  RecurrencePattern,
  RecurrenceRange,
} from './Office365'
export type Optional<T> = T | undefined | null
export type Nullable<T> = {
  [K in keyof T]: T[K] | null | undefined
}

export interface UnifiedEvent {
  id: string
  title: string
  description: Optional<string>
  startDate: Date
  endDate: Date
  isAllDay: boolean

  source: TimeSlotSource
  sourceEventId: string
  calendarId: string
  accountEmail: string

  location?: Optional<string>
  webLink?: Optional<string>
  attendees?: UnifiedAttendee[]
  recurrence?: UnifiedRecurrence | null
  status?: EventStatus

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
  frequency: MeetingRepeat
  interval: number

  endDate: Optional<Date>
  occurrenceCount: Optional<number>

  daysOfWeek?: DayOfWeek[]
  dayOfMonth?: number
  weekOfMonth?: number

  excludeDates?: Date[]

  providerRecurrence?: {
    google?: {
      rrule?: string[]
    }
    office365?: {
      pattern?: RecurrencePattern
      range?: RecurrenceRange
    }
    webdav?: {
      rrule?: string
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
  mwwEvents: Array<DBSlot>
  calendarEvents: Array<UnifiedEvent>
}
