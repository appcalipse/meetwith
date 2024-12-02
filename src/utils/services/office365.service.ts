import * as Sentry from '@sentry/nextjs'

import {
  CalendarSyncInfo,
  NewCalendarEventType,
} from '@/types/CalendarConnections'
import { MeetingReminders } from '@/types/common'
import { TimeSlotSource } from '@/types/Meeting'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import { MeetingCreationSyncRequest } from '@/types/Requests'

import { noNoReplyEmailForAccount } from '../calendar_manager'
import { appUrl, NO_REPLY_EMAIL } from '../constants'
import {
  getOfficeEventMappingId,
  insertOfficeEventMapping,
  updateCalendarPayload,
} from '../database'
import { CalendarServiceHelper } from './calendar.helper'
import { CalendarService } from './calendar.service.types'

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

interface TokenResponse {
  access_token: string
  expires_in: number
}

export function handleErrorsResponse(
  response: Response,
  skipResponseProcess?: boolean
) {
  if (!response.ok) {
    response.json().then(console.error)
    throw Error(response.statusText)
  }
  if (skipResponseProcess) {
    return
  }
  return response.json()
}

export type EventBusyDate = Record<'start' | 'end', Date | string>

export type O365AuthCredentials = {
  expiry_date: number
  access_token: string
  refresh_token: string
}

export default class Office365CalendarService implements CalendarService {
  private auth: { getToken: () => Promise<string> }
  private email: string

  constructor(
    address: string,
    email: string,
    credential: O365AuthCredentials | string
  ) {
    this.auth = this.o365Auth(
      address,
      email,
      typeof credential === 'string' ? JSON.parse(credential) : credential
    )
    this.email = email
  }

  getConnectedEmail = () => this.email

  private o365Auth = (
    address: string,
    email: string,
    credential: O365AuthCredentials
  ) => {
    const isExpired = (expiryDate: number) =>
      // Giving 1 minute safety renewal for token to renew
      expiryDate < Math.round((new Date().getTime() - 1000 * 60) / 1000)

    const [client_secret, client_id] = [
      process.env.MS_GRAPH_CLIENT_SECRET!,
      process.env.MS_GRAPH_CLIENT_ID!,
    ]

    const refreshAccessToken = (refreshToken: string) => {
      return fetch(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            scope: 'User.Read Calendars.Read Calendars.ReadWrite',
            client_id,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
            client_secret,
          }),
        }
      )
        .then(handleErrorsResponse)
        .then((responseBody: TokenResponse) => {
          credential.access_token = responseBody.access_token
          credential.expiry_date = Math.round(
            new Date().getTime() / 1000 + responseBody.expires_in
          )
          return updateCalendarPayload(
            address,
            email,
            TimeSlotSource.OFFICE,
            credential
          ).then(() => {
            return credential.access_token
          })
        })
    }

    return {
      getToken: () =>
        !isExpired(credential.expiry_date)
          ? Promise.resolve(credential.access_token)
          : refreshAccessToken(credential.refresh_token),
    }
  }

  async refreshConnection(): Promise<CalendarSyncInfo[]> {
    const accessToken = await this.auth.getToken()

    const calendarsResponse = await fetch(
      'https://graph.microsoft.com/v1.0/me/calendars',
      {
        headers: { Authorization: 'Bearer ' + accessToken },
      }
    )

    const calendars = await calendarsResponse.json()

    const mapped = calendars.value.map((c: any) => {
      return {
        calendarId: c.id,
        name: c.name,
        sync: false,
        enabled: c.isDefaultCalendar,
        color: c.hexColor,
      }
    })

    return mapped
  }

  /**
   * Creates an event into the owner 365 calendar
   *
   * @param owner
   * @param meetingDetails
   * @returns
   */
  async createEvent(
    owner: string,
    meetingDetails: MeetingCreationSyncRequest,
    meeting_creation_time: Date,
    calendarId: string
  ): Promise<NewCalendarEventType> {
    try {
      const accessToken = await this.auth.getToken()

      const body = JSON.stringify(
        this.translateEvent(
          owner,
          meetingDetails,
          meetingDetails.meeting_id,
          meeting_creation_time
        )
      )

      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + accessToken,
            'Content-Type': 'application/json',
          },
          body,
        }
      )

      const event = await handleErrorsResponse(response)
      await insertOfficeEventMapping(event.id, meetingDetails.meeting_id)

      return event
    } catch (error) {
      Sentry.captureException(error)
      throw error
    }
  }

  async updateEvent(
    owner: string,
    meeting_id: string,
    meetingDetails: MeetingCreationSyncRequest,
    calendarId: string
  ): Promise<NewCalendarEventType> {
    try {
      const accessToken = await this.auth.getToken()
      const officeId = await getOfficeEventMappingId(meeting_id)
      const body = JSON.stringify({
        ...this.translateEvent(owner, meetingDetails, meeting_id, new Date()),
        id: officeId,
      })

      if (!officeId) {
        Sentry.captureException("Can't find office event mapping")
        throw new Error("Can't find office event mapping")
      }
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events/${officeId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: 'Bearer ' + accessToken,
            'Content-Type': 'application/json',
          },
          body,
        }
      )

      return handleErrorsResponse(response)
    } catch (error) {
      Sentry.captureException(error)
      throw error
    }
  }

  async deleteEvent(meeting_id: string, calendarId: string): Promise<void> {
    try {
      const accessToken = await this.auth.getToken()

      const officeId = await getOfficeEventMappingId(meeting_id)

      if (!officeId) {
        Sentry.captureException("Can't find office event mapping")
        return
      }

      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events/${officeId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer ' + accessToken,
            'Content-Type': 'application/json',
          },
        }
      )

      return handleErrorsResponse(response, true)
    } catch (error) {
      Sentry.captureException(error)
      throw error
    }
  }
  private createReminder(indicator: MeetingReminders) {
    switch (indicator) {
      case MeetingReminders['15_MINUTES_BEFORE']:
        return 15
      case MeetingReminders['30_MINUTES_BEFORE']:
        return 30
      case MeetingReminders['1_HOUR_BEFORE']:
        return 60
      case MeetingReminders['1_DAY_BEFORE']:
        return 1440
      case MeetingReminders['1_WEEK_BEFORE']:
        return 10080
      case MeetingReminders['10_MINUTES_BEFORE']:
      default:
        return 10
    }
  }
  private translateEvent = (
    calendarOwnerAccountAddress: string,
    details: MeetingCreationSyncRequest,
    meeting_id: string,
    meeting_creation_time: Date
  ) => {
    const participantsInfo: ParticipantInfo[] = details.participants.map(
      participant => ({
        type: participant.type,
        name: participant.name,
        account_address: participant.account_address,
        status: participant.status,
        slot_id: '',
        meeting_id,
      })
    )

    const slot_id = details.participants.filter(
      p => p.account_address === calendarOwnerAccountAddress
    )[0].slot_id

    const payload: Record<string, any> = {
      subject: CalendarServiceHelper.getMeetingTitle(
        calendarOwnerAccountAddress,
        participantsInfo,
        details.title
      ),
      body: {
        contentType: 'TEXT',
        content: CalendarServiceHelper.getMeetingSummary(
          details.content,
          details.meeting_url,
          `${appUrl}/dashboard/meetings?slotId=${slot_id}`
        ),
      },
      start: {
        dateTime: new Date(details.start).toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: new Date(details.end).toISOString(),
        timeZone: 'UTC',
      },
      createdDateTime: new Date(meeting_creation_time).toISOString(),
      location: {
        displayName: details.meeting_url,
      },
      organizer: {
        emailAddress: {
          name: 'Meetwith',
          address: NO_REPLY_EMAIL,
        },
      },
      attendees: [],
      allowNewTimeProposals: false,
      transactionId: meeting_id, // avoid duplicating the event if we make more than one request with the same transactionId
    }
    if (details.meetingReminders) {
      payload.isReminderOn = true
      const lowestReminder = details.meetingReminders.reduce((prev, current) =>
        prev < current ? prev : current
      )
      payload.reminderMinutesBeforeStart = this.createReminder(lowestReminder)
    }
    for (const participant of details.participants) {
      ;(payload.attendees as any).push({
        emailAddress: {
          name: participant.name || participant.account_address,
          address:
            calendarOwnerAccountAddress === participant.account_address
              ? this.getConnectedEmail()
              : participant.guest_email ||
                noNoReplyEmailForAccount(
                  (participant.name || participant.account_address)!
                ),
        },
      })
    }

    return payload
  }

  async getAvailability(
    calendarIds: string[],
    dateFrom: string,
    dateTo: string
  ): Promise<EventBusyDate[]> {
    const dateFromParsed = new Date(dateFrom)
    const dateToParsed = new Date(dateTo)

    const filter = `?startdatetime=${encodeURIComponent(
      dateFromParsed.toISOString()
    )}&enddatetime=${encodeURIComponent(dateToParsed.toISOString())}&$top=500`

    const promises: Promise<EventBusyDate[]>[] = []

    calendarIds.forEach(async calendarId => {
      promises.push(
        new Promise(async (resolve, reject) => {
          try {
            const accessToken = await this.auth.getToken()

            // TODO: consider proper pagination https://docs.microsoft.com/en-us/graph/api/calendar-list-calendarview?view=graph-rest-1.0&tabs=http#response
            // not only the first 500 events
            const eventsResponse = await fetch(
              `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/calendarView${filter}`,
              {
                method: 'GET',
                headers: {
                  Authorization: 'Bearer ' + accessToken,
                  'Content-Type': 'application/json',
                },
              }
            )
            const eventsJson = await handleErrorsResponse(eventsResponse)

            resolve(
              eventsJson.value.map((evt: any) => {
                return {
                  start: evt.start.dateTime + 'Z',
                  end: evt.end.dateTime + 'Z',
                }
              })
            )
          } catch (err) {
            Sentry.captureException(err)
            reject()
          }
        })
      )
    })

    const result = await Promise.all(promises)

    return result.flat()
  }
}
