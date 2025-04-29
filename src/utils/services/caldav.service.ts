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
import { v4 } from 'uuid'

import {
  CalendarSyncInfo,
  NewCalendarEventType,
} from '@/types/CalendarConnections'
import { Intents } from '@/types/Dashboard'
import { MeetingChangeType } from '@/types/Meeting'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import { MeetingCreationSyncRequest } from '@/types/Requests'

import { generateIcs } from '../calendar_manager'
import { appUrl } from '../constants'
import { decryptContent, mockEncrypted } from '../cryptography'
import { CalendarService } from './calendar.service.types'

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
    calendarId?: string
  ): Promise<NewCalendarEventType> {
    try {
      const calendars = await this.listCalendars()

      const calendarToSync = calendarId
        ? calendars.find(c => c.url === calendarId)
        : calendars[0]

      const participantsInfo: ParticipantInfo[] =
        meetingDetails.participants.map(participant => ({
          type: participant.type,
          name: participant.name,
          account_address: participant.account_address,
          status: participant.status,
          slot_id: participant.slot_id,
          meeting_id: meetingDetails.meeting_id,
        }))

      const slot_id = meetingDetails.participants.filter(
        p => p.account_address === calendarOwnerAccountAddress
      )[0].slot_id

      try {
        const ics = generateIcs(
          {
            meeting_url: meetingDetails.meeting_url,
            start: new Date(meetingDetails.start),
            end: new Date(meetingDetails.end),
            id: meetingDetails.meeting_id,
            meeting_id: meetingDetails.meeting_id,
            created_at: new Date(meeting_creation_time),
            participants: participantsInfo,
            version: 0,
            related_slot_ids: [],
            meeting_info_encrypted: mockEncrypted,
            reminders: meetingDetails.meetingReminders,
            recurrence: meetingDetails.meetingRepeat,
          },
          calendarOwnerAccountAddress,
          MeetingChangeType.CREATE,
          `${appUrl}/dashboard/schedule?meetingId=${slot_id}&intent=${Intents.UPDATE_MEETING}`,
          false,
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
        Sentry.captureException(err)
        //Fastmail issue that doesn't accept attendees
        const ics = generateIcs(
          {
            meeting_url: meetingDetails.meeting_url,
            start: new Date(meetingDetails.start),
            end: new Date(meetingDetails.end),
            id: meetingDetails.meeting_id,
            meeting_id: meetingDetails.meeting_id,
            created_at: new Date(meeting_creation_time),
            participants: participantsInfo,
            version: 0,
            related_slot_ids: [],
            meeting_info_encrypted: mockEncrypted,
          },
          calendarOwnerAccountAddress,
          MeetingChangeType.CREATE,
          `${appUrl}/dashboard/schedule?meetingId=${slot_id}&intent=${Intents.UPDATE_MEETING}`,
          true
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
        uid: meetingDetails.meeting_id,
        id: meetingDetails.meeting_id,
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
    calendarOwnerAccountAddress: string,
    meeting_id: string,
    meetingDetails: MeetingCreationSyncRequest,
    calendarId: string
  ): Promise<NewCalendarEventType> {
    try {
      const events = await this.getEventsByUID(meeting_id)

      const participantsInfo: ParticipantInfo[] =
        meetingDetails.participants.map(participant => ({
          type: participant.type,
          name: participant.name,
          account_address: participant.account_address,
          status: participant.status,
          slot_id: participant.slot_id,
          meeting_id,
        }))

      const slot_id = meetingDetails.participants.filter(
        p => p.account_address === calendarOwnerAccountAddress
      )[0].slot_id

      const ics = generateIcs(
        {
          meeting_url: meetingDetails.meeting_url,
          start: new Date(meetingDetails.start),
          end: new Date(meetingDetails.end),
          id: meeting_id,
          created_at: new Date(),
          participants: participantsInfo,
          version: 0,
          related_slot_ids: [],
          meeting_id,
          meeting_info_encrypted: mockEncrypted,
          reminders: meetingDetails.meetingReminders,
          recurrence: meetingDetails.meetingRepeat,
        },
        calendarOwnerAccountAddress,
        MeetingChangeType.UPDATE,
        `${appUrl}/dashboard/schedule?meetingId=${slot_id}&intent=${Intents.UPDATE_MEETING}`,
        false,
        {
          accountAddress: calendarOwnerAccountAddress,
          email: this.getConnectedEmail(),
        }
      )

      if (!ics.value || ics.error) throw new Error('Error creating iCalString')

      const eventToUpdate = events.filter(event => event.uid === meeting_id)[0]

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
        const ics2 = generateIcs(
          {
            meeting_url: meetingDetails.meeting_url,
            start: new Date(meetingDetails.start),
            end: new Date(meetingDetails.end),
            id: meeting_id,
            created_at: new Date(),
            participants: participantsInfo,
            version: 0,
            related_slot_ids: [],
            meeting_id,
            meeting_info_encrypted: mockEncrypted,
          },
          calendarOwnerAccountAddress,
          MeetingChangeType.UPDATE,
          `${appUrl}/dashboard/schedule?meetingId=${slot_id}&intent=${Intents.UPDATE_MEETING}`,
          true
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
        uid: meeting_id,
        id: meeting_id,
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
  async deleteEvent(meeting_id: string, calendarId: string): Promise<void> {
    try {
      const events = await this.getEventsByUID(meeting_id)

      const eventsToDelete = events.filter(event => event.uid === meeting_id)

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

  async setupCalendarWebhook(
    calendarId: string,
    calendarOwnerAddress: string
  ): Promise<void> {}

  async getAvailability(
    calendarIds: string[],
    dateFrom: string,
    dateTo: string
  ): Promise<EventBusyDate[]> {
    const calendars = await this.listCalendars()

    const calendarObjectsFromEveryCalendar = (
      await Promise.all(
        calendars
          .filter(cal => calendarIds.includes(cal.url!))
          .map(calendar =>
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
