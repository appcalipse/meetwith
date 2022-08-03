import * as Sentry from '@sentry/node'
import {
  createAccount,
  createCalendarObject,
  DAVAccount,
  DAVCalendar,
  fetchCalendarObjects,
  fetchCalendars,
  getBasicAuthHeaders,
} from 'tsdav'

import { NewCalendarEventType } from '@/types/CalendarConnections'
import { MeetingCreationRequest, ParticipantInfo } from '@/types/Meeting'

import { generateIcs } from '../calendar_manager'
import { decryptContent } from '../cryptography'
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
