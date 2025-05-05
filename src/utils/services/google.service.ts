/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Sentry from '@sentry/nextjs'
import { format, getWeekOfMonth } from 'date-fns'
import { Auth, calendar_v3, google } from 'googleapis'

import {
  CalendarEvent,
  CalendarSyncInfo,
  CalendarWebhookResp,
  NewCalendarEventType,
} from '@/types/CalendarConnections'
import { MeetingReminders } from '@/types/common'
import { Intents } from '@/types/Dashboard'
import { MeetingRepeat, TimeSlotSource } from '@/types/Meeting'
import { ParticipantInfo, ParticipationStatus } from '@/types/ParticipantInfo'
import { MeetingCreationSyncRequest } from '@/types/Requests'

import { noNoReplyEmailForAccount } from '../calendar_manager'
import { apiUrl, appUrl, NO_REPLY_EMAIL } from '../constants'
import { updateCalendarPayload } from '../database'
import { CalendarServiceHelper } from './calendar.helper'
import { CalendarService } from './calendar.service.types'
export type EventBusyDate = Record<'start' | 'end', Date | string>

// --- NEW --- Interface defining the return structure for the sync function
export interface CalendarSyncResult {
  deletedGoogleEventIds: string[] // Google's event IDs that were deleted
  nextSyncToken: string | null | undefined // Token for the next sync poll
  error?: any // To capture potential errors during the sync API call
  requiresFullSync?: boolean // Flag if a 410 error occurred, indicating token is invalid
}

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
              `${appUrl}/dashboard/schedule?meetingId=${slot_id}&intent=${Intents.UPDATE_MEETING}`
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

          for (const participant of meetingDetails.participants) {
            payload.attendees!.push({
              email:
                calendarOwnerAccountAddress === participant.account_address
                  ? this.getConnectedEmail()
                  : participant.guest_email ||
                    noNoReplyEmailForAccount(
                      (participant.name || participant.account_address)!
                    ),
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
          `${appUrl}/dashboard/schedule?meetingId=${slot_id}&intent=${Intents.UPDATE_MEETING}`
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
                noNoReplyEmailForAccount(
                  (participant.name || participant.account_address)!
                ),
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

  async getGoogleEvents(
    calendarId: string,
    days = 2
  ): Promise<CalendarEvent[]> {
    try {
      const myGoogleAuth = await this.auth.getToken() // Or getClient() depending on your auth setup
      const calendar = google.calendar({
        version: 'v3',
        auth: myGoogleAuth,
      })

      const now = Date.now()

      // Calculate dateTo (current time in RFC3339)
      const dateTo = new Date(now).toISOString().replace(/\.000Z$/, 'Z') // Remove milliseconds

      // Calculate timestamp for 2 days ago
      const twoDaysAgoTimestamp = now - days * 24 * 60 * 60 * 1000

      // Calculate dateFrom (2 days ago in RFC3339)
      const dateFrom = new Date(twoDaysAgoTimestamp)
        .toISOString()
        .replace(/\.000Z$/, 'Z') // Remove milliseconds

      const allEvents: CalendarEvent[] = []
      let pageToken: string | undefined | null = undefined // Start with no page token

      do {
        const params: calendar_v3.Params$Resource$Events$List = {
          calendarId: calendarId,
          timeMin: dateFrom,
          timeMax: dateTo,
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 250, // Be explicit about max results per page
          pageToken: pageToken || undefined, // Use pageToken if available
        }

        // Use await instead of callback
        const response = await calendar.events.list(params)

        if (response?.data?.items) {
          response.data.items.forEach((event: calendar_v3.Schema$Event) => {
            // Added check for event.id as it technically can be null
            if (event.id) {
              allEvents.push({
                id: event.id,
                calendarId: calendarId, // Use the input calendarId
                summary: event.summary || '',
                description: event.description || '',
                start: event.start?.dateTime || event.start?.date || '',
                end: event.end?.dateTime || event.end?.date || '',
                location: event.location || '',
              })
            } else {
              console.warn('Found event without ID, skipping:', event.summary)
            }
          })
        }

        // Get the next page token for the next iteration
        pageToken = response?.data?.nextPageToken
      } while (pageToken) // Continue loop if there's a next page token

      console.log('All events:', allEvents.length)

      return allEvents
    } catch (error) {
      console.error('Error fetching Google Calendar events:', error)
      // Re-throw or handle error more specifically
      throw error // Propagate the error
    }
  }

  async stopChannel(webhookId: string, resourceId: string): Promise<void> {
    console.log(
      `Attempting to stop channel with ID: ${webhookId} and Resource ID: ${resourceId}`
    )
    try {
      const myGoogleAuth = await this.auth.getToken() // Or getClient() depending on auth setup
      const calendar = google.calendar({
        version: 'v3',
        auth: myGoogleAuth,
      })

      const requestBody: calendar_v3.Schema$Channel = {
        id: webhookId,
        resourceId: resourceId,
      }

      // The channels.stop method requires the channel and resource IDs in the request body.
      await calendar.channels.stop({
        requestBody: requestBody,
      })

      console.log(
        `Successfully stopped channel with ID: ${webhookId} and Resource ID: ${resourceId}`
      )
      // No meaningful data is returned on success, so we resolve void
    } catch (error: any) {
      // Log the specific error from the API if available
      const apiError = error?.response?.data?.error || error
      console.error(
        `Error stopping Google Calendar channel (ID: ${webhookId}, Resource ID: ${resourceId}):`,
        apiError.message || error.message || error
      )
      // Re-throw the error to be handled by the caller
      throw new Error(
        `Failed to stop channel: ${apiError.message || error.message}`
      )
    }
  }

  async setupCalendarWebhook(
    calendarId: string,
    calendarOwnerAddress: string,
    webhookUrl = apiUrl
  ): Promise<CalendarWebhookResp> {
    try {
      const myGoogleAuth = await this.auth.getToken()
      const calendar = google.calendar({
        version: 'v3',
        auth: myGoogleAuth,
      })

      // Fro local testing add ngrok url for apiUrl
      const webhookAddress = `${webhookUrl}/server/webhooks/calendar/google/${calendarOwnerAddress}`

      // Create the watch request using the calendarOwnerAddress as the ID
      const watchRequest: calendar_v3.Schema$Channel = {
        id: `id-${calendarOwnerAddress}`,
        type: 'web_hook',
        address: webhookAddress,
      }

      const response = await calendar.events.watch({
        calendarId: parseCalendarId(calendarId),
        requestBody: watchRequest,
      })

      const resp: CalendarWebhookResp = {
        calendarType: TimeSlotSource.GOOGLE,
        webhookId: response.data.id || '',
        webhookAddress: response.config.data.address || '',
        webhookResourceId: response.data.resourceId || '',
        webhookExpiration: new Date(Number(response.data.expiration)),
      }

      console.log(
        `Webhook set up for calendar ${calendarId} to owner ${calendarOwnerAddress}`
      )
      return resp
    } catch (error) {
      console.error('Error setting up Google Calendar webhook:', error)
      throw error
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
