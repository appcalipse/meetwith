import * as Sentry from '@sentry/nextjs'
import { format } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'
import ICAL from 'ical.js'
import { Attendee, ParticipationStatus } from 'ics'
import { DateTime } from 'luxon'
import {
  createAccount,
  createCalendarObject,
  DAVAccount,
  DAVCalendar,
  deleteCalendarObject,
  fetchCalendarObjects,
  fetchCalendars,
  getBasicAuthHeaders,
  updateCalendarObject,
} from 'tsdav'
import { v4 } from 'uuid'

import { UnifiedEvent } from '@/types/Calendar'
import {
  CalendarSyncInfo,
  NewCalendarEventType,
} from '@/types/CalendarConnections'
import { Intents } from '@/types/Dashboard'
import { MeetingChangeType } from '@/types/Meeting'
import {
  MeetingCreationSyncRequest,
  MeetingInstanceCreationSyncRequest,
} from '@/types/Requests'

import { appUrl } from '../constants'
import { decryptContent } from '../cryptography'
import { isValidEmail } from '../validations'
import { WebDAVEvent, WebDAVEventMapper } from './caldav.mapper'
import { generateIcsServer } from './calendar.backend.helper'
import { EventBusyDate, ICaldavCalendarService } from './calendar.service.types'

// ical.js has no ts typing
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const TIMEZONE_FORMAT = 'YYYY-MM-DDTHH:mm:ss[Z]'
const CALDAV_CALENDAR_TYPE = 'caldav'

export type BufferedBusyTime = {
  start: string
  end: string
}

export type BatchResponse = {
  responses: SubResponse[]
}

export type SubResponse = {
  body: { value: { start: { dateTime: string }; end: { dateTime: string } }[] }
}

export function handleErrorsJson(response: Response) {
  if (!response.ok) {
    response.json().then(console.error)
    throw Error(response.statusText)
  }
  return response.json()
}

export interface CaldavCredentials {
  url: string
  username: string
  password: string
}

/**
 * Generic CalDAV Integration service. It requires:
 * - caldav service base URL
 * - username (usually an email)
 * - password
 */
export default class CaldavCalendarService implements ICaldavCalendarService {
  private url = ''
  private credentials: Record<string, string> = {}
  private headers: Record<string, string> = {}
  private email: string

  constructor(
    address: string,
    email: string,
    credential: CaldavCredentials,
    encripted = true
  ) {
    const symmetricKey = process.env.SYMETRIC_KEY!

    const { username, password, url } =
      typeof credential === 'string' ? JSON.parse(credential) : credential

    this.url = url
    this.credentials = {
      username,
      password: !encripted ? password : decryptContent(symmetricKey, password),
    }
    this.headers = getBasicAuthHeaders({
      username,
      password: this.credentials.password,
    })
    this.email = email
  }

  getConnectedEmail = () => this.email

  async refreshConnection(): Promise<CalendarSyncInfo[]> {
    const calendars = await this.listCalendars()

    return calendars.map((calendar, index: number) => {
      return {
        calendarId: calendar.url,
        sync: false,
        enabled: index === 0,
        name:
          typeof calendar.displayName === 'string'
            ? calendar.displayName
            : calendar.ctag || v4(),
        color: calendar.calendarColor && calendar.calendarColor._cdata,
      }
    })
  }

  /**
   * Creates an event into the owner iCalendar
   *
   * @param owner
   * @param details
   * @returns
   */
  async createEvent(
    calendarOwnerAccountAddress: string,
    meetingDetails: MeetingCreationSyncRequest,
    meeting_creation_time: Date,
    calendarId?: string,
    useParticipants?: boolean
  ): Promise<
    NewCalendarEventType & {
      attendees: Attendee[]
    }
  > {
    try {
      const calendars = await this.listCalendars()

      const calendarToSync = calendarId
        ? calendars.find(c => c.url === calendarId)
        : calendars[0]

      let ics: Awaited<ReturnType<typeof generateIcsServer>>
      try {
        ics = await generateIcsServer(
          meetingDetails,
          calendarOwnerAccountAddress,
          MeetingChangeType.CREATE,
          `${appUrl}/dashboard/schedule?conferenceId=${meetingDetails.meeting_id}&intent=${Intents.UPDATE_MEETING}`,
          useParticipants,
          {
            accountAddress: calendarOwnerAccountAddress,
            email: this.getConnectedEmail(),
          }
        )

        if (!ics.value || ics.error)
          throw new Error('Error creating iCalString')

        // We create the event directly on iCal
        const response = await createCalendarObject({
          calendar: calendarToSync!,
          filename: `${meetingDetails.meeting_id}.ics`,
          // according to https://datatracker.ietf.org/doc/html/rfc4791#section-4.1, Calendar object resources contained in calendar collections MUST NOT specify the iCalendar METHOD property.
          iCalString: ics.value!.toString(),
          headers: this.headers,
        })

        if (!response.ok) {
          throw new Error(
            `Error creating event: ${(
              await Promise.all(JSON.stringify(response.statusText))
            ).join(', ')}`
          )
        }
      } catch (err) {
        console.error(err)
        Sentry.captureException(err)
        //Fastmail issue that doesn't accept attendees
        ics = await generateIcsServer(
          meetingDetails,
          calendarOwnerAccountAddress,
          MeetingChangeType.CREATE,
          `${appUrl}/dashboard/schedule?conferenceId=${meetingDetails.meeting_id}&intent=${Intents.UPDATE_MEETING}`,
          false
        )

        if (!ics.value || ics.error)
          throw new Error('Error creating iCalString')

        // We create the event directly on iCal
        const response = await createCalendarObject({
          calendar: calendarToSync!,
          filename: `${meetingDetails.meeting_id}.ics`,
          // according to https://datatracker.ietf.org/doc/html/rfc4791#section-4.1, Calendar object resources contained in calendar collections MUST NOT specify the iCalendar METHOD property.
          iCalString: ics.value!.toString(),
          headers: this.headers,
        })

        if (!response.ok) {
          throw new Error(
            `Error creating event: ${(
              await Promise.all(JSON.stringify(response.statusText))
            ).join(', ')}`
          )
        }
      }
      return {
        uid: meetingDetails.meeting_id.replaceAll('-', ''),
        id: meetingDetails.meeting_id,
        type: 'Cal Dav',
        password: '',
        url: '',
        additionalInfo: {},
        attendees: ics.attendees,
      }
    } catch (reason) {
      Sentry.captureException(reason)
      throw reason
    }
  }

  async updateEvent(
    calendarOwnerAccountAddress: string,
    meetingDetails: MeetingCreationSyncRequest,
    _calendarId: string
  ): Promise<
    NewCalendarEventType & {
      attendees: Attendee[]
    }
  > {
    try {
      const { meeting_id } = meetingDetails
      const events = await this.getEventsByUID(meeting_id)
      const eventToUpdate = events.find(
        event => event.uid === meeting_id.replaceAll('-', '')
      )
      const useParticipants =
        eventToUpdate &&
        eventToUpdate.attendees
          .map((a: string[]) => a.map(val => val.replace(/^MAILTO:/i, '')))
          .flat()
          .filter(
            (a: string) => isValidEmail(a) && a !== this.getConnectedEmail()
          ).length > 0

      const ics = await generateIcsServer(
        meetingDetails,
        calendarOwnerAccountAddress,
        MeetingChangeType.UPDATE,
        `${appUrl}/dashboard/schedule?conferenceId=${meeting_id}&intent=${Intents.UPDATE_MEETING}`,
        useParticipants,
        {
          accountAddress: calendarOwnerAccountAddress,
          email: this.getConnectedEmail(),
        }
      )

      if (!ics.value || ics.error || !eventToUpdate)
        throw new Error('Error creating iCalString')

      const response = await updateCalendarObject({
        calendarObject: {
          url: eventToUpdate.url,
          // according to https://datatracker.ietf.org/doc/html/rfc4791#section-4.1, Calendar object resources contained in calendar collections MUST NOT specify the iCalendar METHOD property.
          data: ics.value!.toString(),
          etag: eventToUpdate?.etag,
        },
        headers: this.headers,
      })

      if (response.status === 403) {
        const ics2 = await generateIcsServer(
          meetingDetails,
          calendarOwnerAccountAddress,
          MeetingChangeType.UPDATE,
          `${appUrl}/dashboard/schedule?conferenceId=${meeting_id}&intent=${Intents.UPDATE_MEETING}`,
          false
        )

        if (!ics.value || ics.error)
          throw new Error('Error creating iCalString')

        await updateCalendarObject({
          calendarObject: {
            url: eventToUpdate.url,
            // according to https://datatracker.ietf.org/doc/html/rfc4791#section-4.1, Calendar object resources contained in calendar collections MUST NOT specify the iCalendar METHOD property.
            data: ics2.value!.toString(),
            etag: eventToUpdate?.etag,
          },
          headers: this.headers,
        })
      }

      return {
        uid: meeting_id.replaceAll('-', ''),
        id: meeting_id,
        type: 'Cal Dav',
        password: '',
        url: '',
        additionalInfo: {},
        attendees: ics.attendees,
      }
    } catch (reason) {
      Sentry.captureException(reason)
      throw reason
    }
  }

  /**
   * Updates an existing CalDAV event by modifying the existing VEVENT in-place
   * This preserves provider-specific properties unlike the generateIcsServer approach
   */
  async updateEventFromUnified(
    sourceEventId: string,
    calendarId: string,
    updatedProps: {
      summary?: string
      description?: string
      dtstart?: Date
      dtend?: Date
      location?: string
      attendees?: Array<{ email: string; name?: string; status?: string }>
    }
  ): Promise<void> {
    try {
      // Fetch the existing event metadata
      const events = await this.getEventsByUID(sourceEventId)
      const eventToUpdate = events.find(
        event => event.uid === sourceEventId.replaceAll('-', '')
      )

      if (!eventToUpdate) {
        throw new Error(`Event not found: ${sourceEventId}`)
      }

      // Fetch the raw calendar object to get the actual iCalendar data
      const objects = await fetchCalendarObjects({
        calendar: {
          url: calendarId,
        },
        objectUrls: [eventToUpdate.url],
        headers: this.headers,
      })

      if (!objects || objects.length === 0 || !objects[0].data) {
        throw new Error('Failed to fetch calendar object data')
      }

      // Parse the existing iCalendar data
      const jcalData = ICAL.parse(objects[0].data)
      const vcalendar = new ICAL.Component(jcalData)
      const vevent = vcalendar.getFirstSubcomponent('vevent')

      if (!vevent) {
        throw new Error('No VEVENT found in calendar data')
      }

      // Update SUMMARY
      if (updatedProps.summary !== undefined) {
        vevent.updatePropertyWithValue('summary', updatedProps.summary)
      }

      // Update DESCRIPTION
      if (updatedProps.description !== undefined) {
        vevent.updatePropertyWithValue('description', updatedProps.description)
      }

      // Update LOCATION
      if (updatedProps.location !== undefined) {
        vevent.updatePropertyWithValue('location', updatedProps.location)
      }

      // Update DTSTART
      if (updatedProps.dtstart) {
        const icalTime = ICAL.Time.fromJSDate(updatedProps.dtstart, true)
        vevent.updatePropertyWithValue('dtstart', icalTime)
      }

      // Update DTEND
      if (updatedProps.dtend) {
        const icalTime = ICAL.Time.fromJSDate(updatedProps.dtend, true)
        vevent.updatePropertyWithValue('dtend', icalTime)
      }

      // Update ATTENDEES (replace all)
      if (updatedProps.attendees) {
        // Remove existing attendees
        const existingAttendees = vevent.getAllProperties('attendee')
        existingAttendees.forEach(prop => vevent.removeProperty(prop))

        // Add updated attendees
        updatedProps.attendees.forEach(attendee => {
          const attendeeProp = vevent.addPropertyWithValue(
            'attendee',
            `mailto:${attendee.email}`
          )
          if (attendee.name) {
            attendeeProp.setParameter('cn', attendee.name)
          }
          if (attendee.status) {
            attendeeProp.setParameter('partstat', attendee.status)
          }
          attendeeProp.setParameter('role', 'REQ-PARTICIPANT')
        })
      }

      // Update LAST-MODIFIED
      const now = ICAL.Time.now()
      vevent.updatePropertyWithValue('last-modified', now)

      // Increment SEQUENCE
      const currentSequence = vevent.getFirstPropertyValue('sequence') || 0
      const sequenceNumber =
        typeof currentSequence === 'number'
          ? currentSequence
          : parseInt(String(currentSequence), 10) || 0
      vevent.updatePropertyWithValue('sequence', sequenceNumber + 1)

      // Update DTSTAMP
      vevent.updatePropertyWithValue('dtstamp', now)

      // Update the calendar object on the server
      await updateCalendarObject({
        calendarObject: {
          url: eventToUpdate.url,
          data: vcalendar.toString(),
          etag: eventToUpdate.etag,
        },
        headers: this.headers,
      })
    } catch (error) {
      Sentry.captureException(error)
      throw new Error(`Failed to update CalDAV event: ${error}`)
    }
  }
  async deleteEvent(meeting_id: string, _calendarId: string): Promise<void> {
    try {
      const events = await this.getEventsByUID(meeting_id)
      const eventsToDelete = events.filter(
        event => event.uid === meeting_id.replaceAll('-', '')
      )
      await Promise.all(
        eventsToDelete.map(event => {
          return deleteCalendarObject({
            calendarObject: {
              url: event.url,
              etag: event?.etag,
            },
            headers: this.headers,
          })
        })
      )
    } catch (reason) {
      console.error(reason)
      Sentry.captureException(reason)
      throw reason
    }
  }

  async getAvailability(
    calendarIds: string[],
    dateFrom: string,
    dateTo: string
  ): Promise<EventBusyDate[]> {
    const calendars = await this.listCalendars()

    // CalDAV does not support pagination like Google Calendar (nextPageToken) or Office 365 (@odata.nextLink).
    // Instead, we implement time-range filtering in chunks to ensure all events are retrieved.
    const CHUNK_SIZE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

    const dateFromMs = new Date(dateFrom).getTime()
    const dateToMs = new Date(dateTo).getTime()

    const fetchEventsForCalendar = async (
      calendar: DAVCalendar,
      start: string,
      end: string
    ) => {
      try {
        const objects = await fetchCalendarObjects({
          calendar,
          headers: this.headers,
          expand: true,
          timeRange: {
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
          },
        })

        return objects
          .filter(e => !!e.data)
          .map(object => {
            const jcalData = ICAL.parse(object.data)
            const vcalendar = new ICAL.Component(jcalData)
            const vevent = vcalendar.getFirstSubcomponent('vevent')
            if (!vevent) return null
            const event = new ICAL.Event(vevent)

            return {
              start: event.startDate.toJSDate().toISOString(),
              end: event.endDate.toJSDate().toISOString(),
              title: event.summary || '',
              eventId: object.url || undefined,
              email: this.email,
              webLink: object.url || undefined,
              recurrenceId: event.recurrenceId
                ? event.recurrenceId.toString()
                : undefined,
            }
          })
          .filter(e => e !== null)
      } catch (error) {
        console.warn(
          `Failed to fetch events for calendar ${calendar.url} in range ${start} to ${end}`,
          error
        )
        Sentry.captureException(error)
        return []
      }
    }

    // Split the time range into 7-day chunks and fetch events for each chunk
    const chunks: Array<{ start: Date; end: Date }> = []
    let currentStart = dateFromMs

    while (currentStart < dateToMs) {
      const chunkEnd = Math.min(currentStart + CHUNK_SIZE_MS, dateToMs)
      chunks.push({
        start: new Date(currentStart),
        end: new Date(chunkEnd),
      })
      currentStart = chunkEnd
    }

    // Fetch events for each calendar and chunk in parallel
    const allEventsPromises = calendars
      .filter(cal => calendarIds.includes(cal.url!))
      .map(async calendar => {
        const chunkPromises = chunks.map(chunk =>
          fetchEventsForCalendar(
            calendar,
            chunk.start.toISOString(),
            chunk.end.toISOString()
          )
        )
        const chunkResults = await Promise.all(chunkPromises)
        return chunkResults.flat()
      })

    const allEventsArrays = await Promise.all(allEventsPromises)
    const allEvents = allEventsArrays.flat()

    // Deduplicate events using a composite key that includes recurrenceId for recurring events.
    // This prevents filtering out recurring meeting instances, which share the same eventId (UID)
    const uniqueEventsMap = new Map<string, EventBusyDate>()
    for (const event of allEvents) {
      const eventWithRecurrence = event as EventBusyDate & {
        recurrenceId?: string
      }
      const eventKey = eventWithRecurrence.recurrenceId
        ? `${event.eventId || 'unknown'}_${eventWithRecurrence.recurrenceId}`
        : `${event.eventId || 'unknown'}_${new Date(event.start).getTime()}`

      if (!uniqueEventsMap.has(eventKey)) {
        const { recurrenceId: _, ...eventWithoutRecurrenceId } =
          eventWithRecurrence
        uniqueEventsMap.set(eventKey, eventWithoutRecurrenceId)
      }
    }

    return Array.from(uniqueEventsMap.values())
  }

  async listCalendars() {
    try {
      const account = await this.getAccount()

      const calendars = await fetchCalendars({
        account,
        headers: this.headers,
      })

      return calendars.reduce<
        (DAVCalendar & {
          calendarColor?: {
            _cdata?: string
          }
        })[]
      >((newCalendars, calendar) => {
        if (!calendar.components?.includes('VEVENT')) return newCalendars
        newCalendars.push(calendar)
        return newCalendars
      }, [])
    } catch (reason) {
      Sentry.captureException(reason)
      throw reason
    }
  }

  private async getEventsResources(
    calId: string,
    dateFrom: string | null,
    dateTo: string | null,
    objectUrls?: string[] | null
  ) {
    try {
      const objects = await fetchCalendarObjects({
        calendar: {
          url: calId,
        },
        objectUrls: objectUrls ? objectUrls : undefined,
        timeRange:
          dateFrom && dateTo
            ? {
                start: format(new Date(dateFrom), TIMEZONE_FORMAT),
                end: format(new Date(dateTo), TIMEZONE_FORMAT),
              }
            : undefined,
        headers: this.headers,
      })

      const events = objects
        .filter(e => !!e.data)
        .map(object => {
          const jcalData = ICAL.parse(object.data)

          const vcalendar = new ICAL.Component(jcalData)

          const vevent = vcalendar.getFirstSubcomponent('vevent')
          if (!vevent) return null
          const event = new ICAL.Event(vevent)
          const calendarTimezone =
            vcalendar
              .getFirstSubcomponent('vtimezone')
              ?.getFirstPropertyValue('tzid')
              ?.toString() || ''
          const rrule = vevent.getFirstPropertyValue('rrule')

          const startDate = calendarTimezone
            ? utcToZonedTime(event.startDate.toJSDate(), calendarTimezone)
            : new Date(event.startDate.toUnixTime() * 1000)

          const endDate = calendarTimezone
            ? utcToZonedTime(event.endDate.toJSDate(), calendarTimezone)
            : new Date(event.endDate.toUnixTime() * 1000)

          return {
            uid: event.uid,
            etag: object.etag,
            url: object.url,
            summary: event.summary,
            description: event.description,
            location: event.location,
            sequence: event.sequence,
            startDate,
            endDate,
            duration: {
              weeks: event.duration.weeks,
              days: event.duration.days,
              hours: event.duration.hours,
              minutes: event.duration.minutes,
              seconds: event.duration.seconds,
              isNegative: event.duration.isNegative,
            },
            organizer: event.organizer,
            attendees: event.attendees.map(a => a.getValues()),
            recurrenceId: event.recurrenceId
              ? event.recurrenceId.toString()
              : null,
            rrule: rrule ? rrule.toString() : null,
            timezone: calendarTimezone,
          }
        })
        .filter(e => e !== null)

      return events
    } catch (reason) {
      console.error(reason)
      throw reason
    }
  }

  private async getEventsByUID(uid: string) {
    const events = []

    const calendars = await this.listCalendars()
    for (const cal of calendars) {
      const calEvents = await this.getEventsResources(cal.url, null, null, [
        `${cal.url}${uid}.ics`,
      ])

      for (const ev of calEvents) {
        events.push(ev)
      }
    }

    return events
  }

  private async getAccount(): Promise<DAVAccount> {
    return createAccount({
      account: {
        serverUrl: this.url,
        accountType: CALDAV_CALENDAR_TYPE,
        credentials: this.credentials,
      },
      headers: this.headers,
    })
  }
  async getEvents(
    calendarIds: string[],
    dateFrom: string,
    dateTo: string,
    onlyWithMeetingLinks?: boolean
  ): Promise<UnifiedEvent[]> {
    const calendars = await this.listCalendars()

    // CalDAV does not support pagination like Google Calendar (nextPageToken) or Office 365 (@odata.nextLink).
    // Instead, we implement time-range filtering in chunks to ensure all events are retrieved.
    const CHUNK_SIZE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

    const dateFromMs = new Date(dateFrom).getTime()
    const dateToMs = new Date(dateTo).getTime()

    const fetchEventsForCalendar = async (
      calendar: DAVCalendar,
      start: string,
      end: string
    ) => {
      try {
        const objects = await fetchCalendarObjects({
          calendar,
          headers: this.headers,
          expand: true,
          timeRange: {
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
          },
        })

        return objects
          .filter(e => !!e.data)
          .map((object): WebDAVEvent | null => {
            const jcalData = ICAL.parse(object.data)
            const vcalendar = new ICAL.Component(jcalData)
            const vevent = vcalendar.getFirstSubcomponent('vevent')
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
            const rrule = vevent.getFirstPropertyValue('rrule')
            if (onlyWithMeetingLinks && !event.location) {
              return null
            }
            return {
              uid: event.uid,
              etag: object.etag,
              url: object.url,
              calId: calendar.url,
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
              exdate: vevent
                .getAllProperties('exdate')
                .map(exdateProp => {
                  const exdate = exdateProp.getFirstValue()?.toString()
                  if (!exdate) return null
                  return new Date(exdate)
                })
                .filter((ed): ed is Date => ed !== null),
            }
          })
          .filter(e => e !== null)
      } catch (error) {
        console.warn(
          `Failed to fetch events for calendar ${calendar.url} in range ${start} to ${end}`,
          error
        )
        Sentry.captureException(error)
        return []
      }
    }

    // Split the time range into 7-day chunks and fetch events for each chunk
    const chunks: Array<{ start: Date; end: Date }> = []
    let currentStart = dateFromMs

    while (currentStart < dateToMs) {
      const chunkEnd = Math.min(currentStart + CHUNK_SIZE_MS, dateToMs)
      chunks.push({
        start: new Date(currentStart),
        end: new Date(chunkEnd),
      })
      currentStart = chunkEnd
    }

    // Fetch events for each calendar and chunk in parallel
    const allEventsPromises = calendars
      .filter(cal => calendarIds.includes(cal.url!))
      .map(async calendar => {
        const chunkPromises = chunks.map(chunk =>
          fetchEventsForCalendar(
            calendar,
            chunk.start.toISOString(),
            chunk.end.toISOString()
          )
        )
        const chunkResults = await Promise.all(chunkPromises)
        return chunkResults.flat()
      })

    const allEventsArrays = await Promise.all(allEventsPromises)
    const allEvents = allEventsArrays.flat()

    // Deduplicate events using a composite key that includes recurrenceId for recurring events.
    // This prevents filtering out recurring meeting instances, which share the same eventId (UID)
    const uniqueEventsMap = new Map<string, WebDAVEvent>()
    for (const event of allEvents) {
      const eventKey = event.recurrenceId
        ? `${event.uid || 'unknown'}_${event.recurrenceId}`
        : `${event.uid || 'unknown'}_${new Date(event.startDate).getTime()}`

      if (!uniqueEventsMap.has(eventKey)) {
        uniqueEventsMap.set(eventKey, event)
      }
    }

    return Array.from(uniqueEventsMap.values()).map(event =>
      WebDAVEventMapper.toUnified(event, event.calId!, event.accountEmail!)
    )
  }

  async updateEventInstance(
    calendarOwnerAccountAddress: string,
    meetingDetails: MeetingInstanceCreationSyncRequest,
    calendarId: string
  ): Promise<void> {
    const eventUID = meetingDetails.meeting_id
    const originalStartTime = meetingDetails.original_start_time

    if (!originalStartTime) {
      throw new Error(
        'original_start_time is required for recurring instance updates'
      )
    }

    // 1. Fetch all events with this UID (master + any existing exceptions)
    const events = await this.getEventsByUID(eventUID)
    const masterEvent = events.find(
      event => event.uid === eventUID.replaceAll('-', '') && !event.recurrenceId
    )

    if (!masterEvent) {
      throw new Error('Series master event not found')
    }

    // 2. Check if exception already exists for this recurrence
    const originalStartTimeMs = new Date(originalStartTime).getTime()
    const existingException = events.find(e => {
      if (!e.recurrenceId) return false
      try {
        return new Date(e.recurrenceId).getTime() === originalStartTimeMs
      } catch {
        return false
      }
    })

    // 3. Build the exception VEVENT
    const veventData = await this.buildVEventWithRecurrenceId(
      calendarOwnerAccountAddress,
      meetingDetails,
      originalStartTime
    )

    if (!veventData) {
      throw new Error('Failed to build VEVENT data')
    }

    const calendars = await this.listCalendars()
    const targetCalendar = calendarId
      ? calendars.find(c => c.url === calendarId)
      : calendars[0]

    if (!targetCalendar) {
      throw new Error('Target calendar not found')
    }

    // 4. Add EXDATE to master event (marks this occurrence as modified)
    await this.addExdateToMaster(
      masterEvent,
      new Date(originalStartTime),
      calendarId
    )

    // 5. Create or update the exception
    if (existingException) {
      // Update existing exception
      await updateCalendarObject({
        calendarObject: {
          url: existingException.url,
          data: veventData,
          etag: existingException.etag,
        },
        headers: this.headers,
      })
    } else {
      // Create new exception with unique filename
      const filename = `${eventUID.replaceAll(
        '-',
        ''
      )}-${originalStartTimeMs}.ics`

      await createCalendarObject({
        calendar: targetCalendar,
        filename,
        iCalString: veventData,
        headers: this.headers,
      })
    }
  }

  private async buildVEventWithRecurrenceId(
    calendarOwnerAccountAddress: string,
    meetingDetails: MeetingInstanceCreationSyncRequest,
    originalStartTime: Date
  ): Promise<string> {
    const start = DateTime.fromJSDate(new Date(meetingDetails.start))
    const end = DateTime.fromJSDate(new Date(meetingDetails.end))

    // Find existing event to get current attendees if needed
    const events = await this.getEventsByUID(meetingDetails.meeting_id)
    const masterEvent = events.find(
      event =>
        event.uid === meetingDetails.meeting_id.replaceAll('-', '') &&
        !event.recurrenceId
    )

    const useParticipants =
      masterEvent &&
      masterEvent.attendees &&
      masterEvent.attendees
        .map((a: string[]) => a.map(val => val.replace(/^MAILTO:/i, '')))
        .flat()
        .filter(
          (a: string) => isValidEmail(a) && a !== this.getConnectedEmail()
        ).length > 0

    const ics = await generateIcsServer(
      meetingDetails,
      calendarOwnerAccountAddress,
      MeetingChangeType.UPDATE,
      `${appUrl}/dashboard/schedule?conferenceId=${meetingDetails.meeting_id}&intent=${Intents.UPDATE_MEETING}`,
      useParticipants,
      {
        accountAddress: calendarOwnerAccountAddress,
        email: this.getConnectedEmail(),
      }
    )

    if (!ics.value || ics.error) {
      throw new Error('Error creating iCalString for instance')
    }

    // Parse the generated ICS and add RECURRENCE-ID
    const jcalData = ICAL.parse(ics.value.toString())
    const vcalendar = new ICAL.Component(jcalData)
    const vevent = vcalendar.getFirstSubcomponent('vevent')

    if (!vevent) {
      throw new Error('No VEVENT component found')
    }

    // Add RECURRENCE-ID property to mark this as an exception
    // Use UTC time (true parameter) for consistency
    const recurrenceIdProperty = new ICAL.Property('recurrence-id')
    recurrenceIdProperty.setValue(
      ICAL.Time.fromJSDate(new Date(originalStartTime), true)
    )
    vevent.addProperty(recurrenceIdProperty)

    // Update start and end times to the new values
    const startProperty = vevent.getFirstProperty('dtstart')
    if (startProperty) {
      startProperty.setValue(ICAL.Time.fromJSDate(start.toJSDate(), true))
    }

    const endProperty = vevent.getFirstProperty('dtend')
    if (endProperty) {
      endProperty.setValue(ICAL.Time.fromJSDate(end.toJSDate(), true))
    }

    // Remove RRULE from the exception (exceptions don't have recurrence rules)
    const rruleProperty = vevent.getFirstProperty('rrule')
    if (rruleProperty) {
      vevent.removeProperty(rruleProperty)
    }

    return vcalendar.toString()
  }

  private async addExdateToMaster(
    masterEvent: WebDAVEvent,
    originalStartTime: Date,
    calendarId: string
  ): Promise<void> {
    try {
      // Fetch the raw calendar object to get the data
      const events = await this.getEventsByUID(masterEvent.uid)
      const masterWithData = events.find(
        e => e.uid === masterEvent.uid && !e.recurrenceId
      )

      if (!masterWithData) {
        throw new Error('Master event data not found')
      }

      // Fetch the raw calendar object
      const calendars = await this.listCalendars()
      const targetCalendar = calendars.find(c => c.url === calendarId)
      if (!targetCalendar) {
        throw new Error('Calendar not found')
      }

      const objects = await fetchCalendarObjects({
        calendar: targetCalendar,
        headers: this.headers,
        objectUrls: [masterEvent.url],
      })

      const masterObject = objects[0]
      if (!masterObject || !masterObject.data) {
        throw new Error('Master event object not found')
      }

      // Parse master event
      const jcalData = ICAL.parse(masterObject.data)
      const vcalendar = new ICAL.Component(jcalData)
      const vevent = vcalendar.getFirstSubcomponent('vevent')

      if (!vevent) return

      // Check if EXDATE already exists for this date
      const exdates = vevent.getAllProperties('exdate')
      const originalStartTimeMs = originalStartTime.getTime()
      const alreadyExcluded = exdates.some(exdate => {
        const value = exdate.getFirstValue()
        if (!value) return false
        let date: Date | null = null
        if (exdate instanceof ICAL.Time) {
          date = exdate.toJSDate()
        } else if (typeof exdate === 'string') {
          date = new Date(exdate)
        } else {
          const dateTemp = new Date(exdate.toString())
          date = dateTemp.getTime() ? dateTemp : null
        }
        if (!date) return false
        return date.getTime() === originalStartTimeMs
      })

      if (!alreadyExcluded) {
        // Add EXDATE to mark this occurrence as excluded from the series
        const exdateProperty = new ICAL.Property('exdate')
        exdateProperty.setValue(ICAL.Time.fromJSDate(originalStartTime, true))
        vevent.addProperty(exdateProperty)

        // Update master event
        await updateCalendarObject({
          calendarObject: {
            url: masterEvent.url,
            data: vcalendar.toString(),
            etag: masterObject.etag,
          },
          headers: this.headers,
        })
      }
    } catch (error) {
      // Don't fail the whole operation if EXDATE update fails
      // Some servers handle this automatically
      console.warn('Failed to add EXDATE to master event:', error)
      Sentry.captureException(error)
    }
  }
  /**
   * Updates the RSVP status (PARTSTAT) of a single attendee in a CalDAV event.
   *
   * This method performs an in-place modification of the existing VEVENT component,
   * updating only the specified attendee's PARTSTAT parameter while preserving:
   * - All other attendees and their statuses
   * - Event metadata (EXDATE, RRULE, VTIMEZONE, etc.)
   * - Custom properties (X-*, VALARM, etc.)
   *
   * The SEQUENCE number is automatically incremented and LAST-MODIFIED/DTSTAMP are updated.
   *
   * @param calendarId - CalDAV calendar URL (e.g., "https://caldav.example.com/calendars/user/home/")
   * @param eventId - Event UID (unique identifier, typically without dashes)
   * @param attendeeEmail - Email of the attendee whose status to update (case-insensitive)
   * @param responseStatus - New PARTSTAT value (e.g., "ACCEPTED", "DECLINED", "TENTATIVE", "NEEDS-ACTION")
   *                        Will be automatically converted to uppercase for iCalendar compliance
   *
   * @throws {Error} If event not found
   * @throws {Error} If attendee not found in event
   * @throws {Error} If calendar object cannot be fetched or updated
   *
   * @example
   * await caldavService.updateEventRsvpForExternalEvent(
   *   'https://caldav.icloud.com/1234/calendars/home/',
   *   'recurring-meeting-uid',
   *   'alice@example.com',
   *   'ACCEPTED'
   * )
   */
  async updateEventRsvpForExternalEvent(
    calendarId: string,
    eventId: string,
    attendeeEmail: string,
    responseStatus: ParticipationStatus
  ): Promise<void> {
    try {
      // Fetch the existing event metadata
      const events = await this.getEventsByUID(eventId)
      const eventToUpdate = events.find(event => event.uid === eventId)

      if (!eventToUpdate) {
        throw new Error(`Event with ID ${eventId} not found`)
      }

      // Verify attendee exists
      const attendeeExists = eventToUpdate.attendees.some(att => {
        const email = att[1]?.toString().replace(/^MAILTO:/i, '')
        return email?.toLowerCase() === attendeeEmail.toLowerCase()
      })

      if (!attendeeExists) {
        throw new Error(
          `Attendee with email ${attendeeEmail} not found in event ${eventId}`
        )
      }

      // Fetch the raw calendar object to get the actual iCalendar data
      const objects = await fetchCalendarObjects({
        calendar: {
          url: calendarId,
        },
        objectUrls: [eventToUpdate.url],
        headers: this.headers,
      })

      if (!objects || objects.length === 0 || !objects[0].data) {
        throw new Error('Failed to fetch calendar object data')
      }

      // Parse the existing iCalendar data
      const jcalData = ICAL.parse(objects[0].data)
      const vcalendar = new ICAL.Component(jcalData)
      const vevent = vcalendar.getFirstSubcomponent('vevent')

      if (!vevent) {
        throw new Error('No VEVENT found in calendar data')
      }

      // Find and update the specific attendee's PARTSTAT
      const attendees = vevent.getAllProperties('attendee')
      let attendeeFound = false

      attendees.forEach(attendeeProp => {
        const calAddress = attendeeProp.getFirstValue()
        if (
          calAddress &&
          calAddress.toString().toLowerCase() ===
            `mailto:${attendeeEmail.toLowerCase()}`
        ) {
          attendeeProp.setParameter('partstat', responseStatus.toUpperCase())
          attendeeFound = true
        }
      })

      if (!attendeeFound) {
        throw new Error('Attendee not found in event for RSVP update')
      }

      // Update LAST-MODIFIED
      const now = ICAL.Time.now()
      vevent.updatePropertyWithValue('last-modified', now)

      // Increment SEQUENCE
      const currentSequence = vevent.getFirstPropertyValue('sequence') || 0
      const sequenceNumber =
        typeof currentSequence === 'number'
          ? currentSequence
          : parseInt(String(currentSequence), 10) || 0
      vevent.updatePropertyWithValue('sequence', sequenceNumber + 1)

      // Update DTSTAMP
      vevent.updatePropertyWithValue('dtstamp', now)

      // Update the calendar object on the server
      await updateCalendarObject({
        calendarObject: {
          url: eventToUpdate.url,
          data: vcalendar.toString(),
          etag: eventToUpdate.etag,
        },
        headers: this.headers,
      })
    } catch (error) {
      Sentry.captureException(error)
      throw new Error(`Failed to update RSVP for CalDAV event: ${error}`)
    }
  }
  async deleteExternalEvent(
    calendarId: string,
    eventId: string
  ): Promise<void> {
    const events = await this.getEventsByUID(eventId)
    const eventsToDelete = events.filter(event => event.uid === eventId)
    await Promise.all(
      eventsToDelete.map(event => {
        return deleteCalendarObject({
          calendarObject: {
            url: event.url,
            etag: event?.etag,
          },
          headers: this.headers,
        })
      })
    )
  }
}
