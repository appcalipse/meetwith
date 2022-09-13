import { NewCalendarEventType } from '@/types/CalendarConnections'
import { MeetingCreationRequest, MeetingUpdateRequest } from '@/types/Meeting'

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
    details: MeetingCreationRequest,
    slot_id: string,
    meeting_creation_time: Date
  ): Promise<NewCalendarEventType>

  /**
   * List user availability on target external calendar
   *
   * @param dateFrom initial date to query
   * @param dateTo final date to query
   */
  getAvailability(dateFrom: string, dateTo: string): Promise<EventBusyDate[]>

  /**
   * Updates an event on target external calendar
   *
   * @param calendarOwnerAccountAddress the owner account address
   * @param slot_id the event id to update
   * @param details meeting updated details
   */
  updateEvent(
    calendarOwnerAccountAddress: string,
    slot_id: string,
    details: MeetingUpdateRequest
  ): Promise<NewCalendarEventType>

  /**
   * Deletes an previously created event on target external calendar
   *
   * @param slot_id the event id to delete
   */
  deleteEvent(slot_id: string): Promise<void>
}
