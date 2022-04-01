import * as Sentry from '@sentry/browser'
import { GetTokenResponse } from 'google-auth-library/build/src/auth/oauth2client'
import { Auth, calendar_v3, google } from 'googleapis'

import {
  ConnectedCalendarProvider,
  NewCalendarEventType,
} from '../../types/CalendarConnections'
import { MeetingCreationRequest } from '../../types/Meeting'
import { apiUrl } from '../constants'
import { changeConnectedCalendarSync } from '../database'
import { ellipsizeAddress } from '../user_manager'
import { MWWGoogleAuth } from './google_auth'

export interface Calendar {
  createEvent(
    owner: string,
    details: MeetingCreationRequest
  ): Promise<NewCalendarEventType>
}

export interface IntegrationCalendar {
  externalId: string
  integration: string
  name: string
  primary: boolean
}

export type EventBusyDate = Record<'start' | 'end', Date | string>

export default class GoogleCalendarService implements Calendar {
  private auth: { getToken: () => Promise<MWWGoogleAuth> }

  constructor(
    address: string,
    email: string,
    credential: Auth.Credentials | string
  ) {
    this.auth = this.googleAuth(
      address,
      email,
      typeof credential === 'string' ? JSON.parse(credential) : credential
    )
  }

  private googleAuth = (
    address: string,
    email: string,
    googleCredentials: Auth.Credentials
  ) => {
    const [client_secret, client_id] = [
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.GOOGLE_CLIENT_ID!,
    ]
    const redirect_uri = `${apiUrl}/secure/calendar_integrations/google/callback`

    const myGoogleAuth = new MWWGoogleAuth(
      client_id,
      client_secret,
      redirect_uri
    )
    myGoogleAuth.setCredentials(googleCredentials)

    const isExpired = () => {
      const expired = myGoogleAuth.isTokenExpiring()
      return expired
    }

    const refreshAccessToken = () =>
      myGoogleAuth
        .refreshToken(googleCredentials.refresh_token)
        .then((res: GetTokenResponse) => {
          const token = res.res?.data
          googleCredentials.access_token = token.access_token
          googleCredentials.expiry_date = token.expiry_date

          return changeConnectedCalendarSync(
            address,
            email,
            ConnectedCalendarProvider.GOOGLE,
            undefined,
            googleCredentials
          ).then(() => {
            myGoogleAuth.setCredentials(googleCredentials)
            return myGoogleAuth
          })
        })
        .catch(err => {
          Sentry.captureException(err)
          return myGoogleAuth
        })

    return {
      getToken: () =>
        !isExpired() ? Promise.resolve(myGoogleAuth) : refreshAccessToken(),
    }
  }

  async createEvent(
    owner: string,
    details: MeetingCreationRequest
  ): Promise<NewCalendarEventType> {
    return new Promise((resolve, reject) =>
      this.auth.getToken().then(myGoogleAuth => {
        const otherParticipants = [
          details.participants_mapping
            ?.filter(it => it.account_address !== owner)
            .map(it =>
              it.account_address
                ? ellipsizeAddress(it.account_address!)
                : it.guest_email
            ),
        ]
        const payload: calendar_v3.Schema$Event = {
          summary: `Meet with ${
            otherParticipants.length
              ? otherParticipants.join(', ')
              : 'other participants'
          }`,
          description: `${
            details.content ? details.content + '\n' : ''
          }Your meeting will happen at ${details.meeting_url}`,
          start: {
            dateTime: new Date(details.start).toISOString(),
            timeZone: 'UTC',
          },
          end: {
            dateTime: new Date(details.end).toISOString(),
            timeZone: 'UTC',
          },
          attendees: [],
          reminders: {
            useDefault: false,
            overrides: [{ method: 'email', minutes: 10 }],
          },
          // https://lukeboyle.com/blog/posts/google-calendar-api-color-id
          colorId: '6',
          creator: {
            displayName: 'Meet With Wallet',
          },
        }

        if (details.meeting_url) {
          payload['location'] = 'Online @ Meet With Wallet'
        }

        const calendar = google.calendar({
          version: 'v3',
          auth: myGoogleAuth,
        })

        calendar.events.insert(
          {
            auth: myGoogleAuth,
            calendarId: 'primary',
            requestBody: payload,
            conferenceDataVersion: 1,
          },
          function (err, event) {
            if (err || !event?.data) {
              console.error(
                'There was an error contacting google calendar service: ',
                err
              )
              console.error(err)
              return reject(err)
            }
            return resolve({
              uid: '',
              ...event.data,
              id: event.data.id || '',
              additionalInfo: {
                hangoutLink: event.data.hangoutLink || '',
              },
              type: 'google_calendar',
              password: '',
              url: '',
            })
          }
        )
      })
    )
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    calendarId: string
  ): Promise<EventBusyDate[]> {
    return new Promise((resolve, reject) =>
      this.auth.getToken().then(myGoogleAuth => {
        const calendar = google.calendar({
          version: 'v3',
          auth: myGoogleAuth,
        })

        Promise.resolve([calendarId])
          .then(calsIds => {
            calendar.freebusy.query(
              {
                requestBody: {
                  timeMin: dateFrom,
                  timeMax: dateTo,
                  items: calsIds.map(id => ({ id: id })),
                },
              },
              (err, apires) => {
                if (err) {
                  reject(err)
                }
                let result: any = []

                if (apires?.data.calendars) {
                  result = Object.values(apires.data.calendars).reduce(
                    (c, i) => {
                      i.busy?.forEach(busyTime => {
                        c.push({
                          start: busyTime.start || '',
                          end: busyTime.end || '',
                        })
                      })
                      return c
                    },
                    [] as typeof result
                  )
                }
                resolve(result)
              }
            )
          })
          .catch(err => {
            Sentry.captureException(err)
            reject(err)
          })
      })
    )
  }
}
