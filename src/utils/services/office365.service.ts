import * as Sentry from '@sentry/browser'

import {
  ConnectedCalendarProvider,
  NewCalendarEventType,
} from '@/types/CalendarConnections'
import { MeetingCreationRequest } from '@/types/Meeting'

import { changeConnectedCalendarSync } from '../database'
import { ellipsizeAddress } from '../user_manager'
import { CalendarServiceHelper } from './calendar.helper'
import { CalendarService } from './common.types'

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

export function handleErrorsJson(response: Response) {
  if (!response.ok) {
    response.json().then(console.error)
    throw Error(response.statusText)
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
  }

  private o365Auth = (
    address: string,
    email: string,
    credential: O365AuthCredentials
  ) => {
    const isExpired = (expiryDate: number) =>
      expiryDate < Math.round(new Date().getTime() / 1000)

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
        .then(handleErrorsJson)
        .then((responseBody: TokenResponse) => {
          credential.access_token = responseBody.access_token
          credential.expiry_date = Math.round(
            new Date().getTime() / 1000 + responseBody.expires_in
          )
          return changeConnectedCalendarSync(
            address,
            email,
            ConnectedCalendarProvider.OFFICE,
            undefined,
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

  /**
   * Creates an event into the owner 365 calendar
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
      const accessToken = await this.auth.getToken()

      const calendarId = '' // required?
      const body = JSON.stringify(this.translateEvent(owner, details))

      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/calendar/${calendarId}events`,
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + accessToken,
            'Content-Type': 'application/json',
          },
          body,
        }
      )

      return handleErrorsJson(response)
    } catch (error) {
      Sentry.captureException(error)
      throw error
    }
  }

  private translateEvent = (owner: string, details: MeetingCreationRequest) => {
    const otherParticipants = [
      details.participants_mapping
        ?.filter(it => it.account_address !== owner)
        .map(it =>
          it.account_address
            ? ellipsizeAddress(it.account_address!)
            : it.guest_email
        ),
    ]

    return {
      subject: CalendarServiceHelper.getMeetingSummary(owner, details),
      body: {
        contentType: 'TEXT',
        content: CalendarServiceHelper.getMeetingTitle(details),
      },
      start: {
        dateTime: new Date(details.start).toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: new Date(details.end).toISOString(),
        timeZone: 'UTC',
      },
      location: {
        displayName: CalendarServiceHelper.getMeetingLocation(),
      },
      isOnlineMeeting: true,
      onlineMeetingUrl: details.meeting_url,
      onlineMeeting: {
        conferenceId: `${new Date().getTime()}`,
        joinUrl: details.meeting_url,
      },
    }
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    calendarId: string
  ): Promise<EventBusyDate[]> {
    const dateFromParsed = new Date(dateFrom)
    const dateToParsed = new Date(dateTo)

    const filter = `?startdatetime=${encodeURIComponent(
      dateFromParsed.toISOString()
    )}&enddatetime=${encodeURIComponent(dateToParsed.toISOString())}`
    return this.auth
      .getToken()
      .then(accessToken => {
        return Promise.resolve([calendarId]).then(ids => {
          const requests = ids.map((calendarId, id) => ({
            id,
            method: 'GET',
            url: `/me/calendars/${calendarId}/calendarView${filter}`,
          }))

          return fetch('https://graph.microsoft.com/v1.0/$batch', {
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + accessToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ requests }),
          })
            .then(handleErrorsJson)
            .then((responseBody: BatchResponse) =>
              responseBody.responses.reduce(
                (acc: BufferedBusyTime[], subResponse) =>
                  subResponse.body.value &&
                  acc.concat(
                    subResponse.body.value.map(evt => {
                      return {
                        start: evt.start.dateTime + 'Z',
                        end: evt.end.dateTime + 'Z',
                      }
                    })
                  ),
                []
              )
            )
        })
      })
      .catch(err => {
        Sentry.captureException(err)
        return Promise.reject([])
      })
  }
}
