export type EventBusyDate = Record<'start' | 'end', Date | string>
export interface DateTimeTimeZone {
  dateTime: string
  timeZone: string
}

export interface EmailAddress {
  name?: string
  address: string
}

export interface Recipient {
  emailAddress: EmailAddress
}

export interface Attendee extends Recipient {
  type?: 'required' | 'optional' | 'resource'
  status?: ResponseStatus
}

export interface ItemBody {
  contentType: 'text' | 'html'
  content: string
}

export interface Location {
  displayName?: string
  locationType?: string
  uniqueId?: string
  uniqueIdType?: string
  address?: PhysicalAddress
  coordinates?: OutlookGeoCoordinates
}

export interface PhysicalAddress {
  street?: string
  city?: string
  state?: string
  countryOrRegion?: string
  postalCode?: string
}

export interface OutlookGeoCoordinates {
  latitude?: number
  longitude?: number
  accuracy?: number
  altitude?: number
  altitudeAccuracy?: number
}

export interface OnlineMeetingInfo {
  conferenceId?: string
  joinUrl?: string
  phones?: Phone[]
  quickDial?: string
  tollFreeNumbers?: string[]
  tollNumber?: string
}

export interface Phone {
  number?: string
  type?:
    | 'home'
    | 'business'
    | 'mobile'
    | 'other'
    | 'assistant'
    | 'homeFax'
    | 'businessFax'
    | 'otherFax'
    | 'pager'
    | 'radio'
}

export interface ResponseStatus {
  response?:
    | 'none'
    | 'organizer'
    | 'tentativelyAccepted'
    | 'accepted'
    | 'declined'
    | 'notResponded'
  time?: string
}

export interface PatternedRecurrence {
  pattern: RecurrencePattern
  range: RecurrenceRange
}

export interface RecurrencePattern {
  type:
    | 'daily'
    | 'weekly'
    | 'absoluteMonthly'
    | 'relativeMonthly'
    | 'absoluteYearly'
    | 'relativeYearly'
  interval: number
  month?: number
  dayOfMonth?: number
  daysOfWeek?: Array<
    | 'sunday'
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
  >
  firstDayOfWeek?:
    | 'sunday'
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
  index?: 'first' | 'second' | 'third' | 'fourth' | 'last'
}

export interface RecurrenceRange {
  type: 'endDate' | 'noEnd' | 'numbered'
  startDate: string
  endDate?: string
  recurrenceTimeZone?: string
  numberOfOccurrences?: number
}

export type OnlineMeetingProviderType =
  | 'unknown'
  | 'teamsForBusiness'
  | 'skypeForBusiness'
  | 'skypeForConsumer'

export type EventImportance = 'low' | 'normal' | 'high'

export type EventSensitivity =
  | 'normal'
  | 'personal'
  | 'private'
  | 'confidential'

export type FreeBusyStatus =
  | 'free'
  | 'tentative'
  | 'busy'
  | 'oof'
  | 'workingElsewhere'
  | 'unknown'

export type EventType =
  | 'singleInstance'
  | 'occurrence'
  | 'exception'
  | 'seriesMaster'

/**
 * Represents a Microsoft Graph Calendar Event
 * @see https://docs.microsoft.com/en-us/graph/api/resources/event
 */
export interface MicrosoftGraphEvent {
  /** true if the meeting organizer allows invitees to propose a new time when responding; otherwise, false. Optional. The default is true. */
  allowNewTimeProposals?: boolean

  /** The collection of attendees for the event. */
  attendees?: Attendee[]

  /** The body of the message associated with the event. It can be in HTML or text format. */
  body?: ItemBody

  /** The preview of the message associated with the event. It's in text format. */
  bodyPreview?: string

  /** Contains occurrenceId property values of canceled instances in a recurring series, if the event is the series master. */
  cancelledOccurrences?: string[]

  /** The categories associated with the event. Each category corresponds to the displayName property of an outlookCategory defined for the user. */
  categories?: string[]

  /** Identifies the version of the event object. Every time the event is changed, ChangeKey changes as well. */
  changeKey?: string

  /** The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. */
  createdDateTime?: string

  /** The date, time, and time zone that the event ends. By default, the end time is in UTC. */
  end?: DateTimeTimeZone

  /** Set to true if the event has attachments. */
  hasAttachments?: boolean

  /** When set to true, each attendee only sees themselves in the meeting request and meeting Tracking list. The default is false. */
  hideAttendees?: boolean

  /** A unique identifier for an event across calendars. This ID is different for each occurrence in a recurring series. Read-only. */
  iCalUId?: string

  /** Unique identifier for the event. Case-sensitive and read-only. */
  id?: string

  /** The importance of the event. */
  importance?: EventImportance

  /** Set to true if the event lasts all day. */
  isAllDay?: boolean

  /** Set to true if the event has been canceled. */
  isCancelled?: boolean

  /** Set to true if the user has updated the meeting in Outlook but hasn't sent the updates to attendees. */
  isDraft?: boolean

  /** True if this event has online meeting information, false otherwise. Default is false. Optional. */
  isOnlineMeeting?: boolean

  /** Set to true if the calendar owner is the organizer of the event. */
  isOrganizer?: boolean

  /** Set to true if an alert is set to remind the user of the event. */
  isReminderOn?: boolean

  /** The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. */
  lastModifiedDateTime?: string

  /** The location of the event. */
  location?: Location

  /** The locations where the event is held or attended from. */
  locations?: Location[]

  /** Details for an attendee to join the meeting online. The default is null. Read-only. */
  onlineMeeting?: OnlineMeetingInfo

  /** Represents the online meeting service provider. By default, onlineMeetingProvider is unknown. Optional. */
  onlineMeetingProvider?: OnlineMeetingProviderType

  /** A URL for an online meeting. The property is set only when an organizer specifies in Outlook that an event is an online meeting. Read-only. */
  onlineMeetingUrl?: string

  /** The organizer of the event. */
  organizer?: Recipient

  /** The end time zone that was set when the event was created. */
  originalEndTimeZone?: string

  /** Represents the start time of an event when it's initially created as an occurrence or exception in a recurring series. */
  originalStart?: string

  /** The start time zone that was set when the event was created. */
  originalStartTimeZone?: string

  /** The recurrence pattern for the event. */
  recurrence?: PatternedRecurrence

  /** The number of minutes before the event start time that the reminder alert occurs. */
  reminderMinutesBeforeStart?: number

  /** Default is true, which represents the organizer would like an invitee to send a response to the event. */
  responseRequested?: boolean

  /** Indicates the type of response sent in response to an event message. */
  responseStatus?: ResponseStatus

  /** Possible values are: normal, personal, private, and confidential. */
  sensitivity?: EventSensitivity

  /** The ID for the recurring series master item, if this event is part of a recurring series. */
  seriesMasterId?: string

  /** The status to show. */
  showAs?: FreeBusyStatus

  /** The start date, time, and time zone of the event. By default, the start time is in UTC. */
  start?: DateTimeTimeZone

  /** The text of the event's subject line. */
  subject?: string

  /** A custom identifier specified by a client app for the server to avoid redundant POST operations. Optional. */
  transactionId?: string

  /** The event type. Read-only. */
  type?: EventType

  /** The URL to open the event in Outlook on the web. */
  webLink?: string

  singleValueExtendedProperties: Array<{
    id: string
    value: string
  }>
}

/**
 * Represents the color theme of a calendar
 * @see https://docs.microsoft.com/en-us/graph/api/resources/calendar
 */
export type CalendarColor =
  | 'auto'
  | 'lightBlue'
  | 'lightGreen'
  | 'lightOrange'
  | 'lightGray'
  | 'lightYellow'
  | 'lightTeal'
  | 'lightPink'
  | 'lightBrown'
  | 'lightRed'
  | 'maxColor'

/**
 * Represents a Microsoft Graph Calendar
 * @see https://docs.microsoft.com/en-us/graph/api/resources/calendar
 */
export interface MicrosoftGraphCalendar {
  /**
   * Represent the online meeting service providers that can be used to create online meetings in this calendar.
   * Possible values are: unknown, skypeForBusiness, skypeForConsumer, teamsForBusiness.
   */
  allowedOnlineMeetingProviders?: OnlineMeetingProviderType[]

  /**
   * true if the user can write to the calendar, false otherwise.
   * This property is true for the user who created the calendar.
   * This property is also true for a user who shared a calendar and granted write access.
   */
  canEdit?: boolean

  /**
   * true if the user has permission to share the calendar, false otherwise.
   * Only the user who created the calendar can share it.
   */
  canShare?: boolean

  /**
   * If true, the user can read calendar items that have been marked private, false otherwise.
   */
  canViewPrivateItems?: boolean

  /**
   * Identifies the version of the calendar object.
   * Every time the calendar is changed, changeKey changes as well.
   * This allows Exchange to apply changes to the correct version of the object. Read-only.
   */
  changeKey?: string

  /**
   * Specifies the color theme to distinguish the calendar from other calendars in a UI.
   */
  color?: CalendarColor

  /**
   * The default online meeting provider for meetings sent from this calendar.
   * Possible values are: unknown, skypeForBusiness, skypeForConsumer, teamsForBusiness.
   */
  defaultOnlineMeetingProvider?: OnlineMeetingProviderType

  /**
   * The calendar color, expressed in a hex color code of three hexadecimal values,
   * each ranging from 00 to FF and representing the red, green, or blue components of the color in the RGB color space.
   * If the user has never explicitly set a color for the calendar, this property is empty. Read-only.
   */
  hexColor?: string

  /**
   * The calendar's unique identifier. Read-only.
   */
  id?: string

  /**
   * true if this is the default calendar where new events are created by default, false otherwise.
   */
  isDefaultCalendar?: boolean

  /**
   * Indicates whether this user calendar can be deleted from the user mailbox.
   */
  isRemovable?: boolean

  /**
   * Indicates whether this user calendar supports tracking of meeting responses.
   * Only meeting invites sent from users' primary calendars support tracking of meeting responses.
   */
  isTallyingResponses?: boolean

  /**
   * The calendar name.
   */
  name?: string

  /**
   * If set, this represents the user who created or added the calendar.
   * For a calendar that the user created or added, the owner property is set to the user.
   * For a calendar shared with the user, the owner property is set to the person who shared that calendar with the user.
   */
  owner?: EmailAddress
}

export interface CalendarInfo {
  allowedOnlineMeetingProviders: string[]
  canEdit: boolean
  canShare: boolean
  canViewPrivateItems: boolean
  changeKey: string
  color: string
  defaultOnlineMeetingProvider: string
  hexColor: string
  id: string
  isDefaultCalendar: boolean
  isRemovable: boolean
  isTallyingResponses: boolean
  name: string
  owner: { '@odata.type': EmailAddress }
}
