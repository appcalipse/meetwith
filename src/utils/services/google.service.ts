import * as Sentry from '@sentry/nextjs'
import { GaxiosError, RetryConfig } from 'gaxios'
import { Auth, calendar_v3, google } from 'googleapis'
import { DateTime } from 'luxon'

import { AttendeeStatus, UnifiedEvent } from '@/types/Calendar'
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
  MeetingCancelSyncRequest,
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
import { extractUrlFromText } from '../generic_utils'
import { getCalendarPrimaryEmail } from '../sync_helper'
import { isValidUrl } from '../validations'
import { CalendarServiceHelper } from './calendar.helper'
import { EventList, IGoogleCalendarService } from './calendar.service.types'
import { GoogleEventMapper } from './google.mapper'
import { RetryOptions, withRetry } from './retry.service'

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
      auth: myGoogleAuth,
      version: 'v3',
    })

    try {
      const calendarList = (await calendar.calendarList.list()).data

      const calendars: CalendarSyncInfo[] = calendarList.items!.map(c => {
        return {
          calendarId: c.id!,
          color: c.backgroundColor || undefined,
          enabled: Boolean(c.primary),
          isReadOnly:
            c.accessRole === 'reader' || c.accessRole === 'freeBusyReader',
          name: c.summary!,
          sync: false,
        }
      })
      return calendars
    } catch (_err) {
      const info = google.oauth2({
        auth: myGoogleAuth,
        version: 'v2',
      })
      const user = (await info.userinfo.get()).data
      return [
        {
          calendarId: user.email!,
          color: undefined,
          enabled: true,
          name: user.email!,
          sync: false,
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
        auth: myGoogleAuth,
        version: 'v3',
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
      auth: myGoogleAuth,
      version: 'v3',
    })
    const aggregatedEvents: calendar_v3.Schema$Event[] = []
    let nextSyncToken: string | undefined
    let token: string | undefined
    do {
      const response = await calendar.events.list({
        calendarId,
        pageToken: token,
        showDeleted: true,
        syncToken: syncToken ?? undefined,
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
              additionalInfo: {
                hangoutLink: event.hangoutLink || '',
              },
              id: meetingDetails.meeting_id,
              password: '',
              type: 'google_calendar',
              url: '',
            })
          }
          const calendarId = parseCalendarId(_calendarId)
          const participantsInfo: ParticipantInfo[] =
            meetingDetails.participants.map(participant => ({
              account_address: participant.account_address,
              meeting_id: meetingDetails.meeting_id,
              name: participant.name,
              slot_id: '',
              status: participant.status,
              type: participant.type,
            }))
          const ownerParticipant = participantsInfo.find(
            p => p.type === ParticipantType.Owner
          )
          const ownerAccountAddress = ownerParticipant?.account_address

          let changeUrl
          if (
            meetingDetails.meeting_type_id &&
            ownerAccountAddress &&
            meetingDetails.meeting_type_id !== NO_MEETING_TYPE
          ) {
            changeUrl = `${await getOwnerPublicUrlServer(
              ownerAccountAddress,
              meetingDetails.meeting_type_id
            )}?conferenceId=${meetingDetails.meeting_id}`
          } else {
            changeUrl = `${appUrl}/dashboard/schedule?conferenceId=${meetingDetails.meeting_id}&intent=${Intents.UPDATE_MEETING}`
            // recurring meetings should have ical_uid as an extra identifier to avoid collisions
            if (meetingDetails.ical_uid) {
              changeUrl = `${appUrl}/dashboard/schedule?conferenceId=${meetingDetails.meeting_id}&intent=${Intents.UPDATE_MEETING}&ical_uid=${meetingDetails.ical_uid}`
            }
          }
          const payload: calendar_v3.Schema$Event = {
            attendees: [],
            created: new Date(meeting_creation_time).toISOString(),
            creator: {
              displayName: 'Meetwith',
              email: NO_REPLY_EMAIL,
            },
            description: CalendarServiceHelper.getMeetingSummary(
              meetingDetails.content,
              meetingDetails.meeting_url,
              changeUrl
            ),
            end: {
              dateTime: new Date(meetingDetails.end).toISOString(),
              timeZone: 'UTC',
            },

            extendedProperties: {
              private: {
                includesParticipants: useParticipants ? 'true' : 'false',
                lastUpdatedAt: new Date().toISOString(),
                meetingId: meetingDetails.meeting_id,
                meetingTypeId: meetingDetails.meeting_type_id || '',
                updatedBy: 'meetwith',
              },
            },
            guestsCanInviteOthers: meetingDetails.meetingPermissions?.includes(
              MeetingPermissions.INVITE_GUESTS
            ),
            guestsCanModify: meetingDetails.meetingPermissions?.includes(
              MeetingPermissions.EDIT_MEETING
            ),

            // yes, google event ids allows only letters and numbers
            id:
              meetingDetails.ical_uid ||
              meetingDetails.meeting_id.replaceAll('-', ''), // required to edit events later
            location: meetingDetails.meeting_url,
            reminders: {
              overrides: [{ method: 'popup', minutes: 10 }],
              useDefault: false,
            },
            start: {
              dateTime: new Date(meetingDetails.start).toISOString(),
              timeZone: 'UTC',
            },
            status: 'confirmed',
            summary: CalendarServiceHelper.getMeetingTitle(
              calendarOwnerAccountAddress,
              participantsInfo,
              meetingDetails.title
            ),
          }
          if (meetingDetails.meetingReminders && payload.reminders?.overrides) {
            payload.reminders.overrides = meetingDetails.meetingReminders.map(
              this.createReminder
            )
          }
          if (meetingDetails.rrule.length > 0) {
            payload.recurrence = meetingDetails.rrule
          }
          const calendar = google.calendar({
            auth: myGoogleAuth,
            version: 'v3',
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
              conferenceDataVersion: 1,
              requestBody: payload,
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
                additionalInfo: {
                  hangoutLink: event.data.hangoutLink || '',
                },
                id: meetingDetails.meeting_id,
                password: '',
                type: 'google_calendar',
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
          account_address: participant.account_address,
          meeting_id,
          name: participant.name,
          slot_id: '',
          status: participant.status,
          type: participant.type,
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
        attendees: [],
        creator: {
          displayName: 'Meetwith',
        },
        description: CalendarServiceHelper.getMeetingSummary(
          meetingDetails.content,
          meetingDetails.meeting_url,
          changeUrl
        ),
        end: {
          dateTime: new Date(meetingDetails.end).toISOString(),
          timeZone: 'UTC',
        },
        extendedProperties: {
          private: {
            includesParticipants:
              event?.extendedProperties?.private?.includesParticipants ||
              'false',
            lastUpdatedAt: new Date().toISOString(),
            meetingId: meetingDetails.meeting_id,
            meetingTypeId: meetingDetails.meeting_type_id || '',
            updatedBy: 'meetwith',
          },
        },
        guestsCanInviteOthers: meetingDetails.meetingPermissions?.includes(
          MeetingPermissions.INVITE_GUESTS
        ),
        guestsCanModify: meetingDetails.meetingPermissions?.includes(
          MeetingPermissions.EDIT_MEETING
        ),
        guestsCanSeeOtherGuests: meetingDetails.meetingPermissions?.includes(
          MeetingPermissions.SEE_GUEST_LIST
        ),
        id: eventId,
        reminders: {
          overrides: [{ method: 'popup', minutes: 10 }],
          useDefault: false,
        },
        start: {
          dateTime: new Date(meetingDetails.start).toISOString(),
          timeZone: 'UTC',
        },
        summary: CalendarServiceHelper.getMeetingTitle(
          calendarOwnerAccountAddress,
          participantsInfo,
          meetingDetails.title
        ),
      }

      if (meetingDetails.meeting_url) {
        payload['location'] = meetingDetails.meeting_url
      }
      if (meetingDetails.meetingReminders && payload.reminders?.overrides) {
        payload.reminders.overrides = meetingDetails.meetingReminders.map(
          this.createReminder
        )
      }
      if (meetingDetails.rrule.length > 0) {
        payload.recurrence = meetingDetails.rrule
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
        auth: myGoogleAuth,
        version: 'v3',
      })
      try {
        let event
        if (eventId.includes('_')) {
          event = await calendar.events.patch({
            auth: myGoogleAuth,
            calendarId,
            eventId,
            requestBody: payload,
            sendNotifications: true,
            sendUpdates: 'all',
          })
        } else {
          event = await calendar.events.update({
            auth: myGoogleAuth,
            calendarId,
            eventId,
            requestBody: payload,
            sendNotifications: true,
            sendUpdates: 'all',
          })
        }
        return resolve({
          uid: meeting_id,
          ...event?.data,
          additionalInfo: {
            hangoutLink: event?.data.hangoutLink || '',
          },
          id: meeting_id,
          password: '',
          type: 'google_calendar',
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
        baseDelay: 1000,
        maxDelay: 30000,
        maxRetries: 3,
        retryCondition,
      }
    )
  }

  async deleteEvent(meeting_id: string, _calendarId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const auth = this.auth
      const myGoogleAuth = await auth.getToken()
      const calendar = google.calendar({
        auth: myGoogleAuth,
        version: 'v3',
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
          auth: myGoogleAuth,
          version: 'v3',
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
                  maxResults: 2500,
                  orderBy: 'startTime',
                  pageToken,
                  singleEvents: true,
                  timeMax: dateTo,
                  timeMin: dateFrom,
                })

                const pageEvents =
                  eventsResponse.data.items?.map(event => ({
                    email: this.email,
                    end: event.end?.dateTime || event.end?.date || '',
                    eventId: event.id || '',
                    start: event.start?.dateTime || event.start?.date || '',
                    title: event.summary || '',
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
                  items: calendarIds.map(id => {
                    return {
                      id,
                    }
                  }),
                  timeMax: dateTo,
                  timeMin: dateFrom,
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
                          end: busyTime.end || '',
                          start: busyTime.start || '',
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
        } catch (_error) {
          // Final fallback to freebusy.query if everything fails
          calendar.freebusy.query(
            {
              requestBody: {
                items: calendarIds.map(id => {
                  return {
                    id,
                  }
                }),
                timeMax: dateTo,
                timeMin: dateFrom,
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
                        end: busyTime.end || '',
                        start: busyTime.start || '',
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
      const calendar = google.calendar({ auth, version: 'v3' })

      // Generate a unique channel ID for this webhook
      const channelId = `mww-${calendarId.replace(
        /[^a-zA-Z0-9_]/g,
        '-'
      )}-${Date.now()}`

      // Set up the watch request
      const watchRequest = {
        calendarId,
        requestBody: {
          address: webhookUrl,
          // Optional: Set expiration (max 1 week for calendar API)
          expiration: (Date.now() + 7 * 24 * 60 * 60 * 1000).toString(), // 1 week from now
          id: channelId,
          token: process.env.SERVER_SECRET,
          type: 'web_hook',
        },
      }

      const response = await calendar.events.watch(watchRequest)

      return {
        calendarId,
        channelId: response.data.id,
        expiration: response.data.expiration,
        resourceId: response.data.resourceId,
        webhookUrl,
      }
    } catch (error) {
      throw error
    }
  }

  async stopWebhook(channelId: string, resourceId: string): Promise<void> {
    try {
      const auth = await this.auth.getToken()
      const calendar = google.calendar({ auth, version: 'v3' })

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
          auth: myGoogleAuth,
          version: 'v3',
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
              lastUpdatedAt: new Date().toISOString(),
              updatedBy: 'meetwith',
            },
          },
        }

        // Update the event with only the RSVP change
        calendar.events.patch(
          {
            auth: myGoogleAuth,
            calendarId,
            eventId: meeting_id.replaceAll('-', ''),
            requestBody: payload,
            sendNotifications: true,
            sendUpdates: 'all',
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
              additionalInfo: {
                hangoutLink: updatedEvent?.data?.hangoutLink || '',
              },
              id: meeting_id,
              password: '',
              type: 'google_calendar',
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
        baseDelay: 1000,
        maxDelay: 30000,
        maxRetries: 3,
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
          auth: myGoogleAuth,
          version: 'v3',
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
              lastUpdatedAt: new Date().toISOString(),
              updatedBy: 'meetwith',
            },
          },
        }

        // Update the event with only the RSVP change
        calendar.events.patch(
          {
            auth: myGoogleAuth,
            calendarId,
            eventId: meeting_id.replaceAll('-', ''),
            requestBody: payload,
            sendNotifications: true,
            sendUpdates: 'all',
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
              additionalInfo: {
                hangoutLink: updatedEvent?.data?.hangoutLink || '',
              },
              id: meeting_id,
              password: '',
              type: 'google_calendar',
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
        auth: myGoogleAuth,
        version: 'v3',
      })
      let token: string | undefined
      do {
        const response = await calendar.events.list({
          calendarId: calendarId,
          pageToken: token,
          showDeleted: true,
          timeMax: dateTo,
          timeMin: dateFrom,
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
          if (err.message !== 'invalid_grant') {
            Sentry.captureException(err)
          }
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
        return { method: 'popup', minutes: 15 }
      case MeetingReminders['30_MINUTES_BEFORE']:
        return { method: 'popup', minutes: 30 }
      case MeetingReminders['1_HOUR_BEFORE']:
        return { method: 'popup', minutes: 60 }
      case MeetingReminders['1_DAY_BEFORE']:
        return { method: 'popup', minutes: 1440 }
      case MeetingReminders['1_WEEK_BEFORE']:
        return { method: 'popup', minutes: 10080 }
      case MeetingReminders['10_MINUTES_BEFORE']:
      default:
        return { method: 'popup', minutes: 10 }
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
          displayName:
            participant.name ||
            participant.account_address ||
            email.split('@')[0],
          email,
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
        displayName:
          guestParticipant.name ||
          guestParticipant.guest_email.split('@')[0] ||
          'Guest',
        email: guestParticipant.guest_email,
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
          displayName:
            participant.name ||
            participant.account_address ||
            email.split('@')[0],
          email,
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
    calendarName: string,
    isReadOnlyCalendar: boolean,
    dateFrom: string,
    dateTo: string,
    onlyWithMeetingLinks?: boolean
  ): Promise<UnifiedEvent[]> {
    const myGoogleAuth = await this.auth.getToken()
    const calendar = google.calendar({
      auth: myGoogleAuth,
      version: 'v3',
    })
    const aggregatedEvents: calendar_v3.Schema$Event[] = []
    let token: string | undefined
    do {
      const response = await calendar.events.list({
        calendarId,
        orderBy: 'startTime',
        pageToken: token,
        singleEvents: true,
        timeMax: dateTo,
        timeMin: dateFrom,
      })
      aggregatedEvents.push(...(response.data.items || []))
      token = response.data.nextPageToken || undefined
    } while (token)
    const filteredEvents = onlyWithMeetingLinks
      ? aggregatedEvents.filter(event => {
          const hasHangout = event.hangoutLink && isValidUrl(event.hangoutLink)
          const hasConferenceData = event.conferenceData?.entryPoints?.some(
            ep => ep.uri && isValidUrl(ep.uri)
          )
          const hasLocationUrl = event.location && isValidUrl(event.location)
          const hasExtractedUrl = isValidUrl(
            extractUrlFromText(event.description)
          )
          return (
            hasHangout || hasConferenceData || hasLocationUrl || hasExtractedUrl
          )
        })
      : aggregatedEvents

    return filteredEvents.map(event =>
      GoogleEventMapper.toUnified(
        event,
        calendarId,
        calendarName,
        this.email,
        isReadOnlyCalendar
      )
    )
  }
  async getEvents(
    calendars: Array<
      Pick<CalendarSyncInfo, 'name' | 'calendarId' | 'isReadOnly'>
    >,
    dateFrom: string,
    dateTo: string,
    onlyWithMeetingLinks?: boolean
  ): Promise<UnifiedEvent[]> {
    const events = await Promise.all(
      calendars.map(cal =>
        this.getEventsCalendarId(
          cal.calendarId,
          cal.name,
          cal.isReadOnly ?? false,
          dateFrom,
          dateTo,
          onlyWithMeetingLinks
        )
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
      auth: myGoogleAuth,
      version: 'v3',
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
      timeMax: dateTo!,
      timeMin: dateFrom!,
    })

    const instance = instances.data.items?.[0]
    if (!instance?.id) {
      throw new Error('Instance not found')
    }
    // check if the owner is organizer
    const isOrganiserActor = instance.organizer?.self
    if (!isOrganiserActor) {
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
  async deleteEventInstance(
    calendarId: string,
    meetingDetails: MeetingCancelSyncRequest
  ): Promise<void> {
    const myGoogleAuth = await this.auth.getToken()
    const calendar = google.calendar({
      auth: myGoogleAuth,
      version: 'v3',
    })
    const seriesMasterId = meetingDetails.meeting_id.replaceAll('-', '')
    const originalStartTime = meetingDetails.start
    const dateFrom = DateTime.fromJSDate(new Date(originalStartTime))
      .startOf('day')
      .toISO()
    const dateTo = DateTime.fromJSDate(new Date(originalStartTime))
      .endOf('day')
      .toISO()
    const instances = await calendar.events.instances({
      calendarId,
      eventId: seriesMasterId,
      timeMax: dateTo!,
      timeMin: dateFrom!,
    })

    const instance = instances.data.items?.[0]
    if (!instance?.id) {
      throw new Error('Instance not found')
    }

    await calendar.events.delete({
      calendarId,
      eventId: instance.id,
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
        account_address: participant.account_address,
        meeting_id,
        name: participant.name,
        slot_id: '',
        status: participant.status,
        type: participant.type,
      })
    )
    const payload: calendar_v3.Schema$Event = {
      attendees: [],
      description: CalendarServiceHelper.getMeetingSummary(
        meetingDetails.content,
        meetingDetails.meeting_url,
        changeUrl
      ),
      end: {
        dateTime: new Date(meetingDetails.end).toISOString(),
        timeZone: 'UTC',
      },
      guestsCanInviteOthers: meetingDetails.meetingPermissions?.includes(
        MeetingPermissions.INVITE_GUESTS
      ),
      guestsCanModify: meetingDetails.meetingPermissions?.includes(
        MeetingPermissions.EDIT_MEETING
      ),
      guestsCanSeeOtherGuests: meetingDetails.meetingPermissions?.includes(
        MeetingPermissions.SEE_GUEST_LIST
      ),
      reminders: {
        overrides: [{ method: 'popup', minutes: 10 }],
        useDefault: false,
      },
      start: {
        dateTime: new Date(meetingDetails.start).toISOString(),
        timeZone: 'UTC',
      },
      summary: CalendarServiceHelper.getMeetingTitle(
        calendarOwnerAccountAddress,
        participantsInfo,
        meetingDetails.title
      ),
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
  async _updateExternalEvent(event: calendar_v3.Schema$Event) {
    const myGoogleAuth = await this.auth.getToken()
    const calendar = google.calendar({
      auth: myGoogleAuth,
      version: 'v3',
    })
    if (!event.id) {
      throw new Error('Event ID or meeting ID is missing')
    }
    await calendar.events.update({
      calendarId: 'primary',
      eventId: event.id,
      requestBody: event,
    })
  }
  async updateExternalEvent(event: calendar_v3.Schema$Event): Promise<void> {
    return withRetry<void>(async () => this._updateExternalEvent(event), {
      baseDelay: 1000,
      maxDelay: 30000,
      maxRetries: 3,
      retryCondition,
    })
  }

  async _updateEventRsvpForExternalEvent(
    calendarId: string,
    eventId: string,
    attendeeEmail: string,
    responseStatus: AttendeeStatus
  ) {
    const myGoogleAuth = await this.auth.getToken()
    const calendar = google.calendar({
      auth: myGoogleAuth,
      version: 'v3',
    })
    // First, get the current event
    const event = await this.getEventById(eventId, calendarId)
    if (!event) {
      throw new Error(`Event ${eventId} not found`)
    }

    // Update only the specific attendee's response status
    const updatedAttendees = (event.attendees || []).map(attendee => {
      if (attendee.email?.toLowerCase() === attendeeEmail.toLowerCase()) {
        return {
          ...attendee,
          responseStatus:
            responseStatus === AttendeeStatus.ACCEPTED
              ? 'accepted'
              : responseStatus === AttendeeStatus.DECLINED
              ? 'declined'
              : 'needsAction',
        }
      }
      return attendee
    })
    // Create minimal payload with only attendees
    // This is used to update the RSVP status of an external event
    const payload: calendar_v3.Schema$Event = {
      attendees: updatedAttendees,
    }

    // Update the event with only the RSVP change
    // No need to send notifications for external events
    await calendar.events.patch({
      auth: myGoogleAuth,
      calendarId,
      eventId,
      sendUpdates: 'all',
      requestBody: payload,
    })
  }
  async updateEventRsvpForExternalEvent(
    calendarId: string,
    eventId: string,
    attendeeEmail: string,
    responseStatus: AttendeeStatus
  ): Promise<void> {
    return withRetry<void>(
      async () =>
        this._updateEventRsvpForExternalEvent(
          calendarId,
          eventId,
          attendeeEmail,
          responseStatus
        ),
      {
        baseDelay: 1000,
        maxDelay: 30000,
        maxRetries: 3,
        retryCondition,
      }
    )
  }
  async _deleteExternalEvent(
    calendarId: string,
    eventId: string
  ): Promise<void> {
    const auth = this.auth
    const myGoogleAuth = await auth.getToken()
    const calendar = google.calendar({
      auth: myGoogleAuth,
      version: 'v3',
    })
    await calendar.events.delete({
      auth: myGoogleAuth,
      calendarId,
      eventId,
    })
  }
  async deleteExternalEvent(
    calendarId: string,
    eventId: string
  ): Promise<void> {
    return withRetry<void>(
      async () => this._deleteExternalEvent(calendarId, eventId),
      {
        baseDelay: 1000,
        maxDelay: 30000,
        maxRetries: 3,
        retryCondition,
      }
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
