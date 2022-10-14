import * as Sentry from '@sentry/nextjs'
import { GetTokenResponse } from 'google-auth-library/build/src/auth/oauth2client'
import { Auth, calendar_v3, google } from 'googleapis'

import {
  CalendarSyncInfo,
  NewCalendarEventType,
} from '@/types/CalendarConnections'
import { TimeSlotSource } from '@/types/Meeting'
import { ParticipantInfo, ParticipationStatus } from '@/types/ParticipantInfo'
import { MeetingCreationSyncRequest } from '@/types/Requests'

import { noNoReplyEmailForAccount } from '../calendar_manager'
import { apiUrl, NO_REPLY_EMAIL } from '../constants'
import { updateCalendarPayload } from '../database'
import { CalendarServiceHelper } from './calendar.helper'
import { CalendarService } from './calendar.service.types'

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

          return updateCalendarPayload(
            address,
            email,
            TimeSlotSource.GOOGLE,
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

  async refreshConnection(): Promise<CalendarSyncInfo[]> {
    const myGoogleAuth = await this.auth.getToken()
    const calendar = google.calendar({
      version: 'v3',
      auth: myGoogleAuth,
    })

    try {
      const calendarList = (await calendar.calendarList.list()).data

      const calendars: CalendarSyncInfo[] = calendarList.items!.map(c => {
        return {
          calendarId: c.etag!,
          name: c.summary!,
          color: c.backgroundColor || undefined,
          sync: false,
          enabled: Boolean(c.primary),
        }
      })
      return calendars
    } catch (err) {
      const info = google.oauth2({
        version: 'v2',
        auth: myGoogleAuth,
      })
      const user = (await info.userinfo.get()).data
      return [
        {
          calendarId: user.email!,
          name: user.email!,
          color: undefined,
          sync: false,
          enabled: true,
        },
      ]
    }
  }

  async createEvent(
    calendarOwnerAccountAddress: string,
    meetingDetails: MeetingCreationSyncRequest,
    meeting_id: string,
    meeting_creation_time: Date,
    calendarId?: string
  ): Promise<NewCalendarEventType> {
    return new Promise((resolve, reject) =>
      this.auth.getToken().then(myGoogleAuth => {
        const participantsInfo: ParticipantInfo[] =
          meetingDetails.participants.map(participant => ({
            type: participant.type,
            name: participant.name,
            account_address: participant.account_address,
            status: participant.status,
            slot_id: '',
            meeting_id,
          }))

        const payload: calendar_v3.Schema$Event = {
          // yes, google event ids allows only letters and numbers
          id: meeting_id.replaceAll('-', ''), // required to edit events later
          summary: CalendarServiceHelper.getMeetingTitle(
            calendarOwnerAccountAddress,
            participantsInfo
          ),
          description: CalendarServiceHelper.getMeetingSummary(
            meetingDetails.content,
            meetingDetails.meeting_url
          ),
          start: {
            dateTime: new Date(meetingDetails.start).toISOString(),
            timeZone: 'UTC',
          },
          end: {
            dateTime: new Date(meetingDetails.end).toISOString(),
            timeZone: 'UTC',
          },
          created: new Date(meeting_creation_time).toISOString(),
          attendees: [],
          reminders: {
            useDefault: false,
            overrides: [{ method: 'email', minutes: 10 }],
          },
          creator: {
            displayName: 'Meet with Wallet',
            email: NO_REPLY_EMAIL,
          },
          guestsCanModify: false,
          conferenceData: {
            entryPoints: [
              {
                entryPointType: 'video',
                uri: meetingDetails.meeting_url,
              },
            ],
          },
          status: 'confirmed',
        }

        if (meetingDetails.meeting_url) {
          payload['location'] = meetingDetails.meeting_url
        }

        for (const participant of meetingDetails.participants) {
          payload.attendees!.push({
            email:
              participant.guest_email ||
              noNoReplyEmailForAccount(participant.account_address!),
            displayName: participant.name || participant.account_address,
            responseStatus:
              participant.status === ParticipationStatus.Accepted
                ? 'accepted'
                : participant.status === ParticipationStatus.Rejected
                ? 'declined'
                : 'needsAction',
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
              uid: meeting_id,
              ...event.data,
              id: meeting_id,
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

  async updateEvent(
    calendarOwnerAccountAddress: string,
    meeting_id: string,
    meetingDetails: MeetingCreationSyncRequest,
    calendarId?: string
  ): Promise<NewCalendarEventType> {
    return new Promise(async (resolve, reject) => {
      const auth = await this.auth
      const myGoogleAuth = await auth.getToken()
      const participantsInfo: ParticipantInfo[] =
        meetingDetails.participants.map(participant => ({
          type: participant.type,
          name: participant.name,
          account_address: participant.account_address,
          status: participant.status,
          slot_id: '',
          meeting_id,
        }))

      const payload: calendar_v3.Schema$Event = {
        id: meeting_id.replaceAll('-', ''), // required to edit events later
        summary: CalendarServiceHelper.getMeetingTitle(
          calendarOwnerAccountAddress,
          participantsInfo
        ),
        description: CalendarServiceHelper.getMeetingSummary(
          meetingDetails.content,
          meetingDetails.meeting_url
        ),
        start: {
          dateTime: new Date(meetingDetails.start).toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: new Date(meetingDetails.end).toISOString(),
          timeZone: 'UTC',
        },
        attendees: [],
        reminders: {
          useDefault: false,
          overrides: [{ method: 'email', minutes: 10 }],
        },
        creator: {
          displayName: 'Meet With Wallet',
        },
      }

      if (meetingDetails.meeting_url) {
        payload['location'] = meetingDetails.meeting_url
      }

      const guest = meetingDetails.participants.find(
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
      calendar.events.update(
        {
          auth: myGoogleAuth,
          calendarId: 'primary',
          eventId: meeting_id,
          sendNotifications: true,
          sendUpdates: 'all',
          requestBody: payload,
        },
        function (err, event) {
          if (err) {
            console.error(
              'There was an error contacting google calendar service: ',
              err
            )

            return reject(err)
          }
          return resolve({
            uid: meeting_id,
            ...event?.data,
            id: meeting_id,
            additionalInfo: {
              hangoutLink: event?.data.hangoutLink || '',
            },
            type: 'google_calendar',
            password: '',
            url: '',
          })
        }
      )
    })
  }

  async deleteEvent(meeting_id: string, calendarId?: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const auth = await this.auth
      const myGoogleAuth = await auth.getToken()
      const calendar = google.calendar({
        version: 'v3',
        auth: myGoogleAuth,
      })

      calendar.events.delete(
        {
          auth: myGoogleAuth,
          calendarId: 'primary',
          eventId: meeting_id.replaceAll('-', ''),
          sendNotifications: true,
          sendUpdates: 'all',
        },
        function (err: any, event: any) {
          if (err) {
            /**
             *  410 is when an event is already deleted on the Google cal before on cal.com
             *  404 is when the event is on a different calendar
             */
            console.log(err)
            if (err.code === 410) return resolve()
            console.error(
              'There was an error contacting google calendar service: ',
              err
            )
            if (err.code === 404) return resolve()
            return reject(err)
          }
          return resolve(event?.data)
        }
      )
    })
  }

  async getAvailability(
    calendarIds: string[],
    dateFrom: string,
    dateTo: string
  ): Promise<EventBusyDate[]> {
    return new Promise((resolve, reject) =>
      this.auth.getToken().then(myGoogleAuth => {
        const calendar = google.calendar({
          version: 'v3',
          auth: myGoogleAuth,
        })

        calendar.freebusy.query(
          {
            requestBody: {
              timeMin: dateFrom,
              timeMax: dateTo,
              items: calendarIds.map(id => {
                return {
                  id,
                }
              }),
            },
          },
          (err, apires) => {
            if (err) {
              reject(err)
            }
            let result: any = []

            if (apires?.data.calendars) {
              result = Object.values(apires.data.calendars).reduce((c, i) => {
                i.busy?.forEach(busyTime => {
                  c.push({
                    start: busyTime.start || '',
                    end: busyTime.end || '',
                  })
                })
                return c
              }, [] as typeof result)
            }
            resolve(result)
          }
        )
      })
    )
  }
}
