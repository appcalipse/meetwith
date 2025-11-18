import * as Sentry from '@sentry/nextjs'
import {
  areIntervalsOverlapping,
  compareAsc,
  differenceInSeconds,
  Interval,
  max,
  min,
} from 'date-fns'
import { calendar_v3 } from 'googleapis'

import { ConditionRelation } from '@/types/common'
import { TimeSlot, TimeSlotSource } from '@/types/Meeting'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import { QuickPollBusyParticipant } from '@/types/QuickPoll'

import {
  getConnectedCalendars,
  getQuickPollCalendars,
  getSlotsForAccount,
} from '../database'
import { getCalendarPrimaryEmail } from '../sync_helper'
import { getConnectedCalendarIntegration } from './connected_calendars.factory'

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
      const calendars = await getConnectedCalendars(account_address, {
        activeOnly: true,
      })
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
    const slotsByAccount = slots.reduce((memo: any, x) => {
      if (!memo[x.account_address]) {
        memo[x.account_address] = []
      }
      memo[x.account_address].push(x)
      return memo
    }, {})

    const slotsByAccountArray = []
    for (const [key, value] of Object.entries(slotsByAccount)) {
      slotsByAccountArray.push(value)
    }

    if (slotsByAccountArray.length < 2) {
      return []
    }

    slotsByAccountArray.sort((a: any, b: any) => a.length - b.length)

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
  buildAttendeesList: async (
    participants: ParticipantInfo[],
    calendarOwnerAccountAddress: string,
    getConnectedEmail: () => string
  ): Promise<calendar_v3.Schema$EventAttendee[]> => {
    const addedEmails = new Set<string>()
    const attendees: calendar_v3.Schema$EventAttendee[] = []

    for (const participant of participants) {
      const isScheduler = participant.type === ParticipantType.Scheduler
      // If participant is scheduler and not the calendar owner this means they don't have any calendar configured for the specific meeting type, skip adding them
      const shouldSkip =
        isScheduler &&
        participant.account_address !== calendarOwnerAccountAddress
      if (shouldSkip) {
        continue
      }
      const email =
        calendarOwnerAccountAddress === participant.account_address
          ? getConnectedEmail()
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
  },

  buildAttendeesListForUpdate: async (
    participants: ParticipantInfo[],
    calendarOwnerAccountAddress: string,
    getConnectedEmail: () => string,
    actorStatus?: string,
    guestParticipant?: ParticipantInfo
  ): Promise<calendar_v3.Schema$EventAttendee[]> => {
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
          ? getConnectedEmail()
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
  },
}
