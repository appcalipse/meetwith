import { calendar_v3 } from 'googleapis'

import {
  CalendarSyncInfo,
  NewCalendarEventType,
} from '@/types/CalendarConnections'
import { TimeSlotSource } from '@/types/Meeting'
import { MeetingCreationSyncRequest } from '@/types/Requests'

export type EventBusyDate = Record<'start' | 'end', Date | string>

/**
 * Calendar Service  Contract
 */
export interface CalendarService<T extends TimeSlotSource> {
  /** which email is the calendar owner */
  getConnectedEmail: () => string
  /**
   * Refreshes the calendar connection, fetching the external calendar(s) info again
   */
  refreshConnection(): Promise<CalendarSyncInfo[]>

  /**
   * Lists events over a specific date range on target calendar
   * @param calendarId the calendar ID to list events from
   * @param dateFrom the start date to list events from
   * @param dateTo the end date to list events from
   */
  listEvents?: T extends TimeSlotSource.GOOGLE
    ? (
        calendarId: string,
        dateFrom: Date,
        dateTo: Date
      ) => Promise<calendar_v3.Schema$Event[]>
    : never

  /**
   * Updates the RSVP status of an attendee for a specific event
   * @param meeting_id
   * @param attendeeEmail
   * @param responseStatus
   * @param _calendarId
   */

  updateEventRSVP?: T extends TimeSlotSource.GOOGLE
    ? (
        meeting_id: string,
        attendeeEmail: string,
        responseStatus: string,
        _calendarId?: string
      ) => Promise<NewCalendarEventType>
    : never

  /**
   * Updates the extended properties of an event
   * This is used to update the meeting link or other custom properties
   * Only available for Google Calendar service
   * @param meeting_id the event ID to update
   * @param _calendarId the calendar ID to update the event in (optional)
   */

  updateEventExtendedProperties?: T extends TimeSlotSource.GOOGLE
    ? (
        meeting_id: string,
        _calendarId?: string
      ) => Promise<NewCalendarEventType>
    : never

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
  ): Promise<NewCalendarEventType>
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
    meeting_id: string,
    meetingDetails: MeetingCreationSyncRequest,
    calendarId: string
  ): Promise<NewCalendarEventType>

  /**
   * Deletes an previously created event on target external calendar
   *
   * @param slot_id the event id to delete
   */
  deleteEvent(meeting_id: string, calendarId: string): Promise<void>

  /**
   * Sets up a webhook URL for calendar change notifications
   * Only available for Google Calendar service
   *
   * @param webhookUrl the URL to receive webhook notifications
   * @param calendarId the calendar ID to watch (defaults to 'primary')
   */
  setWebhookUrl?: T extends TimeSlotSource.GOOGLE
    ? (
        webhookUrl: string,
        calendarId?: string
      ) => Promise<{
        channelId: string | null | undefined
        resourceId: string | null | undefined
        expiration: string | null | undefined
        calendarId: string
        webhookUrl: string
      }>
    : never

  /**
   * Stops an active webhook subscription
   * Only available for Google Calendar service
   *
   * @param channelId the channel ID of the webhook to stop
   * @param resourceId the resource ID of the webhook to stop
   */
  stopWebhook?: T extends TimeSlotSource.GOOGLE
    ? (channelId: string, resourceId: string) => Promise<void>
    : never

  /**
   * Refreshes an existing webhook subscription
   * Only available for Google Calendar service
   *
   * @param channelId the current channel ID
   * @param webhookUrl the webhook URL
   * @param calendarId the calendar ID
   */
  refreshWebhook?: T extends TimeSlotSource.GOOGLE
    ? (
        oldChannelId: string,
        oldResourceId: string,
        webhookUrl: string,
        calendarId?: string
      ) => Promise<{
        channelId: string | null | undefined
        resourceId: string | null | undefined
        expiration: string | null | undefined
        calendarId: string
        webhookUrl: string
      }>
    : never
}
