import * as Sentry from '@sentry/browser'
import dayjs from 'dayjs'
import { DateArray, DurationObject, Person } from 'ics'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ICAL = require('ical.js')

import { createEvent } from 'ics'
import {
  createAccount,
  createCalendarObject,
  DAVAccount,
  deleteCalendarObject,
  fetchCalendarObjects,
  fetchCalendars,
  getBasicAuthHeaders,
  updateCalendarObject,
} from 'tsdav'
import { v4 as uuidv4 } from 'uuid'

import {
  ConnectedCalendarProvider,
  NewCalendarEventType,
} from '../../types/CalendarConnections'
import { MeetingCreationRequest } from '../../types/Meeting'
import { apiUrl } from '../constants'
import { changeConnectedCalendarSync } from '../database'
import { ellipsizeAddress } from '../user_manager'
import { MWWGoogleAuth } from './google_auth'

export const CALDAV_CALENDAR_TYPE = 'caldav'

import toArray from 'dayjs/plugin/toArray'
import utc from 'dayjs/plugin/utc'
dayjs.extend(toArray)
dayjs.extend(utc)

export interface Calendar {
  createEvent(
    owner: string,
    details: MeetingCreationRequest
  ): Promise<NewCalendarEventType>
}

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

export interface IntegrationCalendar {
  externalId: string
  integration: string
  name: string
  primary: boolean
}

interface TokenResponse {
  access_token: string
  expires_in: number
}

export const convertDate = (date: string): DateArray =>
  dayjs(date)
    .utc()
    .toArray()
    .slice(0, 6)
    .map((v, i) => (i === 1 ? v + 1 : v)) as DateArray

export const getDuration = (
  start: string | Date,
  end: string | Date
): DurationObject => ({
  minutes: dayjs(end).diff(dayjs(start), 'minute'),
})

export function handleErrorsJson(response: Response) {
  if (!response.ok) {
    response.json().then(console.log)
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

export default class AppleCalendarService implements Calendar {
  private url = ''
  private credentials: Record<string, string> = {}
  private headers: Record<string, string> = {}

  constructor(
    address: string,
    email: string,
    credential: CaldavCredentials,
    url?: string
  ) {
    // todo make sure that this is encrypted
    const {
      username,
      password,
      url: credentialURL,
    } = typeof credential === 'string' ? JSON.parse(credential) : credential

    this.url = url || credentialURL

    this.credentials = { username, password }
    this.headers = getBasicAuthHeaders({ username, password })
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
      const otherParticipants = [
        details.participants_mapping
          ?.filter(it => it.account_address !== owner)
          .map(it =>
            it.account_address
              ? ellipsizeAddress(it.account_address!)
              : it.guest_email
          ),
      ]

      // We create local ICS files
      const { error, value: iCalString } = createEvent({
        uid,
        startInputType: 'utc',
        start: convertDate(new Date(details.start).toISOString()),
        duration: getDuration(details.start, details.end),
        title: `Meet with ${
          otherParticipants.length
            ? otherParticipants.join(', ')
            : 'other participants'
        }`,
        description: `${
          details.content ? details.content + '\n' : ''
        }Your meeting will happen at ${details.meeting_url}`,
        location: 'Online @ Meet With Wallet',
        //organizer: { name:  },
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
            calendar: {
              url: calendar.externalId,
            },
            filename: `${uid}.ics`,
            // according to https://datatracker.ietf.org/doc/html/rfc4791#section-4.1, Calendar object resources contained in calendar collections MUST NOT specify the iCalendar METHOD property.
            iCalString: iCalString.replace(/METHOD:[^\r\n]+\r\n/g, ''),
            headers: this.headers,
          })
        )
      )

      if (responses.some(r => !r.ok)) {
        throw new Error(
          `Error creating event: ${(
            await Promise.all(responses.map(r => r.text()))
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
      console.error(reason)

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

  async listCalendars(): Promise<IntegrationCalendar[]> {
    try {
      const account = await this.getAccount()

      const calendars = await fetchCalendars({
        account,
        headers: this.headers,
      })

      return calendars.reduce<IntegrationCalendar[]>(
        (newCalendars, calendar) => {
          if (!calendar.components?.includes('VEVENT')) return newCalendars

          newCalendars.push({
            externalId: calendar.url,
            name: calendar.displayName ?? '',
            primary: false,
            integration: 'Apple',
          })
          return newCalendars
        },
        []
      )
    } catch (reason) {
      console.error(reason)

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
