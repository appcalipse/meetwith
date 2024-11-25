import * as Sentry from '@sentry/nextjs'
import { GetTokenResponse } from 'google-auth-library/build/src/auth/oauth2client'
import { Auth, calendar_v3, google } from 'googleapis'

import {
  CalendarSyncInfo,
  NewCalendarEventType,
} from '@/types/CalendarConnections'
import { MeetingReminders } from '@/types/common'
import { MeetingProvider, TimeSlotSource } from '@/types/Meeting'
import { ParticipantInfo, ParticipationStatus } from '@/types/ParticipantInfo'
import { MeetingCreationSyncRequest } from '@/types/Requests'

import { noNoReplyEmailForAccount } from '../calendar_manager'
import { apiUrl, appUrl, NO_REPLY_EMAIL } from '../constants'
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
  private email: string
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
    this.email = email
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
      email,
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
          calendarId: c.id!,
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

  getConnectedEmail(): string {
    return this.email
  }
  async getEventById(
    meeting_id: string,
    _calendarId?: string
  ): Promise<NewCalendarEventType | undefined> {
    return new Promise(async (resolve, reject) => {
      const auth = this.auth
      const myGoogleAuth = await auth.getToken()
      const calendar = google.calendar({
        version: 'v3',
        auth: myGoogleAuth,
      })

      const calendarId = parseCalendarId(_calendarId)

      calendar.events.get(
        {
          auth: myGoogleAuth,
          calendarId,
          eventId: meeting_id.replaceAll('-', ''),
        },
        function (err, event) {
          if (err) {
            console.error(
              'There was an error contacting google calendar service: ',
              err?.message
            )
            return resolve(undefined)
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
  private createReminder(indicator: MeetingReminders) {
    switch (indicator) {
      case MeetingReminders['15_MINUTES_BEFORE']:
        return { minutes: 15, method: 'email' }
      case MeetingReminders['30_MINUTES_BEFORE']:
        return { minutes: 30, method: 'email' }
      case MeetingReminders['1_HOUR_BEFORE']:
        return { minutes: 60, method: 'email' }
      case MeetingReminders['1_DAY_BEFORE']:
        return { minutes: 1440, method: 'email' }
      case MeetingReminders['1_WEEK_BEFORE']:
        return { minutes: 10080, method: 'email' }
      case MeetingReminders['10_MINUTES_BEFORE']:
      default:
        return { minutes: 10, method: 'email' }
    }
  }
  async createEvent(
    calendarOwnerAccountAddress: string,
    meetingDetails: MeetingCreationSyncRequest,
    meeting_creation_time: Date,
    _calendarId?: string,
    shouldGenerateLink = true
  ): Promise<NewCalendarEventType> {
    return new Promise((resolve, reject) =>
      this.auth
        .getToken()
        .then(async myGoogleAuth => {
          const event = await this.getEventById(
            meetingDetails.meeting_id,
            _calendarId
          )
          if (event) {
            return resolve(event)
          }
          const calendarId = parseCalendarId(_calendarId)
          const participantsInfo: ParticipantInfo[] =
            meetingDetails.participants.map(participant => ({
              type: participant.type,
              name: participant.name,
              account_address: participant.account_address,
              status: participant.status,
              slot_id: '',
              meeting_id: meetingDetails.meeting_id,
            }))

          const slot_id = meetingDetails.participants.filter(
            p => p.account_address === calendarOwnerAccountAddress
          )[0].slot_id

          const payload: calendar_v3.Schema$Event = {
            // yes, google event ids allows only letters and numbers
            id: meetingDetails.meeting_id.replaceAll('-', ''), // required to edit events later
            summary: CalendarServiceHelper.getMeetingTitle(
              calendarOwnerAccountAddress,
              participantsInfo,
              meetingDetails.title
            ),
            description: CalendarServiceHelper.getMeetingSummary(
              meetingDetails.content,
              meetingDetails.meeting_url,
              `${appUrl}/dashboard/meetings?slotId=${slot_id}`
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
              displayName: 'Meetwith',
              email: NO_REPLY_EMAIL,
            },
            guestsCanModify: false,
            location:
              shouldGenerateLink &&
              meetingDetails.meetingProvider !== MeetingProvider.GOOGLE_MEET
                ? meetingDetails.meeting_url
                : undefined,
            conferenceData:
              shouldGenerateLink &&
              meetingDetails.meetingProvider == MeetingProvider.GOOGLE_MEET
                ? {
                    createRequest: {
                      requestId: meetingDetails.meeting_id,
                    },
                  }
                : undefined,
            status: 'confirmed',
          }
          if (meetingDetails.meetingReminders && payload.reminders?.overrides) {
            payload.reminders.overrides = meetingDetails.meetingReminders.map(
              this.createReminder
            )
          }
          const calendar = google.calendar({
            version: 'v3',
            auth: myGoogleAuth,
          })

          for (const participant of meetingDetails.participants) {
            payload.attendees!.push({
              email:
                calendarOwnerAccountAddress === participant.account_address
                  ? this.getConnectedEmail()
                  : participant.guest_email ||
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

          calendar.events.insert(
            {
              auth: myGoogleAuth,
              calendarId,
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
                uid: meetingDetails.meeting_id,
                ...event.data,
                id: meetingDetails.meeting_id,
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
        .catch(error => {
          console.error(error)
          reject(error)
        })
    )
  }

  async updateEvent(
    calendarOwnerAccountAddress: string,
    meeting_id: string,
    meetingDetails: MeetingCreationSyncRequest,
    _calendarId: string
  ): Promise<NewCalendarEventType> {
    return new Promise(async (resolve, reject) => {
      const auth = await this.auth
      const myGoogleAuth = await auth.getToken()
      const calendarId = parseCalendarId(_calendarId)

      const participantsInfo: ParticipantInfo[] =
        meetingDetails.participants.map(participant => ({
          type: participant.type,
          name: participant.name,
          account_address: participant.account_address,
          status: participant.status,
          slot_id: '',
          meeting_id,
        }))

      const slot_id = meetingDetails.participants.filter(
        p => p.account_address === calendarOwnerAccountAddress
      )[0].slot_id

      const payload: calendar_v3.Schema$Event = {
        id: meeting_id.replaceAll('-', ''), // required to edit events later
        summary: CalendarServiceHelper.getMeetingTitle(
          calendarOwnerAccountAddress,
          participantsInfo,
          meetingDetails.title
        ),
        description: CalendarServiceHelper.getMeetingSummary(
          meetingDetails.content,
          meetingDetails.meeting_url,
          `${appUrl}/dashboard/meetings?slotId=${slot_id}`
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
          displayName: 'Meetwith',
        },
      }

      if (meetingDetails.meeting_url) {
        payload['location'] = meetingDetails.meeting_url
      }
      if (meetingDetails.meetingReminders && payload.reminders?.overrides) {
        payload.reminders.overrides = meetingDetails.meetingReminders.map(
          this.createReminder
        )
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

      for (const participant of meetingDetails.participants) {
        payload.attendees!.push({
          email:
            calendarOwnerAccountAddress === participant.account_address
              ? this.getConnectedEmail()
              : participant.guest_email ||
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
      calendar.events.update(
        {
          auth: myGoogleAuth,
          calendarId,
          eventId: meeting_id.replaceAll('-', ''),
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

  async deleteEvent(meeting_id: string, _calendarId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const auth = await this.auth
      const myGoogleAuth = await auth.getToken()
      const calendar = google.calendar({
        version: 'v3',
        auth: myGoogleAuth,
      })

      const calendarId = parseCalendarId(_calendarId)

      calendar.events.delete(
        {
          auth: myGoogleAuth,
          calendarId,
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

const parseCalendarId = (calId?: string) => {
  if (!calId) {
    return undefined
  }
  if (calId.indexOf('@') === -1) {
    return calId
  } else {
    return 'primary'
  }
}
