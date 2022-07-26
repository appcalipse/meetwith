import * as Sentry from '@sentry/browser'
import { GetTokenResponse } from 'google-auth-library/build/src/auth/oauth2client'
import { Auth, calendar_v3, google } from 'googleapis'

import { NewCalendarEventType } from '@/types/CalendarConnections'
import {
  MeetingCreationRequest,
  ParticipantInfo,
  TimeSlotSource,
} from '@/types/Meeting'

import { apiUrl } from '../constants'
import { changeConnectedCalendarSync } from '../database'
import { CalendarServiceHelper } from './calendar.helper'
import { CalendarService } from './common.types'

export type EventBusyDate = Record<'start' | 'end', Date | string>

export class MWWGoogleAuth extends google.auth.OAuth2 {
  constructor(client_id: string, client_secret: string, redirect_uri?: string) {
    super(client_id, client_secret, redirect_uri)
  }

  isTokenExpiring() {
    return super.isTokenExpiring()
  }

  async refreshToken(token: string | null | undefined) {
    return super.refreshToken(token)
  }
}

export default class GoogleCalendarService implements CalendarService {
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
            TimeSlotSource.GOOGLE,
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
    calendarOwnerAccountAddress: string,
    details: MeetingCreationRequest,
    slot_id: string,
    meeting_creation_time: Date
  ): Promise<NewCalendarEventType> {
    return new Promise((resolve, reject) =>
      this.auth.getToken().then(myGoogleAuth => {
        const participantsInfo: ParticipantInfo[] =
          details.participants_mapping.map(participant => ({
            type: participant.type,
            name: participant.name,
            account_address: participant.account_address,
            status: participant.status,
            slot_id,
          }))

        const payload: calendar_v3.Schema$Event = {
          summary: CalendarServiceHelper.getMeetingTitle(
            calendarOwnerAccountAddress,
            participantsInfo
          ),
          description: CalendarServiceHelper.getMeetingSummary(
            details.content,
            details.meeting_url
          ),
          start: {
            dateTime: new Date(details.start).toISOString(),
            timeZone: 'UTC',
          },
          end: {
            dateTime: new Date(details.end).toISOString(),
            timeZone: 'UTC',
          },
          created: new Date(meeting_creation_time).toISOString(),
          attendees: [],
          reminders: {
            useDefault: false,
            overrides: [{ method: 'email', minutes: 10 }],
          },
          creator: {
            displayName: 'Meet With Wallet',
          },
        }

        if (details.meeting_url) {
          payload['location'] = details.meeting_url
        }

        const guest = details.participants_mapping.find(
          participant => participant.guest_email
        )

        if (guest) {
          payload.attendees!.push({
            email: guest.guest_email,
            displayName: guest.name,
            responseStatus: 'accepted',
          })
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
              uid: slot_id,
              ...event.data,
              id: slot_id,
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
    dateTo: string
  ): Promise<EventBusyDate[]> {
    return new Promise((resolve, reject) =>
      this.auth.getToken().then(myGoogleAuth => {
        const calendar = google.calendar({
          version: 'v3',
          auth: myGoogleAuth,
        })

        Promise.resolve(['primary'])
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
