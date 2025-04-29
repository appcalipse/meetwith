// Google Calendar Webhook interfaces

import { NextApiRequest } from 'next'

/**
 * Google Calendar Push Notification
 * This represents the top-level webhook payload structure
 */
export interface GoogleCalendarPushNotification {
  // The unique ID for the notification channel
  channelId: string

  // Resource ID that identifies the watched resource
  resourceId: string

  // The type of event that occurred (sync, exists, update, delete)
  messageType: 'sync' | 'exists' | 'update' | 'delete' | string

  // The type of resource being watched (can be 'event', 'calendarList', etc.)
  resourceType: string

  // The resource state (existence notification)
  resourceState: 'exists' | 'not_exists' | string

  // The actual calendar event data (may not be included in all notifications)
  // Google often doesn't include the full event in the webhook, just notification metadata
  event?: GoogleCalendarEvent
}

/**
 * Google Calendar Event
 * Represents a calendar event structure
 */
export interface GoogleCalendarEvent {
  // Basic event information
  kind: string // Type identifier (usually "calendar#event")
  etag: string // Entity tag for the resource
  id: string // Unique identifier for the event
  status: 'confirmed' | 'tentative' | 'cancelled' | string
  htmlLink: string // URL to view the event in Google Calendar
  created: string // Creation timestamp (ISO format)
  updated: string // Last modification timestamp (ISO format)

  // Event details
  summary: string // Title of the event
  description?: string // Description/notes
  location?: string // Location text
  colorId?: string // Event color identifier

  // People involved
  creator: {
    id?: string
    email: string
    displayName?: string
    self?: boolean
  }
  organizer: {
    id?: string
    email: string
    displayName?: string
    self?: boolean
  }

  // Timing information
  start: {
    date?: string // YYYY-MM-DD format for all-day events
    dateTime?: string // ISO datetime for specific-time events
    timeZone?: string // IANA time zone database name
  }
  end: {
    date?: string // YYYY-MM-DD format for all-day events
    dateTime?: string // ISO datetime for specific-time events
    timeZone?: string // IANA time zone database name
  }
  endTimeUnspecified?: boolean // Whether the end time is actually unspecified

  // Recurrence
  recurrence?: string[] // RRULE, EXRULE, RDATE and EXDATE lines for recurring events
  recurringEventId?: string // For instances of recurring events, the ID of the recurring event
  originalStartTime?: {
    // For instances of recurring events, the original start time
    date?: string
    dateTime?: string
    timeZone?: string
  }

  // Visibility/transparency
  transparency?: string // Whether event blocks time on calendar (opaque/transparent)
  visibility?: string // Public/private visibility (default/public/private/confidential)
  iCalUID?: string // Event identifier used across calendaring systems
  sequence?: number // Sequence number for changes (for iCalendar sync)

  // Attendees
  attendees?: Array<{
    id?: string
    email: string
    displayName?: string
    organizer?: boolean
    self?: boolean
    resource?: boolean // Whether attendee is a resource (room, etc)
    optional?: boolean // Whether attendance is optional
    responseStatus?:
      | 'needsAction'
      | 'declined'
      | 'tentative'
      | 'accepted'
      | string
    comment?: string // Attendee comment
    additionalGuests?: number // Number of additional guests
  }>
  attendeesOmitted?: boolean // Whether attendees may have been omitted

  // Extended properties
  extendedProperties?: {
    private?: {
      [key: string]: string // Private properties (visible only to creator/editor)
    }
    shared?: {
      [key: string]: string // Properties visible to readers/editors
    }
  }

  // Virtual meeting information
  hangoutLink?: string // Link for Google Meet
  conferenceData?: {
    createRequest?: {
      requestId?: string
      conferenceSolutionKey?: {
        type?: string
      }
      status?: {
        statusCode?: string
      }
    }
    entryPoints?: Array<{
      entryPointType?: 'video' | 'phone' | 'sip' | 'more' | string
      uri?: string
      label?: string
      pin?: string
      accessCode?: string
      meetingCode?: string
      passcode?: string
      password?: string
    }>
    conferenceSolution?: {
      key?: {
        type?: string
      }
      name?: string
      iconUri?: string
    }
    conferenceId?: string
    signature?: string
    notes?: string
  }

  // Gadget information (for calendar gadgets)
  gadget?: {
    type?: string
    title?: string
    link?: string
    iconLink?: string
    width?: number
    height?: number
    display?: string
    preferences?: {
      [key: string]: string
    }
  }

  // Guest permissions
  anyoneCanAddSelf?: boolean
  guestsCanInviteOthers?: boolean
  guestsCanModify?: boolean
  guestsCanSeeOtherGuests?: boolean

  // Flags
  privateCopy?: boolean // Whether this is a private copy of the event
  locked?: boolean // Whether this event can be modified

  // Reminders
  reminders?: {
    useDefault: boolean
    overrides?: Array<{
      method: 'email' | 'popup' | string
      minutes: number
    }>
  }

  // Source information
  source?: {
    url?: string
    title?: string
  }

  // Working location properties (new feature)
  workingLocationProperties?: {
    type?: string
    homeOffice?: any // Value varies depending on type
    customLocation?: {
      label?: string
    }
    officeLocation?: {
      buildingId?: string
      floorId?: string
      floorSectionId?: string
      deskId?: string
      label?: string
    }
  }

  // Out of office properties
  outOfOfficeProperties?: {
    autoDeclineMode?: string
    declineMessage?: string
  }

  // Focus time properties
  focusTimeProperties?: {
    autoDeclineMode?: string
    declineMessage?: string
    chatStatus?: string
  }

  // Attachments
  attachments?: Array<{
    fileUrl?: string
    title?: string
    mimeType?: string
    iconLink?: string
    fileId?: string
  }>

  // Birthday properties
  birthdayProperties?: {
    contact?: string
    type?: string
    customTypeName?: string
  }

  // Event type classification
  eventType?: string // default, outOfOffice, workingLocation, focusTime
}

export interface GoogleCalendarWebhookRequest extends NextApiRequest {
  body: GoogleCalendarPushNotification
  headers: {
    'x-goog-channel-id'?: string
    'x-goog-resource-id'?: string
    'x-goog-resource-state'?: string
    'x-goog-resource-uri'?: string
    'x-goog-message-number'?: string
    'x-goog-channel-token'?: string
    'x-goog-channel-expiration'?: string
    [key: string]: string | string[] | undefined
  }
}
