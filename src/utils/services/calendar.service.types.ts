import {
  CalendarEvent,
  CalendarSyncInfo,
  NewCalendarEventType,
} from '@/types/CalendarConnections'
import { MeetingCreationSyncRequest } from '@/types/Requests'

export type EventBusyDate = Record<'start' | 'end', Date | string>

/**
 * Calendar Service  Contract
 */
export interface CalendarService {
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
   * @param details details if the event
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

  getEvents?: (calendarId: string, days?: number) => Promise<CalendarEvent[]>

  stopChannel?: (
    calendarOwnerAddress: string,
    resourceId: string
  ) => Promise<void>

  /**
   * List user availability on target external calendar
   *
   * @param calendarId calendar id to query
   * @param calendarOwnerAddress calendar owner address
   */
  setupCalendarWebhook(
    calendarId: string,
    calendarOwnerAddress: string
  ): Promise<void>

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
}
