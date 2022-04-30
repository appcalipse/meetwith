import * as Sentry from '@sentry/browser'
import { differenceInMinutes } from 'date-fns'
import { DateArray, DurationObject } from 'ics'
import { createEvent } from 'ics'
import {
  createAccount,
  createCalendarObject,
  DAVAccount,
  DAVCalendar,
  fetchCalendarObjects,
  fetchCalendars,
  getBasicAuthHeaders,
} from 'tsdav'
import { v4 as uuidv4 } from 'uuid'

import { NewCalendarEventType } from '@/types/CalendarConnections'
import { MeetingCreationRequest } from '@/types/Meeting'

import { decryptContent } from '../cryptography'
import { CalendarServiceHelper } from './calendar.helper'
import { CalendarService } from './common.types'

// ical.js has no ts typing
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ICAL = require('ical.js')

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

export const convertDate = (date: Date): DateArray => {
  return [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
  ] as DateArray
}

export const getDuration = (
  start: string | Date,
  end: string | Date
): DurationObject => ({
  minutes: differenceInMinutes(new Date(end), new Date(start)),
})

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
    owner: string,
    details: MeetingCreationRequest
  ): Promise<NewCalendarEventType> {
    try {
      const calendars = await this.listCalendars()
      const uid = uuidv4()

      // We need to create local ICS files
      const { error, value: iCalString } = createEvent({
        uid,
        startInputType: 'utc',
        start: convertDate(new Date(details.start)),
        duration: getDuration(details.start, details.end),
        title: CalendarServiceHelper.getMeetingSummary(owner, details),
        url: details.meeting_url,
        description: CalendarServiceHelper.getMeetingTitle(details),
        location: CalendarServiceHelper.getMeetingLocation(),
        organizer: {
          // required by some services
          name: 'Meet With Wallet',
          email: 'contact@meetwithwallet.xyz',
        },
        /** according to https://datatracker.ietf.org/doc/html/rfc2446#section-3.2.1, in a published iCalendar component.
         * "Attendees" MUST NOT be present
         * `attendees: this.getAttendees(event.attendees),`
         */
      })

      if (error || !iCalString) throw new Error('Error creating iCalString')

      // We create the event directly on iCal
      const responses = await Promise.all(
        calendars.map(calendar =>
          createCalendarObject({
            calendar,
            filename: `${uid}.ics`,
            // according to https://datatracker.ietf.org/doc/html/rfc4791#section-4.1, Calendar object resources contained in calendar collections MUST NOT specify the iCalendar METHOD property.
            iCalString,
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
        uid,
        id: uid,
        type: 'Apple',
        password: '',
        url: '',
        additionalInfo: {},
      }
    } catch (reason) {
      Sentry.captureException(reason)
      throw reason
    }
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    calendarId: string
  ): Promise<EventBusyDate[]> {
    const objects = (
      await Promise.all(
        [calendarId].map(sc =>
          fetchCalendarObjects({
            calendar: {
              url: sc,
            },
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

    const events = objects
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
