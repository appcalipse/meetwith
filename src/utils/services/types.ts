import { NewCalendarEventType } from '../../types/CalendarConnections'
import { MeetingCreationRequest } from '../../types/Meeting'

export type EventBusyDate = Record<'start' | 'end', Date | string>

/**
 * Calendar Service  Contract
 */
export interface CalendarService {
  /**
   * Creates a new event on target external calendar
   *
   * @param owner the owner address
   * @param details details if the event
   */
  createEvent(
    owner: string,
    details: MeetingCreationRequest
  ): Promise<NewCalendarEventType>

  /**
   * List user availability on target external calendar
   *
   * @param dateFrom initial date to query
   * @param dateTo final date to query
   * @param calendarId target user id, required because an external service may have multiple calendars
   */
  getAvailability(
    dateFrom: string,
    dateTo: string,
    calendarId: string
  ): Promise<EventBusyDate[]>
}
