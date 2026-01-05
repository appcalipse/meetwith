import * as Sentry from '@sentry/nextjs'
import { format, getWeekOfMonth } from 'date-fns'
import { GaxiosError } from 'gaxios'
import { Auth, calendar_v3, google } from 'googleapis'

import {
  CalendarSyncInfo,
  NewCalendarEventType,
} from '@/types/CalendarConnections'
import { MeetingReminders } from '@/types/common'
import { Intents } from '@/types/Dashboard'
import { MeetingRepeat, TimeSlotSource } from '@/types/Meeting'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import { MeetingCreationSyncRequest } from '@/types/Requests'

import { apiUrl, appUrl, NO_REPLY_EMAIL } from '../constants'
import { updateCalendarPayload } from '../database'
import { CalendarServiceHelper } from './calendar.helper'
import { CalendarService } from './calendar.service.types'
import { withRetry } from './retry.service'

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

const retryCondition = (error: unknown) => {
  if (error instanceof GaxiosError) {
    const isRateLimit =
      error?.message?.includes('Rate Limit') ||
      error?.response?.status === 403 ||
      error?.code === 'RATE_LIMIT_EXCEEDED'

    const isQuotaExceeded =
      error?.message?.includes('quotaExceeded') ||
      error?.message?.includes('rateLimitExceeded')

    const isNetworkError =
      error?.code === 'ECONNRESET' ||
      error?.code === 'ETIMEDOUT' ||
      !!(
        error?.response?.status &&
        error?.response?.status >= 500 &&
        error?.response?.status < 600
      )

    return isRateLimit || isQuotaExceeded || isNetworkError
  }
  return false
}
export default class GoogleCalendarService
  implements CalendarService<TimeSlotSource.GOOGLE>
{
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
  ): Promise<calendar_v3.Schema$Event | undefined> {
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
          return resolve(event?.data)
        }
      )
    })
  }

  async listEvents(
    calendarId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<calendar_v3.Schema$Event[]> {
    return new Promise((resolve, reject) =>
      this.auth.getToken().then(myGoogleAuth => {
        const calendar = google.calendar({
          version: 'v3',
          auth: myGoogleAuth,
        })

        calendar.events.list(
          {
            calendarId,
            timeMin: dateFrom.toISOString(),
            timeMax: dateTo.toISOString(),
            singleEvents: true,
            orderBy: 'updated',
            q: 'meetingId',
            showDeleted: true,
            updatedMin: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
          },
          (err, res) => {
            if (err) {
              console.error(
                'There was an error contacting google calendar service: ',
                err
              )
              return reject(err)
            }
            const events = res?.data.items || []
            return resolve(events)
          }
        )
      })
    )
  }

  async createEvent(
    calendarOwnerAccountAddress: string,
    meetingDetails: MeetingCreationSyncRequest,
    meeting_creation_time: Date,
    _calendarId?: string
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
            return resolve({
              uid: meetingDetails.meeting_id,
              ...event,
              id: meetingDetails.meeting_id,
              additionalInfo: {
                hangoutLink: event.hangoutLink || '',
              },
              type: 'google_calendar',
              password: '',
              url: '',
            })
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

          const slot_id = meetingDetails.participants.find(
            p => p.account_address === calendarOwnerAccountAddress
          )?.slot_id

          const hasGuests = meetingDetails.participants.some(p => p.guest_email)
          const changeUrl = `${appUrl}/dashboard/schedule?meetingId=${slot_id}&intent=${Intents.UPDATE_MEETING}`

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
              changeUrl,
              hasGuests
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
              overrides: [{ method: 'popup', minutes: 10 }],
            },
            creator: {
              displayName: 'Meetwith',
              email: NO_REPLY_EMAIL,
            },
            guestsCanModify: false,
            location: meetingDetails.meeting_url,
            status: 'confirmed',
            extendedProperties: {
              private: {
                updatedBy: 'meetwith',
                lastUpdatedAt: new Date().toISOString(),
              },
            },
          }
          if (meetingDetails.meetingReminders && payload.reminders?.overrides) {
            payload.reminders.overrides = meetingDetails.meetingReminders.map(
              this.createReminder
            )
          }
          if (
            meetingDetails.meetingRepeat &&
            meetingDetails?.meetingRepeat !== MeetingRepeat.NO_REPEAT
          ) {
            let RRULE = `RRULE:FREQ=${meetingDetails.meetingRepeat?.toUpperCase()};INTERVAL=1`
            const dayOfWeek = format(
              meetingDetails.start,
              'eeeeee'
            ).toUpperCase()
            const weekOfMonth = getWeekOfMonth(meetingDetails.start)

            switch (meetingDetails.meetingRepeat) {
              case MeetingRepeat.WEEKLY:
                RRULE += `;BYDAY=${dayOfWeek}`
                break
              case MeetingRepeat.MONTHLY:
                RRULE += `;BYSETPOS=${weekOfMonth};BYDAY=${dayOfWeek}`
                break
            }
            payload.recurrence = [RRULE]
          }
          const calendar = google.calendar({
            version: 'v3',
            auth: myGoogleAuth,
          })

          // Build deduplicated attendees list using helper
          const attendees = CalendarServiceHelper.buildAttendeesList(
            meetingDetails.participants,
            calendarOwnerAccountAddress,
            () => this.getConnectedEmail()
          )

          payload.attendees = attendees

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

  async _updateEvent(
    calendarOwnerAccountAddress: string,
    meeting_id: string,
    meetingDetails: MeetingCreationSyncRequest,
    _calendarId: string
  ): Promise<NewCalendarEventType> {
    return new Promise(async (resolve, reject) => {
      const auth = this.auth
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
      const event = await this.getEventById(meeting_id, _calendarId)
      if (!event) {
        return resolve(
          this.createEvent(
            calendarOwnerAccountAddress,
            meetingDetails,
            new Date(),
            _calendarId
          )
        )
      }
      const actorStatus = event?.attendees?.find(
        attendee => attendee.self
      )?.responseStatus
      const slot_id = meetingDetails.participants.find(
        p => p.account_address === calendarOwnerAccountAddress
      )?.slot_id

      // Determine the correct URL format based on whether participants are guests
      const hasGuests = meetingDetails.participants.some(p => p.guest_email)

      const changeUrl = `${appUrl}/dashboard/schedule?meetingId=${slot_id}&intent=${Intents.UPDATE_MEETING}`

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
          changeUrl,
          hasGuests
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
          overrides: [{ method: 'popup', minutes: 10 }],
        },
        creator: {
          displayName: 'Meetwith',
        },
        extendedProperties: {
          private: {
            updatedBy: 'meetwith',
            lastUpdatedAt: new Date().toISOString(),
          },
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
      if (
        meetingDetails.meetingRepeat &&
        meetingDetails?.meetingRepeat !== MeetingRepeat.NO_REPEAT
      ) {
        payload.recurrence = [
          `RRULE:FREQ=${meetingDetails.meetingRepeat?.toUpperCase()}`,
        ]
      }
      const guest = meetingDetails.participants.find(
        participant => participant.guest_email
      )

      // Build deduplicated attendees list using helper
      const attendees = CalendarServiceHelper.buildAttendeesListForUpdate(
        meetingDetails.participants,
        calendarOwnerAccountAddress,
        () => this.getConnectedEmail(),
        actorStatus || undefined,
        guest
      )

      payload.attendees = attendees

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

            if (err instanceof GaxiosError && err.code === 404) {
              calendar.events.insert(
                {
                  auth: myGoogleAuth,
                  calendarId,
                  sendNotifications: true,
                  sendUpdates: 'all',
                  requestBody: {
                    ...payload,
                    id: meeting_id.replaceAll('-', ''), // Set the ID explicitly
                  },
                },
                function (err, event) {
                  if (err || !event?.data) {
                    console.error(
                      'Fallback Update:>> There was an error contacting google calendar service: ',
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
            }

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

  async updateEvent(
    calendarOwnerAccountAddress: string,
    meeting_id: string,
    meetingDetails: MeetingCreationSyncRequest,
    _calendarId: string
  ): Promise<NewCalendarEventType> {
    return withRetry<NewCalendarEventType>(
      async () =>
        this._updateEvent(
          calendarOwnerAccountAddress,
          meeting_id,
          meetingDetails,
          _calendarId
        ),
      {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        retryCondition,
      }
    )
  }

  async deleteEvent(meeting_id: string, _calendarId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const auth = this.auth
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

  async setWebhookUrl(webhookUrl: string, calendarId = 'primary') {
    try {
      const auth = await this.auth.getToken()
      const calendar = google.calendar({ version: 'v3', auth })

      // Generate a unique channel ID for this webhook
      const channelId = `mww-${calendarId.replace(
        /[^a-zA-Z0-9_]/g,
        '-'
      )}-${Date.now()}`

      // Set up the watch request
      const watchRequest = {
        calendarId,
        requestBody: {
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          // Optional: Set expiration (max 1 week for calendar API)
          expiration: (Date.now() + 7 * 24 * 60 * 60 * 1000).toString(), // 1 week from now
          token: process.env.SERVER_SECRET,
        },
      }

      const response = await calendar.events.watch(watchRequest)

      return {
        channelId: response.data.id,
        resourceId: response.data.resourceId,
        expiration: response.data.expiration,
        calendarId,
        webhookUrl,
      }
    } catch (error) {
      throw error
    }
  }

  async stopWebhook(channelId: string, resourceId: string): Promise<void> {
    try {
      const auth = await this.auth.getToken()
      const calendar = google.calendar({ version: 'v3', auth })

      await calendar.channels.stop({
        requestBody: {
          id: channelId,
          resourceId,
        },
      })
    } catch (error) {
      throw error
    }
  }

  async refreshWebhook(
    oldChannelId: string,
    oldResourceId: string,
    webhookUrl: string,
    calendarId = 'primary'
  ) {
    try {
      // Stop the old webhook first
      await this.stopWebhook(oldChannelId, oldResourceId)
      // Create a new webhook
      return await this.setWebhookUrl(webhookUrl, calendarId)
    } catch (error) {
      throw error
    }
  }

  async _updateEventRSVP(
    meeting_id: string,
    attendeeEmail: string,
    responseStatus: string,
    _calendarId?: string
  ): Promise<NewCalendarEventType> {
    return new Promise(async (resolve, reject) => {
      try {
        const auth = this.auth
        const myGoogleAuth = await auth.getToken()
        const calendar = google.calendar({
          version: 'v3',
          auth: myGoogleAuth,
        })

        const calendarId = parseCalendarId(_calendarId)

        // First, get the current event
        const event = await this.getEventById(meeting_id, _calendarId)
        await new Promise(resolve => setTimeout(resolve, 5000)) // Wait for 5 seconds to ensure the event is fetched and rate limit not blocked
        // If the event is not found, reject the promise
        if (!event) {
          return reject(new Error(`Event ${meeting_id} not found`))
        }

        // Update only the specific attendee's response status
        const updatedAttendees = (event.attendees || []).map(attendee => {
          if (attendee.email?.toLowerCase() === attendeeEmail.toLowerCase()) {
            return {
              ...attendee,
              responseStatus,
            }
          }
          return attendee
        })

        // Create minimal payload with only attendees and extended properties
        const payload: calendar_v3.Schema$Event = {
          attendees: updatedAttendees,
          extendedProperties: {
            private: {
              ...event.extendedProperties?.private,
              updatedBy: 'meetwith',
              lastUpdatedAt: new Date().toISOString(),
            },
          },
        }

        // Update the event with only the RSVP change
        calendar.events.patch(
          {
            auth: myGoogleAuth,
            calendarId,
            eventId: meeting_id.replaceAll('-', ''),
            sendNotifications: true,
            sendUpdates: 'all',
            requestBody: payload,
          },
          function (updateErr, updatedEvent) {
            if (updateErr) {
              console.error(
                'There was an error updating RSVP status: ',
                updateErr
              )
              return reject(updateErr)
            }

            return resolve({
              uid: meeting_id,
              ...updatedEvent?.data,
              id: meeting_id,
              additionalInfo: {
                hangoutLink: updatedEvent?.data?.hangoutLink || '',
              },
              type: 'google_calendar',
              password: '',
              url: '',
            })
          }
        )
      } catch (error) {
        console.error('Error in updateEventRSVP:', error)
        reject(error)
      }
    })
  }

  async updateEventRSVP(
    meeting_id: string,
    attendeeEmail: string,
    responseStatus: string,
    _calendarId?: string
  ): Promise<NewCalendarEventType> {
    return withRetry<NewCalendarEventType>(
      async () =>
        this._updateEventRSVP(
          meeting_id,
          attendeeEmail,
          responseStatus,
          _calendarId
        ),
      {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        retryCondition,
      }
    )
  }

  async updateEventExtendedProperties(
    meeting_id: string,
    _calendarId?: string
  ): Promise<NewCalendarEventType> {
    return new Promise(async (resolve, reject) => {
      try {
        const auth = this.auth
        const myGoogleAuth = await auth.getToken()
        const calendar = google.calendar({
          version: 'v3',
          auth: myGoogleAuth,
        })

        const calendarId = parseCalendarId(_calendarId)

        // First, get the current event
        const event = await this.getEventById(meeting_id, _calendarId)
        if (!event) {
          return reject(new Error(`Event ${meeting_id} not found`))
        }

        // Create minimal payload with only attendees and extended properties
        const payload: calendar_v3.Schema$Event = {
          extendedProperties: {
            private: {
              ...event.extendedProperties?.private,
              updatedBy: 'meetwith',
              lastUpdatedAt: new Date().toISOString(),
            },
          },
        }

        // Update the event with only the RSVP change
        calendar.events.patch(
          {
            auth: myGoogleAuth,
            calendarId,
            eventId: meeting_id.replaceAll('-', ''),
            sendNotifications: true,
            sendUpdates: 'all',
            requestBody: payload,
          },
          function (updateErr, updatedEvent) {
            if (updateErr) {
              console.error(
                'There was an error updating RSVP status: ',
                updateErr
              )
              return reject(updateErr)
            }

            return resolve({
              uid: meeting_id,
              ...updatedEvent?.data,
              id: meeting_id,
              additionalInfo: {
                hangoutLink: updatedEvent?.data?.hangoutLink || '',
              },
              type: 'google_calendar',
              password: '',
              url: '',
            })
          }
        )
      } catch (error) {
        console.error('Error in updateEventRSVP:', error)
        reject(error)
      }
    })
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
        .then(async res => {
          const token = res.res?.data
          googleCredentials.access_token = token.access_token
          googleCredentials.expiry_date = token.expiry_date

          await updateCalendarPayload(
            address,
            email,
            TimeSlotSource.GOOGLE,
            googleCredentials
          )
          myGoogleAuth.setCredentials(googleCredentials)
          return myGoogleAuth
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

  private createReminder(indicator: MeetingReminders) {
    switch (indicator) {
      case MeetingReminders['15_MINUTES_BEFORE']:
        return { minutes: 15, method: 'popup' }
      case MeetingReminders['30_MINUTES_BEFORE']:
        return { minutes: 30, method: 'popup' }
      case MeetingReminders['1_HOUR_BEFORE']:
        return { minutes: 60, method: 'popup' }
      case MeetingReminders['1_DAY_BEFORE']:
        return { minutes: 1440, method: 'popup' }
      case MeetingReminders['1_WEEK_BEFORE']:
        return { minutes: 10080, method: 'popup' }
      case MeetingReminders['10_MINUTES_BEFORE']:
      default:
        return { minutes: 10, method: 'popup' }
    }
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
