/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as Sentry from '@sentry/nextjs'
import { utcToZonedTime } from 'date-fns-tz'
import ICAL from 'ical.js'
import { rrulestr } from 'rrule'

import { UnifiedEvent } from '@/types/Calendar'
import { CalendarSyncInfo } from '@/types/CalendarConnections'
import { MeetingCreationSyncRequest } from '@/types/Requests'

import { WebDAVEvent, WebDAVEventMapper } from './caldav.mapper'
import { BaseCalendarService, EventBusyDate } from './calendar.service.types'

/**
 * Webcal/ICS Feed Service
 * Read-only calendar integration for static ICS URLs (webcal://, http://, https://)
 */
export default class WebCalService implements BaseCalendarService {
  private feedUrl: string
  private email: string

  /**
   * @param accountAddress - Account address (unused but kept for interface consistency)
   * @param email - Email associated with this calendar source
   * @param icsUrl - The URL to the ICS feed (webcal://, http://, or https://)
   */
  constructor(accountAddress: string, email: string, payload: string) {
    const icsUrl = JSON.parse(payload) as { url: string }
    this.feedUrl = icsUrl.url.replace(/^webcal:\/\//i, 'https://')
    this.email = email
  }

  getConnectedEmail = (): string => this.email

  /**
   * Refreshes connection - for ICS feeds, this just validates the URL
   * Returns a single "calendar" representing the feed
   */
  async refreshConnection(): Promise<CalendarSyncInfo[]> {
    try {
      const response = await fetch(this.feedUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'MeetWithWallet/1.0',
        },
      })

      if (!response.ok) {
        throw new Error(`Feed unavailable: ${response.statusText}`)
      }

      // ICS feeds are single calendars
      return [
        {
          calendarId: this.feedUrl,
          sync: false,
          enabled: true,
          name: this.extractCalendarName() || 'External Calendar',
          color: undefined,
        },
      ]
    } catch (error) {
      Sentry.captureException(error, {
        extra: { feedUrl: this.feedUrl },
      })
      throw new Error('Failed to connect to ICS feed')
    }
  }

  /**
   * Fetches busy times from the ICS feed
   */
  async getAvailability(
    _calendarIds: string[],
    dateFrom: string,
    dateTo: string
  ): Promise<EventBusyDate[]> {
    try {
      const icsData = await this.fetchIcsData()
      const events = this.parseIcsEvents(icsData, dateFrom, dateTo)

      return events
    } catch (error) {
      Sentry.captureException(error, {
        extra: { feedUrl: this.feedUrl, dateFrom, dateTo },
      })
      throw new Error('Failed to fetch events from ICS feed')
    }
  }

  /**
   * Fetches all events from the ICS feed (for unified calendar view)
   */
  async getEvents(
    _calendarIds: string[],
    dateFrom: string,
    dateTo: string,
    onlyWithMeetingLinks?: boolean
  ): Promise<UnifiedEvent[]> {
    try {
      const icsData = await this.fetchIcsData()
      const jcalData = ICAL.parse(icsData)
      const vcalendar = new ICAL.Component(jcalData)
      const startRange = new Date(dateFrom)
      const endRange = new Date(dateTo)
      const rangeStartMs = startRange.getTime()
      const rangeEndMs = endRange.getTime()
      const vevents = vcalendar.getAllSubcomponents('vevent')

      const events = vevents
        .map((vevent): WebDAVEvent | null => {
          if (!vevent) return null

          const event = new ICAL.Event(vevent)
          const calendarTimezone =
            vcalendar
              .getFirstSubcomponent('vtimezone')
              ?.getFirstPropertyValue('tzid')
              ?.toString() || ''

          const startDate = calendarTimezone
            ? utcToZonedTime(event.startDate.toJSDate(), calendarTimezone)
            : new Date(event.startDate.toUnixTime() * 1000)

          const endDate = calendarTimezone
            ? utcToZonedTime(event.endDate.toJSDate(), calendarTimezone)
            : new Date(event.endDate.toUnixTime() * 1000)
          const eventStartMs = startDate.getTime()
          const eventEndMs = endDate.getTime()

          const rrule = vevent.getFirstPropertyValue('rrule')
          if (onlyWithMeetingLinks && !event.location) {
            return null
          }
          const exdates = vevent
            .getAllProperties('exdate')
            .map(exdateProp => {
              const exdate = exdateProp.getFirstValue()
              if (!exdate) return null

              if (exdate instanceof ICAL.Time) {
                return exdate.toJSDate()
              }

              return new Date(exdate.toString())
            })
            .filter((ed): ed is Date => ed !== null)

          const baseEvent = {
            uid: event.uid,
            etag: undefined, // ICS feeds don't have ETags
            url: this.feedUrl,
            calId: this.feedUrl,
            accountEmail: this.email,
            providerId: vcalendar.getFirstPropertyValue('prodid')?.toString(),
            status: vevent.getFirstPropertyValue('status')?.toString(),
            summary: event.summary,
            description: event.description,
            location: event.location,
            sequence: event.sequence,
            startDate,
            endDate,
            organizer: event.organizer,
            attendees: event.attendees.map(a => a.getValues()),
            recurrenceId: event.recurrenceId
              ? event.recurrenceId.toString()
              : null,
            rrule: rrule ? rrule.toString() : null,
            created: vevent.getFirstPropertyValue('created')?.toString(),
            timezone: calendarTimezone,
            duration: {
              weeks: event.duration.weeks,
              days: event.duration.days,
              hours: event.duration.hours,
              minutes: event.duration.minutes,
              seconds: event.duration.seconds,
              isNegative: event.duration.isNegative,
            },
            lastModified: vevent
              .getFirstPropertyValue('last-modified')
              ?.toString(),
            exdate: exdates,
          }
          if (rrule && !event.recurrenceId) {
            const instances = this.expandRecurringEvent(
              event,
              vevent,
              startRange,
              endRange,
              exdates.map(d => d.getTime())
            )
            if (instances.length > 0) {
              return baseEvent
            }
          } else {
            if (eventEndMs > rangeStartMs && eventStartMs < rangeEndMs) {
              return baseEvent
            }
          }
          return null
        })
        .filter((e): e is WebDAVEvent => e !== null)
      return events.map(event =>
        WebDAVEventMapper.toUnified(event, this.feedUrl, this.email)
      )
    } catch (error) {
      Sentry.captureException(error)
      throw error
    }
  }

  /**
   * READ-ONLY: ICS feeds don't support creating events
   */
  async createEvent(
    owner: string,
    meetingDetails: MeetingCreationSyncRequest,
    meeting_creation_time: Date,
    calendarId: string,
    shouldGenerateLink?: boolean
  ): Promise<any> {
    console.warn('ICS feeds are read-only. Cannot create events.')
  }

  /**
   * READ-ONLY: ICS feeds don't support updating events
   */
  async updateEvent(
    calendarOwnerAccountAddress: string,
    meetingDetails: MeetingCreationSyncRequest,
    calendarId: string,
    useParticipants?: boolean
  ): Promise<any> {
    console.warn('ICS feeds are read-only. Cannot update events.')
  }

  /**
   * READ-ONLY: ICS feeds don't support deleting events
   */
  async deleteEvent(meeting_id: string, calendarId: string): Promise<any> {
    console.warn('ICS feeds are read-only. Cannot delete events.')
  }

  /**
   * READ-ONLY: ICS feeds don't support instance updates
   */
  async updateEventInstance(): Promise<any> {
    console.warn('ICS feeds are read-only. Cannot update event instances.')
  }

  /**
   * Fetches the raw ICS data from the feed URL
   */
  private async fetchIcsData(): Promise<string> {
    try {
      const response = await fetch(this.feedUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'MeetWithWallet/1.0',
          Accept: 'text/calendar, application/ics, text/plain',
        },
        // Add timeout
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      if (!response.ok) {
        throw new Error(
          `Failed to fetch ICS feed: ${response.status} ${response.statusText}`
        )
      }

      const contentType = response.headers.get('content-type')
      if (
        contentType &&
        !contentType.includes('text/calendar') &&
        !contentType.includes('text/plain') &&
        !contentType.includes('application/ics')
      ) {
        console.warn(
          `Unexpected content-type for ICS feed: ${contentType}. Attempting to parse anyway.`
        )
      }

      return await response.text()
    } catch (error) {
      Sentry.captureException(error, {
        extra: { feedUrl: this.feedUrl },
      })
      throw new Error('Failed to download ICS feed')
    }
  }

  /**
   * Parses ICS data and extracts events with recurrence expansion
   */
  private parseIcsEvents(
    icsData: string,
    dateFrom: string,
    dateTo: string
  ): EventBusyDate[] {
    try {
      const jcalData = ICAL.parse(icsData)
      const vcalendar = new ICAL.Component(jcalData)

      const vevents = vcalendar.getAllSubcomponents('vevent')
      const events: EventBusyDate[] = []

      const startRange = new Date(dateFrom)
      const endRange = new Date(dateTo)

      for (const vevent of vevents) {
        try {
          const event = new ICAL.Event(vevent)

          // Get EXDATE if present (excluded dates for recurring events)
          const exdates = vevent
            .getAllProperties('exdate')
            .map(exdateProp => {
              const exdate = exdateProp.getFirstValue()
              if (!exdate) return null
              if (exdate instanceof ICAL.Time) {
                return exdate.toJSDate()
              } else if (typeof exdate === 'string') {
                return new Date(exdate)
              } else {
                const date = new Date(exdate.toString())
                return date.getTime() ? date : null
              }
            })
            .filter((ed): ed is Date => ed !== null)
            .map(d => d.getTime())

          if (event.isRecurring()) {
            // Expand recurring event
            const expandedEvents = this.expandRecurringEvent(
              event,
              vevent,
              startRange,
              endRange,
              exdates
            )
            events.push(...expandedEvents)
          } else {
            // Single event
            const startDate = event.startDate.toJSDate()
            const endDate = event.endDate.toJSDate()

            // Only include if within range
            if (startDate < endRange && endDate > startRange) {
              events.push({
                start: startDate,
                end: endDate,
                title: event.summary || 'Busy',
                eventId: event.uid,
                webLink: vevent.getFirstPropertyValue('url')?.toString(),
                email: this.email,
              })
            }
          }
        } catch (eventError) {
          // Skip malformed individual events
          Sentry.captureException(eventError, {
            extra: { feedUrl: this.feedUrl },
          })
          continue
        }
      }

      return events
    } catch (error) {
      Sentry.captureException(error, {
        extra: { feedUrl: this.feedUrl },
      })
      throw new Error('Failed to parse ICS data')
    }
  }

  /**
   * Expands a recurring event within the given date range
   */
  private expandRecurringEvent(
    event: any, // ICAL.Event
    vevent: any, // ICAL.Component
    startRange: Date,
    endRange: Date,
    exdates: number[]
  ): EventBusyDate[] {
    try {
      const rruleValue = vevent.getFirstPropertyValue('rrule')
      if (!rruleValue) return []

      const rruleString = rruleValue.toString()

      const dtstart = event.startDate.toJSDate()
      const rule = rrulestr(`RRULE:${rruleString}`, {
        dtstart,
      })

      // Get all occurrences within the date range
      const occurrences = rule.between(startRange, endRange, true)

      // Calculate event duration
      const duration =
        event.endDate.toJSDate().getTime() -
        event.startDate.toJSDate().getTime()

      const expandedEvents: EventBusyDate[] = []

      for (const occurrence of occurrences) {
        const occurrenceTime = occurrence.getTime()

        if (exdates.includes(occurrenceTime)) {
          continue
        }

        const eventStart = occurrence
        const eventEnd = new Date(occurrenceTime + duration)

        expandedEvents.push({
          start: eventStart,
          end: eventEnd,
          title: event.summary || 'Busy',
          eventId: event.uid,
          webLink: vevent.getFirstPropertyValue('url')?.toString(),
          email: this.email,
          recurrenceId: occurrence.toISOString(),
        })
      }

      return expandedEvents
    } catch (error) {
      // If recurrence expansion fails, log and return empty
      Sentry.captureException(error, {
        extra: {
          feedUrl: this.feedUrl,
          eventUid: event.uid,
        },
      })
      return []
    }
  }

  /**
   * Attempts to extract calendar name from ICS feed
   */
  private extractCalendarName(): string | null {
    try {
      // This would require fetching the feed, so we'll do this lazily if needed
      // For now, return null and let caller use default
      return null
    } catch {
      return null
    }
  }
  updateEventRsvpForExternalEvent(
    calendarId: string,
    eventId: string,
    attendeeEmail: string,
    responseStatus: string
  ): Promise<void> {
    console.warn('ICS feeds are read-only. Cannot update RSVP status.')
    return Promise.resolve()
  }
}
