import * as Sentry from '@sentry/nextjs'
import { format } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'
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

import { NewCalendarEventType } from '@/types/CalendarConnections'
import {
  MeetingCreationRequest,
  MeetingUpdateRequest,
  ParticipantInfo,
} from '@/types/Meeting'

import { generateIcs } from '../calendar_manager'
import { decryptContent } from '../cryptography'
import { CalendarService } from './common.types'

// ical.js has no ts typing
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ICAL = require('ical.js')
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

export type EventBusyDate = Record<'start' | 'end', Date | string>

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
export default class CaldavCalendarService implements CalendarService {
  private url = ''
  private credentials: Record<string, string> = {}
  private headers: Record<string, string> = {}

  constructor(
    address: string,
    email: string,
    credential: CaldavCredentials,
    encripted = true
  ) {
    const symetricKey = process.env.SYMETRIC_KEY!

    const { username, password, url } =
      typeof credential === 'string' ? JSON.parse(credential) : credential

    this.url = url
    this.credentials = {
      username,
      password: !encripted ? password : decryptContent(symetricKey, password),
    }
    this.headers = getBasicAuthHeaders({
      username,
      password: this.credentials.password,
    })
  }

  /**
   * Creates an event into the owner icalendar
   *
   * @param owner
   * @param details
   * @returns
   */
  async createEvent(
    calendarOwnerAccountAddress: string,
    details: MeetingCreationRequest,
    slot_id: string,
    meeting_creation_time: Date
  ): Promise<NewCalendarEventType> {
    try {
      const calendars = await this.listCalendars()

      const participantsInfo: ParticipantInfo[] =
        details.participants_mapping.map(participant => ({
          type: participant.type,
          name: participant.name,
          account_address: participant.account_address,
          status: participant.status,
          slot_id,
        }))

      const ics = generateIcs(
        {
          meeting_url: details.meeting_url,
          start: new Date(details.start),
          end: new Date(details.end),
          id: slot_id,
          created_at: new Date(meeting_creation_time),
          meeting_info_file_path: '',
          participants: participantsInfo,
          version: 0,
          related_slot_ids: [],
        },
        calendarOwnerAccountAddress
      )

      if (!ics.value || ics.error) throw new Error('Error creating iCalString')

      // We create the event directly on iCal
      const responses = await Promise.all(
        calendars.map(calendar =>
          createCalendarObject({
            calendar,
            filename: `${slot_id}.ics`,
            // according to https://datatracker.ietf.org/doc/html/rfc4791#section-4.1, Calendar object resources contained in calendar collections MUST NOT specify the iCalendar METHOD property.
            iCalString: Buffer.from(ics.value!).toString('base64'),
            headers: this.headers,
          })
        )
      )

      if (responses.some(r => !r.ok)) {
        throw new Error(
          `Error creating event: ${(
            await Promise.all(responses.map(r => JSON.stringify(r.statusText)))
          ).join(', ')}`
        )
      }

      return {
        uid: slot_id,
        id: slot_id,
        type: 'Cal Dav',
        password: '',
        url: '',
        additionalInfo: {},
      }
    } catch (reason) {
      Sentry.captureException(reason)
      throw reason
    }
  }

  async updateEvent(
    owner: string,
    slot_id: string,
    details: MeetingUpdateRequest
  ): Promise<NewCalendarEventType> {
    try {
      const events = await this.getEventsByUID(slot_id)

      const participantsInfo: ParticipantInfo[] =
        details.participants_mapping.map(participant => ({
          type: participant.type,
          name: participant.name,
          account_address: participant.account_address,
          status: participant.status,
          slot_id,
        }))

      const ics = generateIcs(
        {
          meeting_url: details.meeting_url,
          start: new Date(details.start),
          end: new Date(details.end),
          id: slot_id,
          created_at: new Date(),
          meeting_info_file_path: '',
          participants: participantsInfo,
          version: 0,
          related_slot_ids: [],
        },
        owner
      )

      if (!ics.value || ics.error) throw new Error('Error creating iCalString')

      const eventsToUpdate = events.filter(event => event.uid === slot_id)

      await Promise.all(
        eventsToUpdate.map(event => {
          return updateCalendarObject({
            calendarObject: {
              url: event.url,
              // according to https://datatracker.ietf.org/doc/html/rfc4791#section-4.1, Calendar object resources contained in calendar collections MUST NOT specify the iCalendar METHOD property.
              data: Buffer.from(ics.value!).toString('base64'),
              etag: event?.etag,
            },
            headers: this.headers,
          })
        })
      )

      return {
        uid: slot_id,
        id: slot_id,
        type: 'Cal Dav',
        password: '',
        url: '',
        additionalInfo: {},
      }
    } catch (reason) {
      Sentry.captureException(reason)
      throw reason
    }
  }
  async deleteEvent(slot_id: string): Promise<void> {
    try {
      const events = await this.getEventsByUID(slot_id)

      const eventsToDelete = events.filter(event => event.uid === slot_id)

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
      Sentry.captureException(reason)
      throw reason
    }
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string
  ): Promise<EventBusyDate[]> {
    const calendars = await this.listCalendars()

    const calendarObjectsFromEveryCalendar = (
      await Promise.all(
        calendars.map(calendar =>
          fetchCalendarObjects({
            calendar,
            headers: this.headers,
            expand: true,
            timeRange: {
              start: new Date(dateFrom).toISOString(),
              end: new Date(dateTo).toISOString(),
            },
          })
        )
      )
    ).flat()

    const events = calendarObjectsFromEveryCalendar
      .filter(e => !!e.data)
      .map(object => {
        const jcalData = ICAL.parse(object.data)
        const vcalendar = new ICAL.Component(jcalData)
        const vevent = vcalendar.getFirstSubcomponent('vevent')
        const event = new ICAL.Event(vevent)

        return {
          start: event.startDate.toJSDate().toISOString(),
          end: event.endDate.toJSDate().toISOString(),
        }
      })

    return Promise.resolve(events)
  }

  async listCalendars() {
    try {
      const account = await this.getAccount()

      const calendars = await fetchCalendars({
        account,
        headers: this.headers,
      })

      return calendars.reduce<DAVCalendar[]>((newCalendars, calendar) => {
        if (!calendar.components?.includes('VEVENT')) return newCalendars
        newCalendars.push(calendar)
        return newCalendars
      }, [])
    } catch (reason) {
      Sentry.captureException(reason)
      throw reason
    }
  }

  private async getEvents(
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
          const event = new ICAL.Event(vevent)

          const calendarTimezone =
            vcalendar
              .getFirstSubcomponent('vtimezone')
              ?.getFirstPropertyValue('tzid') || ''

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
            attendees: event.attendees.map((a: any) => a.getValues()),
            recurrenceId: event.recurrenceId,
            timezone: calendarTimezone,
          }
        })

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
      const calEvents = await this.getEvents(cal.url, null, null, [
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
}
