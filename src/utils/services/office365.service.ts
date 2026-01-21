import { Client, GraphError } from '@microsoft/microsoft-graph-client'
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials'
import * as Sentry from '@sentry/nextjs'
import format from 'date-fns/format'
import { instance } from 'gaxios'
import { DateTime } from 'luxon'
import { RRule, rrulestr, Weekday, WeekdayStr } from 'rrule'
import { AttendeeStatus, UnifiedEvent } from '@/types/Calendar'
import {
  CalendarSyncInfo,
  NewCalendarEventType,
  Office365RecurrenceType,
} from '@/types/CalendarConnections'
import { MeetingReminders } from '@/types/common'
import { Intents } from '@/types/Dashboard'
import { MeetingRepeat, TimeSlotSource } from '@/types/Meeting'
import {
  Attendee,
  DaysOfWeek,
  EventBusyDate,
  MicrosoftGraphCalendar,
  MicrosoftGraphEvent,
  RecurrencePattern,
  RecurrenceRange,
  RecurrenceRangeType,
} from '@/types/Office365'
import { ParticipantInfo, ParticipationStatus } from '@/types/ParticipantInfo'
import {
  MeetingCancelSyncRequest,
  MeetingCreationSyncRequest,
  MeetingInstanceCreationSyncRequest,
} from '@/types/Requests'
import { appUrl } from '../constants'
import {
  getOfficeEventMappingId,
  insertOfficeEventMapping,
  updateCalendarPayload,
} from '../database'
import { extractUrlFromText, isAccountSchedulerOrOwner } from '../generic_utils'
import { getCalendarPrimaryEmail } from '../sync_helper'
import { isValidEmail, isValidUrl } from '../validations'
import { CalendarServiceHelper } from './calendar.helper'
import { IOffcie365CalendarService } from './calendar.service.types'
import { Office365EventMapper } from './office.mapper'
import {
  O365AuthCredentials,
  RefreshTokenCredential,
} from './office365.credential'

export class Office365CalendarService implements IOffcie365CalendarService {
  private graphClient: Client
  private email: string

  constructor(
    address: string,
    email: string,
    credential: O365AuthCredentials | string
  ) {
    const cred =
      typeof credential === 'string' ? JSON.parse(credential) : credential

    const tokenCredential = new RefreshTokenCredential(
      cred,
      process.env.MS_GRAPH_CLIENT_ID!,
      process.env.MS_GRAPH_CLIENT_SECRET!,
      async (token, expiry) => {
        await updateCalendarPayload(address, email, TimeSlotSource.OFFICE, {
          ...cred,
          access_token: token,
          expiry_date: expiry,
        })
      }
    )

    const authProvider = new TokenCredentialAuthenticationProvider(
      tokenCredential,
      {
        scopes: ['https://graph.microsoft.com/.default'],
      }
    )

    this.graphClient = Client.initWithMiddleware({
      authProvider,
    })
    this.email = email
  }

  getConnectedEmail = () => this.email

  async refreshConnection(): Promise<CalendarSyncInfo[]> {
    const response = await this.graphClient.api('/me/calendars').get()

    const calendars: MicrosoftGraphCalendar[] = response.value

    return calendars.map(calendar => ({
      calendarId: calendar.id!,
      color: calendar.hexColor,
      enabled: calendar.isDefaultCalendar ?? false,
      isReadOnly: calendar.canEdit === false,
      name: calendar.name!,
      sync: false,
    }))
  }

  async getEvent(
    eventId: string,
    calendarId: string
  ): Promise<MicrosoftGraphEvent> {
    const event: MicrosoftGraphEvent = await this.graphClient
      .api(`/me/calendars/${calendarId}/events/${eventId}`)
      .get()
    return event
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
    calendarId: string,
    useParticipants?: boolean
  ): Promise<MicrosoftGraphEvent & Partial<NewCalendarEventType>> {
    try {
      const body: MicrosoftGraphEvent = await this.translateEvent(
        owner,
        meetingDetails,
        meetingDetails.meeting_id,
        meeting_creation_time,
        useParticipants
      )

      const event: MicrosoftGraphEvent = await this.graphClient
        .api(`/me/calendars/${calendarId}/events`)
        .header(
          'Prefer',
          'outlook.send-meeting-invitations="sendToAllAndSaveCopy"'
        )
        .post(JSON.stringify(body))

      if (event.id)
        await insertOfficeEventMapping(event.id, meetingDetails.meeting_id)

      return event
    } catch (error) {
      Sentry.captureException(error)
      throw error
    }
  }

  async updateEvent(
    owner: string,
    meetingDetails: MeetingCreationSyncRequest,
    calendarId: string
  ): Promise<MicrosoftGraphEvent> {
    try {
      const meeting_id = meetingDetails.meeting_id
      const officeId = await getOfficeEventMappingId(meeting_id)
      const originalEvent = await this.getEvent(officeId!, calendarId)

      if (!officeId) {
        Sentry.captureException("Can't find office event mapping")
        throw new Error("Can't find office event mapping")
      }
      const useParticipants =
        originalEvent.attendees &&
        originalEvent.attendees.filter(
          attendee =>
            attendee?.emailAddress.address !== this.getConnectedEmail()
        ).length > 0

      const body = {
        ...this.translateEvent(
          owner,
          meetingDetails,
          meeting_id,
          new Date(),
          useParticipants
        ),
        id: officeId,
      }

      const event: MicrosoftGraphEvent = await this.graphClient
        .api(`/me/calendars/${calendarId}/events/${officeId}`)
        .header(
          'Prefer',
          'outlook.send-meeting-invitations="sendToAllAndSaveCopy"'
        )
        .patch(body)
      return event
    } catch (error) {
      Sentry.captureException(error)
      throw error
    }
  }

  async deleteEvent(meeting_id: string, calendarId: string): Promise<void> {
    try {
      const officeId = await getOfficeEventMappingId(meeting_id)

      if (!officeId) {
        Sentry.captureException("Can't find office event mapping")
        return
      }

      await this.graphClient
        .api(`/me/calendars/${calendarId}/events/${officeId}`)
        .delete()
    } catch (error) {
      Sentry.captureException(error)
      throw error
    }
  }

  async getAvailability(
    calendarIds: string[],
    dateFrom: string,
    dateTo: string
  ): Promise<EventBusyDate[]> {
    const dateFromParsed = new Date(dateFrom)
    const dateToParsed = new Date(dateTo)

    const promises: Promise<EventBusyDate[]>[] = calendarIds.map(
      async calendarId => {
        try {
          const allEvents: EventBusyDate[] = []
          let nextLink: string | undefined

          // Initial request
          let response = await this.graphClient
            .api(`/me/calendars/${calendarId}/calendarView`)
            .query({
              $top: '500',
              enddatetime: dateToParsed.toISOString(),
              startdatetime: dateFromParsed.toISOString(),
            })
            .get()

          // Process first page
          allEvents.push(
            ...response.value.map((evt: MicrosoftGraphEvent) => ({
              email: this.email,
              end: evt.end?.dateTime + 'Z',
              eventId: evt.id || '',
              start: evt.start?.dateTime + 'Z',
              title: evt.subject || '',
              webLink: evt.webLink || undefined,
            }))
          )

          // Follow @odata.nextLink to get subsequent pages
          nextLink = response['@odata.nextLink']
          while (nextLink) {
            // Extract the path and query string from the full URL
            const url = new URL(nextLink)
            const path = url.pathname + url.search

            response = await this.graphClient.api(path).get()

            allEvents.push(
              ...response.value.map((evt: MicrosoftGraphEvent) => ({
                email: this.email,
                end: evt.end?.dateTime + 'Z',
                eventId: evt.id || '',
                start: evt.start?.dateTime + 'Z',
                title: evt.subject || '',
                webLink: evt.webLink || undefined,
              }))
            )

            nextLink = response['@odata.nextLink']
          }

          return allEvents
        } catch (err) {
          Sentry.captureException(err)
          return []
        }
      }
    )

    const result = await Promise.all(promises)
    return result.flat()
  }

  async getEventsCalendarId(
    calendarId: string,
    calendarName: string,
    isReadOnlyCalendar: boolean,
    dateFrom: string,
    dateTo: string,
    onlyWithMeetingLinks?: boolean
  ): Promise<UnifiedEvent[]> {
    const dateFromParsed = new Date(dateFrom)
    const dateToParsed = new Date(dateTo)

    const events: MicrosoftGraphEvent[] = []
    let nextLink: string | undefined

    let response = await this.graphClient
      .api(`/me/calendars/${calendarId}/calendarView`)
      .query({
        $top: '500',
        enddatetime: dateToParsed.toISOString(),
        startdatetime: dateFromParsed.toISOString(),
      })
      .get()

    events.push(...response.value)

    nextLink = response['@odata.nextLink']
    while (nextLink) {
      const url = new URL(nextLink)
      const path = url.pathname + url.search
      response = await this.graphClient.api(path).get()

      events.push(...response.value)

      nextLink = response['@odata.nextLink']
    }
    const filteredEvents = onlyWithMeetingLinks
      ? events.filter(event => {
          const hasOnlineMeetingInfo =
            isValidUrl(event.onlineMeeting?.joinUrl) ||
            isValidUrl(event.onlineMeeting?.conferenceId)

          const hasDeprecatedUrl = isValidUrl(event.onlineMeetingUrl)

          const locationHasUrl =
            event.location?.displayName &&
            isValidUrl(event.location?.displayName)

          const locationsHaveUrl = event.locations?.some(
            loc => loc.displayName && isValidUrl(loc.displayName)
          )
          const hasExtractedUrl = isValidUrl(
            extractUrlFromText(event.body?.content)
          )

          return (
            hasOnlineMeetingInfo ||
            hasDeprecatedUrl ||
            locationHasUrl ||
            locationsHaveUrl ||
            hasExtractedUrl
          )
        })
      : events

    return Promise.all(
      filteredEvents.map(
        async event =>
          await Office365EventMapper.toUnified(
            event,
            calendarId,
            calendarName,
            this.getConnectedEmail(),
            isReadOnlyCalendar
          )
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
  private translateEvent = async (
    calendarOwnerAccountAddress: string,
    details: MeetingCreationSyncRequest,
    meeting_id: string,
    meeting_creation_time: Date,
    useParticipants?: boolean
  ) => {
    const participantsInfo: ParticipantInfo[] = details.participants.map(
      participant => ({
        account_address: participant.account_address,
        meeting_id,
        name: participant.name,
        slot_id: '',
        status: participant.status,
        type: participant.type,
      })
    )

    const payload: MicrosoftGraphEvent = {
      allowNewTimeProposals: false,
      attendees: [],
      body: {
        content: CalendarServiceHelper.getMeetingSummary(
          details.content,
          details.meeting_url,
          `${appUrl}/dashboard/schedule?conferenceId=${details.meeting_id}&intent=${Intents.UPDATE_MEETING}`
        ),
        contentType: 'text',
      },
      createdDateTime: new Date(meeting_creation_time).toISOString(),
      end: {
        dateTime: new Date(details.end).toISOString(),
        timeZone: 'UTC',
      },
      isOnlineMeeting: true,
      location: {
        displayName: details.meeting_url,
      },
      onlineMeeting: {
        joinUrl: details.meeting_url,
      },
      onlineMeetingProvider: 'unknown',
      onlineMeetingUrl: details.meeting_url,
      organizer: {
        emailAddress: {
          address: this.getConnectedEmail(), // Use the actual email
          name: calendarOwnerAccountAddress,
        },
      },
      singleValueExtendedProperties: [
        {
          id: 'String {00020329-0000-0000-C000-000000000046} Name meeting_id',
          value: meeting_id,
        },
      ],
      start: {
        dateTime: new Date(details.start).toISOString(),
        timeZone: 'UTC',
      },
      subject: CalendarServiceHelper.getMeetingTitle(
        calendarOwnerAccountAddress,
        participantsInfo,
        details.title
      ),
      transactionId: meeting_id, // avoid duplicating the event if we make more than one request with the same transactionId
    }
    if (details.meetingReminders && details.meetingReminders.length > 0) {
      payload.isReminderOn = true
      const lowestReminder = details.meetingReminders.reduce((prev, current) =>
        prev < current ? prev : current
      )
      payload.reminderMinutesBeforeStart = this.createReminder(lowestReminder)
    }

    if (details.rrule.length > 0) {
      const rruleString = details.rrule[0]
      const parsed = rrulestr(rruleString)
      const options = parsed.origOptions

      // Map RRULE FREQ to Office365 type
      let type!: Office365RecurrenceType
      const freq = options.freq

      if (freq === RRule.DAILY) {
        type = Office365RecurrenceType.DAILY
      } else if (freq === RRule.WEEKLY) {
        type = Office365RecurrenceType.WEEKLY
      } else if (freq === RRule.MONTHLY) {
        // BYSETPOS indicates relative monthly (e.g., "2nd Friday")
        type = options.bysetpos
          ? Office365RecurrenceType.RELATIVE_MONTHLY
          : Office365RecurrenceType.ABSOLUTE_MONTHLY
      }

      const meetingDate = new Date(details.start)
      const pattern: RecurrencePattern = {
        firstDayOfWeek: 'sunday',
        interval: options.interval || 1,
        type,
      }

      // Map BYDAY to daysOfWeek for weekly/monthly
      if (options.byweekday && Array.isArray(options.byweekday)) {
        const dayMap: Array<DaysOfWeek> = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ]
        const weekStrMap: Record<WeekdayStr, DaysOfWeek> = {
          SU: 'sunday',
          MO: 'monday',
          TU: 'tuesday',
          WE: 'wednesday',
          TH: 'thursday',
          FR: 'friday',
          SA: 'saturday',
        }
        pattern.daysOfWeek = options.byweekday.map(d => {
          switch (true) {
            case typeof d === 'number':
              return dayMap[d]
            case d instanceof Weekday:
              return dayMap[d.weekday]
            default:
              return weekStrMap[d]
          }
        })
      } else if (
        type === Office365RecurrenceType.WEEKLY ||
        type === Office365RecurrenceType.RELATIVE_MONTHLY
      ) {
        // Fallback: use meeting date's day of week
        pattern.daysOfWeek = [
          format(meetingDate, 'eeee').toLowerCase(),
        ] as RecurrencePattern['daysOfWeek']
      }

      // For relative monthly: map BYSETPOS to index
      if (
        type === Office365RecurrenceType.RELATIVE_MONTHLY &&
        options.bysetpos
      ) {
        const pos = Array.isArray(options.bysetpos)
          ? options.bysetpos[0]
          : options.bysetpos
        const indexMap: Record<number, RecurrencePattern['index']> = {
          1: 'first',
          2: 'second',
          3: 'third',
          4: 'fourth',
          [-1]: 'last',
        }
        pattern.index = indexMap[pos] || 'first'
      }

      // For absolute monthly: use day of month
      if (type === Office365RecurrenceType.ABSOLUTE_MONTHLY) {
        pattern.dayOfMonth = meetingDate.getDate()
      }

      // Determine range type: COUNT vs UNTIL vs no end

      let rangeType!: RecurrenceRangeType
      let numberOfOccurrences: RecurrenceRange['numberOfOccurrences']
      let endDate: RecurrenceRange['endDate']
      if (options.count) {
        rangeType = 'numbered'
        numberOfOccurrences = options.count
      } else if (options.until) {
        rangeType = 'endDate'
        endDate = format(options.until, 'yyyy-MM-dd')
      } else {
        rangeType = 'noEnd'
      }
      const range: RecurrenceRange = {
        recurrenceTimeZone: 'UTC',
        startDate: format(meetingDate, 'yyyy-MM-dd'),
        type: rangeType,
        numberOfOccurrences,
        endDate,
      }
      payload['recurrence'] = { pattern, range }
    }

    if (useParticipants && payload.attendees) {
      for (const participant of details.participants) {
        const email =
          calendarOwnerAccountAddress === participant.account_address
            ? this.getConnectedEmail()
            : participant.guest_email ||
              (await getCalendarPrimaryEmail(participant.account_address!))
        if (!email || !isValidEmail(email)) {
          continue
        }
        const attendee: Attendee = {
          emailAddress: {
            address: email,
            name: participant.name || participant.account_address,
          },
          status: {
            response:
              participant.status === ParticipationStatus.Accepted
                ? 'accepted'
                : participant.status === ParticipationStatus.Rejected
                  ? 'declined'
                  : 'notResponded',
            time: new Date().toISOString(),
          },
          type: 'required',
        }
        if (
          isAccountSchedulerOrOwner(
            details.participants,
            participant.account_address
          )
        ) {
          attendee.type = 'required'
        }
        payload.attendees.push(attendee)
      }
    }
    return payload
  }
  async updateEventInstance(
    calendarOwnerAccountAddress: string,
    meetingDetails: MeetingInstanceCreationSyncRequest,
    calendarId: string
  ): Promise<void> {
    const meeting_id = meetingDetails.meeting_id
    const officeId = await getOfficeEventMappingId(meeting_id)

    if (!officeId) {
      Sentry.captureException("Can't find office event mapping")
      throw new Error("Can't find office event mapping")
    }
    const originalStartTime = meetingDetails.original_start_time
    const dateFrom = encodeURIComponent(
      DateTime.fromJSDate(new Date(originalStartTime)).startOf('day').toISO()!
    )
    const dateTo = encodeURIComponent(
      DateTime.fromJSDate(new Date(originalStartTime)).endOf('day').toISO()!
    )
    const instances = await this.graphClient
      .api(`/me/calendars/${calendarId}/events/${officeId}/instances`)
      .query({
        endDateTime: dateTo!,
        startDateTime: dateFrom!,
      })
      .get()

    const instance: MicrosoftGraphEvent | null = instances.value[0]

    if (!instance || !instance?.id) {
      throw new Error('Instance not found')
    }
    const useParticipants =
      instance.attendees &&
      instance.attendees.filter(
        attendee => attendee?.emailAddress.address !== this.getConnectedEmail()
      ).length > 0
    await this.graphClient
      .api(`/me/calendars/${calendarId}/events/${instance.id}`)
      .patch(
        this.translateEvent(
          calendarOwnerAccountAddress,
          meetingDetails,
          meeting_id,
          new Date(),
          useParticipants
        )
      )
  }
  async deleteEventInstance(
    calendarId: string,
    meetingDetails: MeetingCancelSyncRequest
  ): Promise<void> {
    const meeting_id = meetingDetails.meeting_id
    const original_start_time = meetingDetails.start
    const officeId = await getOfficeEventMappingId(meeting_id)

    if (!officeId) {
      Sentry.captureException("Can't find office event mapping")
      throw new Error("Can't find office event mapping")
    }
    const dateFrom = encodeURIComponent(
      DateTime.fromJSDate(new Date(original_start_time)).startOf('day').toISO()!
    )
    const dateTo = encodeURIComponent(
      DateTime.fromJSDate(new Date(original_start_time)).endOf('day').toISO()!
    )
    const instances = await this.graphClient
      .api(`/me/calendars/${calendarId}/events/${officeId}/instances`)
      .query({
        endDateTime: dateTo!,
        startDateTime: dateFrom!,
      })
      .get()

    const instance: MicrosoftGraphEvent | null = instances.value[0]

    if (!instance || !instance?.id) {
      throw new Error('Instance not found')
    }

    await this.graphClient
      .api(`/me/calendars/${calendarId}/events/${instance.id}`)
      .delete()
  }
  async updateExternalEvent(event: Partial<MicrosoftGraphEvent>) {
    if (!event.id) {
      throw new Error('Event ID is required for update')
    }
    await this.graphClient.api(`/me/events/${event.id}`).patch(event)
  }
  async updateEventRsvpForExternalEvent(
    calendarId: string,
    eventId: string,
    attendeeEmail: string,
    responseStatus: AttendeeStatus
  ) {
    const connectedEmail = this.getConnectedEmail()
    if (connectedEmail.toLowerCase() !== attendeeEmail.toLowerCase()) {
      throw new Error('Can only update RSVP status for the connected account')
    }

    const event = await this.getEvent(eventId, calendarId)
    if (event.responseRequested === false) {
      throw new Error('RSVP not allowed for this event by organizer')
    }

    let endpoint: string
    const body = {
      sendResponse: true,
      comment: '',
    }

    switch (responseStatus) {
      case AttendeeStatus.ACCEPTED:
      case AttendeeStatus.COMPLETED:
        endpoint = `/me/events/${eventId}/accept`
        break
      case AttendeeStatus.DECLINED:
        endpoint = `/me/events/${eventId}/decline`
        break
      case AttendeeStatus.NEEDS_ACTION:
      case AttendeeStatus.TENTATIVE:
      case AttendeeStatus.DELEGATED:
        endpoint = `/me/events/${eventId}/tentativelyAccept`
        break
      default:
        throw new Error(`Unsupported response status: ${responseStatus}`)
    }

    try {
      await this.graphClient.api(endpoint).post(body)
    } catch (error: unknown) {
      // Handle specific error cases
      if (
        error instanceof GraphError &&
        error?.code === 'ErrorInvalidRequest' &&
        error?.message?.includes("hasn't requested a response")
      ) {
        throw new Error('RSVP not allowed for this event')
      }
      throw error
    }
  }

  async deleteExternalEvent(
    calendarId: string,
    eventId: string
  ): Promise<void> {
    return await this.graphClient
      .api(`/me/calendars/${calendarId}/events/${eventId}`)
      .delete()
  }
}
