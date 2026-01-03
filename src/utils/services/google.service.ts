import * as Sentry from '@sentry/nextjs'
import { GaxiosError } from 'gaxios'
import { Auth, calendar_v3, google } from 'googleapis'
import { DateTime } from 'luxon'

import { UnifiedEvent } from '@/types/Calendar'
import {
  CalendarSyncInfo,
  NewCalendarEventType,
} from '@/types/CalendarConnections'
import { MeetingReminders } from '@/types/common'
import { Intents } from '@/types/Dashboard'
import { MeetingRepeat, TimeSlotSource } from '@/types/Meeting'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import {
  MeetingCreationSyncRequest,
  MeetingInstanceCreationSyncRequest,
} from '@/types/Requests'

import { handleRRULEForMeeting } from '../calendar_manager'
import { apiUrl, appUrl, NO_REPLY_EMAIL } from '../constants'
import { NO_MEETING_TYPE } from '../constants/meeting-types'
import { MeetingPermissions } from '../constants/schedule'
import {
  getGoogleEventMappingId,
  getOwnerPublicUrlServer,
  updateCalendarPayload,
} from '../database'
import { getCalendarPrimaryEmail } from '../sync_helper'
import { CalendarServiceHelper } from './calendar.helper'
import { EventList, IGoogleCalendarService } from './calendar.service.types'
import { GoogleEventMapper } from './google.mapper'
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
export default class GoogleCalendarService implements IGoogleCalendarService {
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
    return new Promise(async (resolve, _reject) => {
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
    syncToken: string | undefined | null
  ): Promise<EventList> {
    const myGoogleAuth = await this.auth.getToken()
    const calendar = google.calendar({
      version: 'v3',
      auth: myGoogleAuth,
    })
    const aggregatedEvents: calendar_v3.Schema$Event[] = []
    let nextSyncToken: string | undefined
    let token: string | undefined
    do {
      const response = await calendar.events.list({
        calendarId,
        syncToken: syncToken ?? undefined,
        showDeleted: true,
        pageToken: token,
      })
      aggregatedEvents.push(...(response.data.items || []))
      token = response.data.nextPageToken || undefined
      const storedSyncToken = response.data.nextSyncToken
      if (storedSyncToken) nextSyncToken = storedSyncToken
    } while (token)
    return {
      events: aggregatedEvents,
      nextSyncToken,
    }
  }

  async createEvent(
    calendarOwnerAccountAddress: string,
    meetingDetails: MeetingCreationSyncRequest,
    meeting_creation_time: Date,
    _calendarId?: string,
    useParticipants?: boolean
  ): Promise<NewCalendarEventType & calendar_v3.Schema$Event> {
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
          const ownerParticipant = participantsInfo.find(
            p => p.type === ParticipantType.Owner
          )
          const ownerAccountAddress = ownerParticipant?.account_address

          const changeUrl =
            meetingDetails.meeting_type_id &&
            ownerAccountAddress &&
            meetingDetails.meeting_type_id !== NO_MEETING_TYPE
              ? `${await getOwnerPublicUrlServer(
                  ownerAccountAddress,
                  meetingDetails.meeting_type_id
                )}?conferenceId=${meetingDetails.meeting_id}`
              : `${appUrl}/dashboard/schedule?conferenceId=${meetingDetails.meeting_id}&intent=${Intents.UPDATE_MEETING}`

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
              changeUrl
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
            guestsCanModify: meetingDetails.meetingPermissions?.includes(
              MeetingPermissions.EDIT_MEETING
            ),
            guestsCanInviteOthers: meetingDetails.meetingPermissions?.includes(
              MeetingPermissions.INVITE_GUESTS
            ),
            guestsCanSeeOtherGuests:
              meetingDetails.meetingPermissions?.includes(
                MeetingPermissions.SEE_GUEST_LIST
              ),
            location: meetingDetails.meeting_url,
            status: 'confirmed',

            extendedProperties: {
              private: {
                updatedBy: 'meetwith',
                lastUpdatedAt: new Date().toISOString(),
                meetingId: meetingDetails.meeting_id,
                meetingTypeId: meetingDetails.meeting_type_id || '',
                includesParticipants: useParticipants ? 'true' : 'false',
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
            payload.recurrence =
              meetingDetails.rrule ||
              handleRRULEForMeeting(
                meetingDetails.meetingRepeat,
                new Date(meetingDetails.start)
              )
          }
          const calendar = google.calendar({
            version: 'v3',
            auth: myGoogleAuth,
          })

          if (useParticipants) {
            // Build deduplicated attendees list using helper
            const attendees = await this.buildAttendeesList(
              meetingDetails.participants,
              calendarOwnerAccountAddress
            )
            payload.attendees = attendees
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

  async _updateEvent(
    calendarOwnerAccountAddress: string,
    meetingDetails: MeetingCreationSyncRequest,
    _calendarId: string
  ): Promise<NewCalendarEventType> {
    return new Promise(async (resolve, reject) => {
      const auth = this.auth
      const myGoogleAuth = await auth.getToken()
      const calendarId = parseCalendarId(_calendarId)
      const meeting_id = meetingDetails.meeting_id
      const participantsInfo: ParticipantInfo[] =
        meetingDetails.participants.map(participant => ({
          type: participant.type,
          name: participant.name,
          account_address: participant.account_address,
          status: participant.status,
          slot_id: '',
          meeting_id,
        }))
      const event = await this.getEventById(
        meetingDetails.eventId || meeting_id,
        _calendarId
      )
      const actorStatus = event?.attendees?.find(
        attendee => attendee.self
      )?.responseStatus
      const changeUrl = `${appUrl}/dashboard/schedule?conferenceId=${meetingDetails.meeting_id}&intent=${Intents.UPDATE_MEETING}`
      const eventId =
        (await getGoogleEventMappingId(meeting_id, _calendarId)) ||
        meetingDetails.eventId ||
        meeting_id.replaceAll('-', '')
      const payload: calendar_v3.Schema$Event = {
        id: eventId,
        summary: CalendarServiceHelper.getMeetingTitle(
          calendarOwnerAccountAddress,
          participantsInfo,
          meetingDetails.title
        ),
        description: CalendarServiceHelper.getMeetingSummary(
          meetingDetails.content,
          meetingDetails.meeting_url,
          changeUrl
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
        guestsCanModify: meetingDetails.meetingPermissions?.includes(
          MeetingPermissions.EDIT_MEETING
        ),
        guestsCanInviteOthers: meetingDetails.meetingPermissions?.includes(
          MeetingPermissions.INVITE_GUESTS
        ),
        guestsCanSeeOtherGuests: meetingDetails.meetingPermissions?.includes(
          MeetingPermissions.SEE_GUEST_LIST
        ),
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
            meetingId: meetingDetails.meeting_id,
            lastUpdatedAt: new Date().toISOString(),
            meetingTypeId: meetingDetails.meeting_type_id || '',
            includesParticipants:
              event?.extendedProperties?.private?.includesParticipants ||
              'false',
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
        payload.recurrence =
          meetingDetails.rrule ||
          handleRRULEForMeeting(
            meetingDetails.meetingRepeat,
            new Date(meetingDetails.start)
          )
      }
      const guest = meetingDetails.participants.find(
        participant => participant.guest_email
      )

      if (event?.extendedProperties?.private?.includesParticipants === 'true') {
        // Build deduplicated attendees list using helper
        const attendees = await this.buildAttendeesListForUpdate(
          meetingDetails.participants,
          calendarOwnerAccountAddress,
          actorStatus || undefined,
          guest
        )

        payload.attendees = attendees
      }
      const calendar = google.calendar({
        version: 'v3',
        auth: myGoogleAuth,
      })
      try {
        let event
        if (eventId.includes('_')) {
          event = await calendar.events.patch({
            auth: myGoogleAuth,
            calendarId,
            eventId,
            sendNotifications: true,
            sendUpdates: 'all',
            requestBody: payload,
          })
        } else {
          event = await calendar.events.update({
            auth: myGoogleAuth,
            calendarId,
            eventId,
            sendNotifications: true,
            sendUpdates: 'all',
            requestBody: payload,
          })
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
      } catch (err) {
        if (err) {
          console.error(
            'There was an error contacting google calendar service: ',
            err
          )
          return reject(err)
        }
      }
    })
  }

  async updateEvent(
    calendarOwnerAccountAddress: string,
    meetingDetails: MeetingCreationSyncRequest,
    _calendarId: string
  ): Promise<NewCalendarEventType> {
    return withRetry<NewCalendarEventType>(
      async () =>
        this._updateEvent(
          calendarOwnerAccountAddress,
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
      const eventId =
        (await getGoogleEventMappingId(meeting_id, _calendarId)) ||
        meeting_id.replaceAll('-', '')
      const calendarId = parseCalendarId(_calendarId)
      calendar.events.delete(
        {
          auth: myGoogleAuth,
          calendarId,
          eventId,
          sendNotifications: true,
          sendUpdates: 'all',
        },
        function (err, _event) {
          if (err instanceof GaxiosError) {
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
          } else if (err instanceof Error) {
            return reject(err)
          }
          return resolve()
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
      this.auth.getToken().then(async myGoogleAuth => {
        const calendar = google.calendar({
          version: 'v3',
          auth: myGoogleAuth,
        })

        try {
          // Use events.list to get full event details including title and ID
          const eventsPromises = calendarIds.map(async calendarId => {
            try {
              const allEvents = []
              let pageToken: string | undefined

              // Paginate through all events using nextPageToken
              do {
                const eventsResponse = await calendar.events.list({
                  calendarId,
                  timeMin: dateFrom,
                  timeMax: dateTo,
                  singleEvents: true,
                  orderBy: 'startTime',
                  maxResults: 2500,
                  pageToken,
                })

                const pageEvents =
                  eventsResponse.data.items?.map(event => ({
                    start: event.start?.dateTime || event.start?.date || '',
                    end: event.end?.dateTime || event.end?.date || '',
                    title: event.summary || '',
                    eventId: event.id || '',
                    email: this.email,
                    webLink: event.htmlLink || undefined,
                  })) || []

                allEvents.push(...pageEvents)
                pageToken = eventsResponse.data.nextPageToken || undefined
              } while (pageToken)

              return allEvents
            } catch (error) {
              // Fallback to freebusy if events.list fails
              console.warn(
                `Failed to get event details for calendar ${calendarId}, falling back to freebusy`,
                error
              )
              return []
            }
          })

          const eventsResults = await Promise.all(eventsPromises)
          const result = eventsResults.flat()

          // If we got no results from events.list, fallback to freebusy.query
          if (result.length === 0) {
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
                  return
                }
                let fallbackResult: Array<EventBusyDate> = []

                if (apires?.data.calendars) {
                  fallbackResult = Object.values(apires.data.calendars).reduce(
                    (c, i) => {
                      i.busy?.forEach(busyTime => {
                        c.push({
                          start: busyTime.start || '',
                          end: busyTime.end || '',
                        })
                      })
                      return c
                    },
                    [] as typeof fallbackResult
                  )
                }
                resolve(fallbackResult)
              }
            )
          } else {
            resolve(result)
          }
        } catch (error) {
          // Final fallback to freebusy.query if everything fails
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
                return
              }
              let fallbackResult: Array<EventBusyDate> = []

              if (apires?.data.calendars) {
                fallbackResult = Object.values(apires.data.calendars).reduce(
                  (c, i) => {
                    i.busy?.forEach(busyTime => {
                      c.push({
                        start: busyTime.start || '',
                        end: busyTime.end || '',
                      })
                    })
                    return c
                  },
                  [] as typeof fallbackResult
                )
              }
              resolve(fallbackResult)
            }
          )
        }
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
  async initialSync(calendarId: string, dateFrom: string, dateTo: string) {
    try {
      const myGoogleAuth = await this.auth.getToken()
      const calendar = google.calendar({
        version: 'v3',
        auth: myGoogleAuth,
      })
      let token: string | undefined
      do {
        const response = await calendar.events.list({
          calendarId: calendarId,
          pageToken: token,
          timeMin: dateFrom,
          timeMax: dateTo,
          singleEvents: true,
          showDeleted: true,
        })
        token = response.data.nextPageToken!
        const storedSyncToken = response.data.nextSyncToken
        if (storedSyncToken) return storedSyncToken
      } while (token)
    } catch (error) {
      console.error('Initial sync error:', error)
    }
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
  private async buildAttendeesList(
    participants: ParticipantInfo[],
    calendarOwnerAccountAddress: string
  ): Promise<calendar_v3.Schema$EventAttendee[]> {
    const addedEmails = new Set<string>()
    const attendees: calendar_v3.Schema$EventAttendee[] = []

    for (const participant of participants) {
      const email =
        calendarOwnerAccountAddress === participant.account_address
          ? this.getConnectedEmail()
          : participant.guest_email ||
            (await getCalendarPrimaryEmail(participant.account_address!))
      // Only add if we haven't already added this email
      if (email && !addedEmails.has(email)) {
        addedEmails.add(email)
        const attendee: calendar_v3.Schema$EventAttendee = {
          email,
          displayName:
            participant.name ||
            participant.account_address ||
            email.split('@')[0],
          organizer: [
            ParticipantType.Owner,
            ParticipantType.Scheduler,
          ].includes(participant.type),
          responseStatus:
            participant.status === ParticipationStatus.Accepted
              ? 'accepted'
              : participant.status === ParticipationStatus.Rejected
              ? 'declined'
              : 'needsAction',
        }
        if (
          [ParticipantType.Owner, ParticipantType.Scheduler].includes(
            participant.type
          )
        ) {
          attendee.optional = false
        }
        if (participant.account_address === calendarOwnerAccountAddress) {
          attendee.self = true
        }
        attendees.push(attendee)
      }
    }

    return attendees
  }

  private async buildAttendeesListForUpdate(
    participants: ParticipantInfo[],
    calendarOwnerAccountAddress: string,
    actorStatus?: string,
    guestParticipant?: ParticipantInfo
  ): Promise<calendar_v3.Schema$EventAttendee[]> {
    const addedEmails = new Set<string>()
    const attendees: calendar_v3.Schema$EventAttendee[] = []

    // Handle guest participant first if provided
    if (guestParticipant?.guest_email) {
      addedEmails.add(guestParticipant.guest_email)
      attendees.push({
        email: guestParticipant.guest_email,
        displayName:
          guestParticipant.name ||
          guestParticipant.guest_email.split('@')[0] ||
          'Guest',
        responseStatus: 'accepted',
      })
    }

    for (const participant of participants) {
      const email =
        calendarOwnerAccountAddress === participant.account_address
          ? this.getConnectedEmail()
          : participant.guest_email ||
            (await getCalendarPrimaryEmail(participant.account_address!))

      // Only add if we haven't already added this email
      if (email && !addedEmails.has(email)) {
        addedEmails.add(email)
        attendees.push({
          email,
          displayName:
            participant.name ||
            participant.account_address ||
            email.split('@')[0],
          organizer: [
            ParticipantType.Owner,
            ParticipantType.Scheduler,
          ].includes(participant.type),
          responseStatus:
            calendarOwnerAccountAddress === participant.account_address &&
            actorStatus
              ? actorStatus
              : participant.status === ParticipationStatus.Accepted
              ? 'accepted'
              : participant.status === ParticipationStatus.Rejected
              ? 'declined'
              : 'needsAction',
        })
      }
    }

    return attendees
  }
  private async getEventsCalendarId(
    calendarId: string,
    dateFrom: string,
    dateTo: string,
    onlyWithMeetingLinks?: boolean
  ): Promise<UnifiedEvent[]> {
    const myGoogleAuth = await this.auth.getToken()
    const calendar = google.calendar({
      version: 'v3',
      auth: myGoogleAuth,
    })
    const aggregatedEvents: calendar_v3.Schema$Event[] = []
    let token: string | undefined
    do {
      const response = await calendar.events.list({
        calendarId,
        timeMin: dateFrom,
        timeMax: dateTo,
        pageToken: token,
        ...(onlyWithMeetingLinks && {
          q: 'hangoutLink location conferenceData',
        }),
      })
      aggregatedEvents.push(...(response.data.items || []))
      token = response.data.nextPageToken || undefined
    } while (token)
    return aggregatedEvents.map(event =>
      GoogleEventMapper.toUnified(event, calendarId, this.email)
    )
  }
  async getEvents(
    calendarIds: string[],
    dateFrom: string,
    dateTo: string
  ): Promise<UnifiedEvent[]> {
    const events = await Promise.all(
      calendarIds.map(calId =>
        this.getEventsCalendarId(calId, dateFrom, dateTo)
      )
    )
    return events.flat()
  }

  async updateEventInstance(
    calendarOwnerAccountAddress: string,
    meetingDetails: MeetingInstanceCreationSyncRequest,
    calendarId: string
  ): Promise<void> {
    const myGoogleAuth = await this.auth.getToken()
    const calendar = google.calendar({
      version: 'v3',
      auth: myGoogleAuth,
    })
    const seriesMasterId = meetingDetails.meeting_id.replaceAll('-', '')
    const originalStartTime = meetingDetails.original_start_time
    const dateFrom = DateTime.fromJSDate(new Date(originalStartTime))
      .startOf('day')
      .toISO()
    const dateTo = DateTime.fromJSDate(new Date(originalStartTime))
      .endOf('day')
      .toISO()
    const instances = await calendar.events.instances({
      calendarId,
      eventId: seriesMasterId,
      timeMin: dateFrom!,
      timeMax: dateTo!,
    })

    const instance = instances.data.items?.[0]
    if (!instance?.id) {
      throw new Error('Instance not found')
    }
    // check if the owner is organizer
    const actor = instance.attendees?.find(
      attendee => attendee.self && attendee.organizer
    )
    if (!actor) {
      // eslint-disable-next-line no-restricted-syntax
      console.info('Calendar owner is not the organizer of this event')
      return
    }

    await calendar.events.patch({
      calendarId,
      eventId: instance.id,
      requestBody: await this.buildEventUpdatePayload(
        calendarOwnerAccountAddress,
        meetingDetails,
        instance
      ),
    })
  }
  async buildEventUpdatePayload(
    calendarOwnerAccountAddress: string,
    meetingDetails: MeetingInstanceCreationSyncRequest,
    event?: calendar_v3.Schema$Event
  ) {
    const changeUrl = `${appUrl}/dashboard/schedule?conferenceId=${meetingDetails.meeting_id}&intent=${Intents.UPDATE_MEETING}`
    const meeting_id = meetingDetails.meeting_id

    const participantsInfo: ParticipantInfo[] = meetingDetails.participants.map(
      participant => ({
        type: participant.type,
        name: participant.name,
        account_address: participant.account_address,
        status: participant.status,
        slot_id: '',
        meeting_id,
      })
    )
    const payload: calendar_v3.Schema$Event = {
      summary: CalendarServiceHelper.getMeetingTitle(
        calendarOwnerAccountAddress,
        participantsInfo,
        meetingDetails.title
      ),
      description: CalendarServiceHelper.getMeetingSummary(
        meetingDetails.content,
        meetingDetails.meeting_url,
        changeUrl
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
      guestsCanModify: meetingDetails.meetingPermissions?.includes(
        MeetingPermissions.EDIT_MEETING
      ),
      guestsCanInviteOthers: meetingDetails.meetingPermissions?.includes(
        MeetingPermissions.INVITE_GUESTS
      ),
      guestsCanSeeOtherGuests: meetingDetails.meetingPermissions?.includes(
        MeetingPermissions.SEE_GUEST_LIST
      ),
      reminders: {
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 10 }],
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
    if (event?.extendedProperties?.private?.includesParticipants === 'true') {
      const guest = meetingDetails.participants.find(
        participant => participant.guest_email
      )
      // Build deduplicated attendees list using helper
      const attendees = await this.buildAttendeesListForUpdate(
        meetingDetails.participants,
        calendarOwnerAccountAddress,
        undefined,
        guest
      )

      payload.attendees = attendees
    }
    return payload
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
