import { calendar_v3 } from 'googleapis'
import { Attendee } from 'ics'

import { UnifiedEvent } from '@/types/Calendar'
import {
  CalendarSyncInfo,
  NewCalendarEventType,
} from '@/types/CalendarConnections'
import { MicrosoftGraphEvent } from '@/types/Office365'
import {
  MeetingCreationSyncRequest,
  MeetingInstanceCreationSyncRequest,
} from '@/types/Requests'

export type EventBusyDate = {
  start: Date | string
  end: Date | string
  title?: string
  eventId?: string
  webLink?: string
  email?: string
  recurrenceId?: string
}
/**
 * Calendar Service  Contract
 */
export interface BaseCalendarService {
  /** which email is the calendar owner */
  getConnectedEmail: () => string
  /**
   * Refreshes the calendar connection, fetching the external calendar(s) info again
   */
  refreshConnection(): Promise<CalendarSyncInfo[]>

  /**
   * Creates a new event on target external calendar
   *
   * @param owner the owner address
   * @param meetingDetails details if the event
   * @param meeting_creation_time the time when the event was created
   * @param calendarId the calendar ID to create the event in
   * @param shouldGenerateLink whether to generate a meeting link (default: false)
   */
  createEvent(
    owner: string,
    meetingDetails: MeetingCreationSyncRequest,
    meeting_creation_time: Date,
    calendarId: string,
    shouldGenerateLink?: boolean
  ): Promise<Partial<NewCalendarEventType>>
  /**
   * List user availability on target external calendar
   *
   * @param dateFrom initial date to query
   * @param dateTo final date to query
   */
  getAvailability(
    calendarIds: string[],
    dateFrom: string,
    dateTo: string
  ): Promise<EventBusyDate[]>

  /**
   * Updates an event on target external calendar
   *
   * @param calendarOwnerAccountAddress the owner account address
   * @param slot_id the event id to update
   * @param details meeting updated details
   */
  updateEvent(
    calendarOwnerAccountAddress: string,
    meetingDetails: MeetingCreationSyncRequest,
    calendarId: string,
    useParticipants?: boolean
  ): Promise<Partial<NewCalendarEventType>>

  /**
   * Deletes an previously created event on target external calendar
   *
   * @param slot_id the event id to delete
   */
  deleteEvent(meeting_id: string, calendarId: string): Promise<void>

  getEvents(
    calendarIds: string[],
    dateFrom: string,
    dateTo: string,
    onlyWithMeetingLinks?: boolean
  ): Promise<UnifiedEvent[]>

  /**
   * Updates a single instance of a recurring event
   *
   * @param calendarOwnerAccountAddress the owner account address
   * @param meetingDetails meeting details including series_id and original start time
   * @param calendarId the calendar ID
   */
  updateEventInstance(
    calendarOwnerAccountAddress: string,
    meetingDetails: MeetingInstanceCreationSyncRequest,
    calendarId: string
  ): Promise<void>
}
export interface IOffcie365CalendarService extends BaseCalendarService {
  /**
   * Creates a new event on target external calendar
   *
   * @param owner the owner address
   * @param meetingDetails details if the event
   * @param meeting_creation_time the time when the event was created
   * @param calendarId the calendar ID to create the event in
   * @param shouldGenerateLink whether to generate a meeting link (default: false)
   */
  createEvent(
    owner: string,
    meetingDetails: MeetingCreationSyncRequest,
    meeting_creation_time: Date,
    calendarId: string,
    shouldGenerateLink?: boolean
  ): Promise<Partial<NewCalendarEventType> & MicrosoftGraphEvent>

  updateEvent(
    calendarOwnerAccountAddress: string,
    meetingDetails: MeetingCreationSyncRequest,
    calendarId: string,
    useParticipants?: boolean
  ): Promise<Partial<NewCalendarEventType> & MicrosoftGraphEvent>
}
export interface IGoogleCalendarService extends BaseCalendarService {
  /**
   * Lists events over a specific date range on target calendar
   * @param calendarId the calendar ID to list events from
   * @param dateFrom the start date to list events from
   * @param dateTo the end date to list events from
   */
  listEvents(calendarId: string, syncToken: string | null): Promise<EventList>

  /**
   * Updates the RSVP status of an attendee for a specific event
   * @param meeting_id
   * @param attendeeEmail
   * @param responseStatus
   * @param _calendarId
   */
  updateEventRSVP(
    meeting_id: string,
    attendeeEmail: string,
    responseStatus: string,
    _calendarId?: string
  ): Promise<NewCalendarEventType>

  /**
   * Updates the extended properties of an event
   * This is used to update the meeting link or other custom properties
   * Only available for Google Calendar service
   * @param meeting_id the event ID to update
   * @param _calendarId the calendar ID to update the event in (optional)
   */
  updateEventExtendedProperties(
    meeting_id: string,
    _calendarId?: string
  ): Promise<NewCalendarEventType>

  initialSync(
    calendarId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<string | null | undefined>

  /**
   * Sets up a webhook URL for calendar change notifications
   * Only available for Google Calendar service
   *
   * @param webhookUrl the URL to receive webhook notifications
   * @param calendarId the calendar ID to watch (defaults to 'primary')
   */
  setWebhookUrl(
    webhookUrl: string,
    calendarId?: string
  ): Promise<{
    channelId: string | null | undefined
    resourceId: string | null | undefined
    expiration: string | null | undefined
    calendarId: string
    webhookUrl: string
  }>

  /**
   * Stops an active webhook subscription
   * Only available for Google Calendar service
   *
   * @param channelId the channel ID of the webhook to stop
   * @param resourceId the resource ID of the webhook to stop
   */
  stopWebhook(channelId: string, resourceId: string): Promise<void>

  /**
   * Refreshes an existing webhook subscription
   * Only available for Google Calendar service
   *
   * @param channelId the current channel ID
   * @param webhookUrl the webhook URL
   * @param calendarId the calendar ID
   */
  refreshWebhook(
    oldChannelId: string,
    oldResourceId: string,
    webhookUrl: string,
    calendarId?: string
  ): Promise<{
    channelId: string | null | undefined
    resourceId: string | null | undefined
    expiration: string | null | undefined
    calendarId: string
    webhookUrl: string
  }>

  /**
   * Creates a new event on target external calendar
   *
   * @param owner the owner address
   * @param meetingDetails details if the event
   * @param meeting_creation_time the time when the event was created
   * @param calendarId the calendar ID to create the event in
   * @param shouldGenerateLink whether to generate a meeting link (default: false)
   */
  createEvent(
    owner: string,
    meetingDetails: MeetingCreationSyncRequest,
    meeting_creation_time: Date,
    calendarId: string,
    shouldGenerateLink?: boolean
  ): Promise<NewCalendarEventType & calendar_v3.Schema$Event>

  updateEvent(
    calendarOwnerAccountAddress: string,
    meetingDetails: MeetingCreationSyncRequest,
    calendarId: string
  ): Promise<NewCalendarEventType & calendar_v3.Schema$Event>
}

export interface ICaldavCalendarService extends BaseCalendarService {
  createEvent(
    owner: string,
    meetingDetails: MeetingCreationSyncRequest,
    meeting_creation_time: Date,
    calendarId: string,
    shouldGenerateLink?: boolean
  ): Promise<
    Partial<NewCalendarEventType> & {
      attendees: Attendee[]
    }
  >
  updateEvent(
    calendarOwnerAccountAddress: string,
    meetingDetails: MeetingCreationSyncRequest,
    calendarId: string
  ): Promise<
    Partial<NewCalendarEventType> & {
      attendees: Attendee[]
    }
  >
}

export type EventList = {
  events: calendar_v3.Schema$Event[]
  nextSyncToken: string | null | undefined
}
