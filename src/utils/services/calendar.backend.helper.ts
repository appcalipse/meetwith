import * as Sentry from '@sentry/nextjs'
import {
  areIntervalsOverlapping,
  compareAsc,
  differenceInSeconds,
  getWeekOfMonth,
  Interval,
  max,
  min,
} from 'date-fns'
import format from 'date-fns/format'
import { Attendee, createEvent, EventAttributes, ReturnObject } from 'ics'
import { DateTime } from 'luxon'

import { AttendeeStatus, UnifiedEvent } from '@/types/Calendar'
import { ConditionRelation } from '@/types/common'
import {
  MeetingChangeType,
  MeetingProvider,
  MeetingRepeat,
  TimeSlot,
  TimeSlotSource,
} from '@/types/Meeting'
import { ParticipantType, ParticipationStatus } from '@/types/ParticipantInfo'
import { QuickPollBusyParticipant } from '@/types/QuickPoll'
import { MeetingCreationSyncRequest } from '@/types/Requests'

import {
  createAlarm,
  getCalendarRegularUrl,
  participantStatusToICSStatus,
} from '../calendar_manager'
import {
  getConnectedCalendars,
  getQuickPollCalendars,
  getSlotsForAccount,
} from '../database'
import { getCalendarPrimaryEmail } from '../sync_helper'
import { isValidEmail, isValidUrl } from '../validations'
import { CalendarServiceHelper } from './calendar.helper'
import { getConnectedCalendarIntegration } from './connected_calendars.factory'
import { GoogleEventMapper } from './google.mapper'
import { Office365EventMapper } from './office.mapper'

export const CalendarBackendHelper = {
  getBusySlotsForAccount: async (
    account_address: string,
    startDate: Date,
    endDate: Date,
    limit?: number,
    offset?: number
  ): Promise<TimeSlot[]> => {
    const busySlots: TimeSlot[] = []

    const getMWWEvents = async () => {
      const meetings = await getSlotsForAccount(
        account_address,
        startDate,
        endDate,
        limit,
        offset
      )

      busySlots.push(
        ...meetings.map(it => ({
          start: new Date(it.start),
          end: new Date(it.end),
          source: TimeSlotSource.MWW,
          account_address,
        }))
      )
    }

    const getIntegratedCalendarEvents = async () => {
      const calendars = await getConnectedCalendars(account_address)
      await Promise.all(
        calendars.map(async calendar => {
          const integration = getConnectedCalendarIntegration(
            calendar.account_address,
            calendar.email,
            calendar.provider,
            calendar.payload
          )

          try {
            const externalSlots = await integration.getAvailability(
              calendar.calendars!.filter(c => c.enabled).map(c => c.calendarId),
              startDate!.toISOString(),
              endDate!.toISOString()
            )
            busySlots.push(
              ...externalSlots.map(it => ({
                start: new Date(it.start),
                end: new Date(it.end),
                source: calendar.provider,
                account_address,
                eventTitle: it.title,
                eventId: it.eventId,
                eventWebLink: it.webLink,
                eventEmail: it.email,
              }))
            )
          } catch (e: any) {
            Sentry.captureException(e)
          }
        })
      )
    }

    await Promise.all([getMWWEvents(), getIntegratedCalendarEvents()])
    return busySlots
  },

  getBusySlotsForQuickPollParticipants: async (
    participants: QuickPollBusyParticipant[],
    startDate: Date,
    endDate: Date,
    limit?: number,
    offset?: number
  ): Promise<TimeSlot[]> => {
    const busySlots: TimeSlot[] = []

    const addSlotsForParticipant = async (
      participant: QuickPollBusyParticipant
    ) => {
      if (participant.account_address) {
        busySlots.push(
          ...(await CalendarBackendHelper.getBusySlotsForAccount(
            participant.account_address,
            startDate,
            endDate,
            limit,
            offset
          ))
        )
      } else if (participant.participant_id) {
        const guestBusySlots: TimeSlot[] = []

        const getQuickPollCalendarEvents = async () => {
          const calendars = await getQuickPollCalendars(
            participant.participant_id!,
            {
              activeOnly: true,
            }
          )

          await Promise.all(
            calendars.map(async calendar => {
              const integration = getConnectedCalendarIntegration(
                '',
                calendar.email,
                calendar.provider,
                calendar.payload
              )

              try {
                const externalSlots = await integration.getAvailability(
                  calendar.calendars
                    ?.filter((c: any) => c.enabled)
                    .map((c: any) => c.calendarId) || [],
                  startDate.toISOString(),
                  endDate.toISOString()
                )
                guestBusySlots.push(
                  ...externalSlots.map(it => ({
                    start: new Date(it.start),
                    end: new Date(it.end),
                    source: calendar.provider,
                    account_address: `quickpoll_${participant.participant_id}`,
                  }))
                )
              } catch (e: any) {
                Sentry.captureException(e)
              }
            })
          )
        }

        await getQuickPollCalendarEvents()
        busySlots.push(...guestBusySlots)
      }
    }

    const promises: Promise<void>[] = []
    for (const participant of participants) {
      promises.push(addSlotsForParticipant(participant))
    }
    await Promise.all(promises)

    return busySlots
  },

  getBusySlotsForMultipleAccounts: async (
    account_addresses: string[],
    startDate: Date,
    endDate: Date,
    limit?: number,
    offset?: number
  ): Promise<TimeSlot[]> => {
    const busySlots: TimeSlot[] = []

    const addSlotsForAccount = async (account: string) => {
      busySlots.push(
        ...(await CalendarBackendHelper.getBusySlotsForAccount(
          account,
          startDate,
          endDate,
          limit,
          offset
        ))
      )
    }

    const promises: Promise<void>[] = []

    for (const address of account_addresses) {
      promises.push(addSlotsForAccount(address))
    }

    await Promise.all(promises)

    return busySlots
  },

  getMergedBusySlotsForMultipleAccounts: async (
    account_addresses: string[],
    relation: ConditionRelation,
    startDate: Date,
    endDate: Date,
    isRaw = false
  ): Promise<Interval[]> => {
    const busySlots =
      await CalendarBackendHelper.getBusySlotsForMultipleAccounts(
        account_addresses,
        startDate,
        endDate
      )

    if (isRaw) {
      busySlots.sort((a, b) => compareAsc(a.start, b.start))
      return busySlots
    }
    if (relation === ConditionRelation.AND) {
      return CalendarBackendHelper.mergeSlotsUnion(busySlots)
    } else {
      return CalendarBackendHelper.mergeSlotsIntersection(busySlots)
    }
  },

  getMergedBusySlotsForQuickPollParticipants: async (
    participants: QuickPollBusyParticipant[],
    relation: ConditionRelation,
    startDate: Date,
    endDate: Date,
    isRaw = false
  ): Promise<Interval[]> => {
    const busySlots =
      await CalendarBackendHelper.getBusySlotsForQuickPollParticipants(
        participants,
        startDate,
        endDate
      )

    if (isRaw) {
      busySlots.sort((a, b) => compareAsc(a.start, b.start))
      return busySlots
    }
    if (relation === ConditionRelation.AND) {
      return CalendarBackendHelper.mergeSlotsUnion(busySlots)
    } else {
      return CalendarBackendHelper.mergeSlotsIntersection(busySlots)
    }
  },

  mergeSlotsUnion: (slots: TimeSlot[]): Interval[] => {
    slots.sort((a, b) => compareAsc(a.start, b.start))

    const merged: Interval[] = []
    let i = 0

    if (slots.length === 0) {
      return []
    }

    merged[i] = { start: slots[i].start, end: slots[i].end }
    for (const slot of slots) {
      if (areIntervalsOverlapping(merged[i], slot, { inclusive: true })) {
        merged[i].start = min([merged[i].start, slot.start])
        merged[i].end = max([merged[i].end, slot.end])
      } else {
        i++
        merged[i] = { start: slot.start, end: slot.end }
      }
    }

    return merged
  },

  mergeSlotsIntersection: (slots: TimeSlot[]): Interval[] => {
    slots.sort((a, b) => compareAsc(a.start, b.start))
    const slotsByAccount = slots.reduce(
      (memo: Record<string, TimeSlot[]>, x) => {
        if (!memo[x.account_address]) {
          memo[x.account_address] = []
        }
        memo[x.account_address].push(x)
        return memo
      },
      {} as Record<string, TimeSlot[]>
    )

    const slotsByAccountArray: Array<Array<TimeSlot>> = []
    for (const [_, value] of Object.entries(slotsByAccount)) {
      slotsByAccountArray.push(value)
    }

    if (slotsByAccountArray.length < 2) {
      return []
    }

    slotsByAccountArray.sort((a, b) => a.length - b.length)

    const findOverlappingSlots = (
      slots1: Interval[],
      slots2: TimeSlot[]
    ): Interval[] => {
      const _overlaps = []

      for (const slot1 of slots1) {
        for (const slot2 of slots2) {
          if (areIntervalsOverlapping(slot1, slot2, { inclusive: true })) {
            const toPush = {
              start: max([slot1.start, slot2.start]),
              end: min([slot1.end, slot2.end]),
            }
            if (differenceInSeconds(toPush.end, toPush.start) > 0) {
              _overlaps.push(toPush)
            }
          }
        }
      }
      return _overlaps
    }

    let overlaps = (slotsByAccountArray[0] as TimeSlot[]).map(slot => {
      return {
        start: slot.start,
        end: slot.end,
      }
    })
    for (let i = 1; i < slotsByAccountArray.length; i++) {
      if (overlaps.length > 0) {
        overlaps = findOverlappingSlots(
          overlaps,
          slotsByAccountArray[i] as TimeSlot[]
        )
      } else {
        return []
      }
    }

    return overlaps
  },
  getCalendarEventsForAccount: async (
    account_address: string,
    startDate: Date,
    endDate: Date,
    onlyWithMeetingLinks?: boolean
  ): Promise<UnifiedEvent[]> => {
    const calendars = await getConnectedCalendars(account_address)
    const events = await Promise.all(
      calendars.map(async calendar => {
        const integration = getConnectedCalendarIntegration(
          calendar.account_address,
          calendar.email,
          calendar.provider,
          calendar.payload
        )

        const externalSlots = await integration.getEvents(
          calendar.calendars!.filter(c => c.enabled).map(c => c.calendarId),
          startDate.toISOString(),
          endDate.toISOString(),
          onlyWithMeetingLinks
        )
        return externalSlots
      })
    )
    return events.flat()
  },
  updateCalendarEvent: async (
    account_address: string,
    unifiedEvent: UnifiedEvent
  ): Promise<void> => {
    try {
      // Validate required fields
      if (
        !unifiedEvent.source ||
        !unifiedEvent.calendarId ||
        !unifiedEvent.sourceEventId
      ) {
        throw new Error(
          'Missing required fields: source, calendarId, or sourceEventId'
        )
      }

      // Find the calendar integration for this event
      const calendars = await getConnectedCalendars(account_address)

      const targetCalendar = calendars.find(
        cal =>
          cal.provider === unifiedEvent.source &&
          cal.email === unifiedEvent.accountEmail &&
          cal.calendars?.some(
            c => c.calendarId === unifiedEvent.calendarId && c.enabled
          )
      )

      if (!targetCalendar) {
        throw new Error(
          `Calendar not found or not enabled for source: ${unifiedEvent.source}, email: ${unifiedEvent.accountEmail}, calendarId: ${unifiedEvent.calendarId}`
        )
      }

      // Map attendee status to participation status
      const mapAttendeeStatusToParticipation = (
        status: AttendeeStatus
      ): ParticipationStatus => {
        switch (status) {
          case AttendeeStatus.ACCEPTED:
          case AttendeeStatus.COMPLETED:
            return ParticipationStatus.Accepted
          case AttendeeStatus.DECLINED:
            return ParticipationStatus.Rejected
          case AttendeeStatus.DELEGATED:
          case AttendeeStatus.TENTATIVE:
          default:
            return ParticipationStatus.Pending
        }
      }

      switch (targetCalendar.provider) {
        case TimeSlotSource.GOOGLE: {
          const integration = getConnectedCalendarIntegration(
            targetCalendar.account_address,
            targetCalendar.email,
            targetCalendar.provider,
            targetCalendar.payload
          )
          await integration.updateExternalEvent(
            GoogleEventMapper.fromUnified(unifiedEvent)
          )
          break
        }
        case TimeSlotSource.OFFICE: {
          const integration = getConnectedCalendarIntegration(
            targetCalendar.account_address,
            targetCalendar.email,
            targetCalendar.provider,
            targetCalendar.payload
          )
          await integration.updateExternalEvent(
            Office365EventMapper.fromUnified(unifiedEvent)
          )
          break
        }
        case TimeSlotSource.WEBDAV:
        case TimeSlotSource.ICLOUD: {
          const integration = getConnectedCalendarIntegration(
            targetCalendar.account_address,
            targetCalendar.email,
            targetCalendar.provider,
            targetCalendar.payload
          )
          await integration.updateEventFromUnified(
            unifiedEvent.sourceEventId,
            unifiedEvent.calendarId,
            {
              summary: unifiedEvent.title,
              description: unifiedEvent.description || '',
              dtstart: unifiedEvent.start,
              dtend: unifiedEvent.end,
              location: unifiedEvent.meeting_url || '',
              attendees: (unifiedEvent.attendees || []).map(att => ({
                email: att.email,
                name: att.name || '',
                status: mapAttendeeStatusToParticipation(att.status),
              })),
            }
          )
          break
        }
      }
    } catch (error: any) {
      Sentry.captureException(error, {
        extra: {
          account_address,
          eventId: unifiedEvent.id,
          sourceEventId: unifiedEvent.sourceEventId,
          source: unifiedEvent.source,
          calendarId: unifiedEvent.calendarId,
        },
      })
      throw new Error(
        `Failed to update calendar event: ${error.message || error}`
      )
    }
  },
  updateCalendaRsvpStatus: async (
    account_address: string,
    calendarId: string,
    eventId: string,
    attendeeEmail: string,
    status: AttendeeStatus
  ): Promise<void> => {
    const calendars = await getConnectedCalendars(account_address)
    const targetCalendar = calendars.find(
      cal =>
        cal.calendars?.some(c => c.calendarId === calendarId && c.enabled) &&
        cal.calendars?.some(c => c.calendarId === calendarId)
    )

    if (!targetCalendar) {
      throw new Error(
        `Calendar not found or not enabled for calendarId: ${calendarId}`
      )
    }

    const integration = getConnectedCalendarIntegration(
      targetCalendar.account_address,
      targetCalendar.email,
      targetCalendar.provider,
      targetCalendar.payload
    )

    await integration.updateEventRsvpForExternalEvent(
      calendarId,
      eventId,
      attendeeEmail,
      status
    )
  },
}

export const generateIcsServer = async (
  meeting: MeetingCreationSyncRequest,
  ownerAddress: string,
  meetingStatus: MeetingChangeType,
  changeUrl?: string,
  useParticipants?: boolean,
  destination?: { accountAddress: string; email: string },
  isPrivate?: boolean
): Promise<
  ReturnObject & {
    attendees: Attendee[]
  }
> => {
  let url = meeting.meeting_url.trim()
  if (!isValidUrl(url)) {
    url = 'https://meetwith.xyz'
  }
  const start = DateTime.fromJSDate(new Date(meeting.start))
  const end = DateTime.fromJSDate(new Date(meeting.end))
  const created_at = DateTime.fromJSDate(new Date(meeting.created_at!))
  const event: EventAttributes = {
    uid: meeting.meeting_id.replaceAll('-', ''),
    start: [start.year, start.month, start.day, start.hour, start.minute],
    productId: '-//Meetwith//EN',
    end: [end.year, end.month, end.day, end.hour, end.minute],
    title: CalendarServiceHelper.getMeetingTitle(
      ownerAddress,
      meeting.participants,
      meeting.title
    ),
    description: CalendarServiceHelper.getMeetingSummary(
      meeting.content,
      meeting.meeting_url,
      changeUrl
    ),
    url,
    location: meeting.meeting_url,
    created: [
      created_at.year,
      created_at.month,
      created_at.day,
      created_at.hour,
      created_at.minute,
    ],
    organizer: {
      name: destination?.accountAddress,
      email: destination?.email,
    },
    status:
      meetingStatus === MeetingChangeType.DELETE ? 'CANCELLED' : 'CONFIRMED',
  }
  if (!isPrivate) {
    event.method = 'REQUEST'
    event.transp = 'OPAQUE'
    event.classification = 'PUBLIC'
  }
  if (meeting.meetingReminders) {
    event.alarms = meeting.meetingReminders.map(createAlarm)
  }
  if (
    meeting.meetingRepeat &&
    meeting?.meetingRepeat !== MeetingRepeat.NO_REPEAT
  ) {
    let RRULE = `FREQ=${meeting.meetingRepeat?.toUpperCase()};INTERVAL=1`
    const dayOfWeek = format(meeting.start, 'eeeeee').toUpperCase()
    const weekOfMonth = getWeekOfMonth(meeting.start)

    switch (meeting.meetingRepeat) {
      case MeetingRepeat.WEEKLY:
        RRULE += `;BYDAY=${dayOfWeek}`
        break
      case MeetingRepeat.MONTHLY:
        RRULE += `;BYSETPOS=${weekOfMonth};BYDAY=${dayOfWeek}`
        break
    }
    event.recurrenceRule = RRULE
  }
  event.attendees = []
  if (useParticipants) {
    const attendees = await Promise.all(
      meeting.participants.map(async participant => {
        const email =
          destination &&
          destination.accountAddress === participant.account_address
            ? destination.email
            : participant.guest_email ||
              (await getCalendarPrimaryEmail(participant.account_address!))
        if (!email && !isValidEmail(email)) return null
        const attendee: Attendee = {
          name: participant.name || participant.account_address,
          email,
          rsvp: participant.status === ParticipationStatus.Accepted,
          partstat: participantStatusToICSStatus(participant.status),
          role: 'REQ-PARTICIPANT',
        }

        if (participant.account_address) {
          attendee.dir = getCalendarRegularUrl(participant.account_address!)
        }
        return attendee
      })
    )
    event.attendees.push(
      ...attendees.filter((attendee): attendee is Attendee => attendee !== null)
    )
  }

  const icsEvent = createEvent(event)
  return { ...icsEvent, attendees: event.attendees }
}
