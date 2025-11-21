import { DateTime, Interval } from 'luxon'
import { useMemo } from 'react'

import {
  Dates,
  State,
} from '@/components/schedule/schedule-time-discover/SchedulePickTime'
import { Account } from '@/types/Account'
import { TimeSlot } from '@/types/Meeting'
import { generateCalendarEventUrl } from '@/utils/calendar_event_url'
import { getAccountDisplayName } from '@/utils/user_manager'

const useSlotsWithAvailability = (
  dates: Array<Dates>,
  busySlots: Map<string, Interval<true>[]>,
  availableSlots: Map<string, Interval<true>[]>,
  meetingMembers: Account[],
  participantAvailabilities: string[],
  timezone: string,
  busySlotsWithDetails?: Map<string, TimeSlot[]>,
  currentAccountAddress?: string
) => {
  return useMemo(() => {
    const now = DateTime.now().setZone(timezone)

    const accountDisplayNames = new Map<string, string>()
    meetingMembers.forEach(member => {
      accountDisplayNames.set(member.address, getAccountDisplayName(member))
    })

    return dates.map(dateData => ({
      ...dateData,
      slots: dateData.slots.map(slot => {
        const userStates: Array<{ state: boolean; displayName: string }> = []
        const isSlotAvailable: boolean[] = []

        for (const account of participantAvailabilities) {
          const accountSlots = availableSlots.get(account) || []
          const accountBusySlots = busySlots.get(account) || []

          const isBusy = accountBusySlots.some(busySlot =>
            busySlot.overlaps(slot)
          )

          const hasOverlap = accountSlots.some(availableSlot =>
            availableSlot.overlaps(slot)
          )

          const isUserAvailable = !isBusy && hasOverlap && slot.start >= now

          isSlotAvailable.push(isUserAvailable)
          userStates.push({
            state: isUserAvailable,
            displayName: accountDisplayNames.get(account) || '',
          })
        }

        const numberOfAvailable = isSlotAvailable.filter(Boolean).length
        let state: State

        if (numberOfAvailable === 0) {
          state = State.NONE_AVAILABLE
        } else if (numberOfAvailable === isSlotAvailable.length) {
          state = State.ALL_AVAILABLE
        } else if (numberOfAvailable >= isSlotAvailable.length / 2) {
          state = State.MOST_AVAILABLE
        } else {
          state = State.SOME_AVAILABLE
        }

        // Find overlapping event for current user if available
        let currentUserEvent: TimeSlot | null = null
        let eventUrl: string | null = null
        if (currentAccountAddress && busySlotsWithDetails) {
          const userBusySlots = busySlotsWithDetails.get(
            currentAccountAddress.toLowerCase()
          )
          if (userBusySlots && userBusySlots.length > 0) {
            const overlappingEvent = userBusySlots.find(busySlot => {
              const busyStart =
                busySlot.start instanceof Date
                  ? busySlot.start
                  : new Date(busySlot.start)
              const busyEnd =
                busySlot.end instanceof Date
                  ? busySlot.end
                  : new Date(busySlot.end)
              const busyInterval = Interval.fromDateTimes(
                DateTime.fromJSDate(busyStart),
                DateTime.fromJSDate(busyEnd)
              )
              return busyInterval.overlaps(slot)
            })

            // Only include event if it has event information
            if (
              overlappingEvent &&
              (overlappingEvent.eventTitle ||
                overlappingEvent.eventId ||
                overlappingEvent.eventWebLink)
            ) {
              currentUserEvent = overlappingEvent
              // Generate calendar URL for the event
              eventUrl = generateCalendarEventUrl(
                overlappingEvent.source,
                overlappingEvent.eventId,
                overlappingEvent.eventWebLink
              )
            }
          }
        }

        return {
          slot,
          state,
          userStates,
          slotKey: `${slot.start.toMillis()}-${slot.end.toMillis()}`,
          currentUserEvent,
          eventUrl,
        }
      }),
    }))
  }, [
    dates,
    busySlots,
    availableSlots,
    meetingMembers,
    participantAvailabilities,
    timezone,
    busySlotsWithDetails,
    currentAccountAddress,
  ])
}

export default useSlotsWithAvailability
