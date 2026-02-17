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

const hasOverlap = (
  slot: Interval<true>,
  sortedIntervals: Array<{ start: number; end: number }>
) => {
  const slotStart = slot.start.toMillis()
  const slotEnd = slot.end.toMillis()

  // Binary search for first interval that could overlap
  let left = 0
  let right = sortedIntervals.length

  while (left < right) {
    const mid = Math.floor((left + right) / 2)
    if (sortedIntervals[mid].end <= slotStart) {
      left = mid + 1
    } else {
      right = mid
    }
  }

  // Check if any interval starting from 'left' overlaps
  for (let i = left; i < sortedIntervals.length; i++) {
    const interval = sortedIntervals[i]
    if (interval.start >= slotEnd) break // No more possible overlaps
    if (interval.end > slotStart && interval.start < slotEnd) return true
  }

  return false
}

/**
 * Checks if the slot is fully contained (engulfed) by any interval.
 * Used for availability checks where the entire slot must fall within
 * an available window.
 */
const isEngulfed = (
  slot: Interval<true>,
  sortedIntervals: Array<{ start: number; end: number }>
) => {
  const slotStart = slot.start.toMillis()
  const slotEnd = slot.end.toMillis()

  // Binary search for the last interval where start <= slotStart
  let left = 0
  let right = sortedIntervals.length - 1
  let candidate = -1

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    if (sortedIntervals[mid].start <= slotStart) {
      candidate = mid
      left = mid + 1
    } else {
      right = mid - 1
    }
  }

  if (candidate === -1) return false
  return sortedIntervals[candidate].end >= slotEnd
}
const createIntervalLookup = (intervals: Interval<true>[]) => {
  return intervals
    .map(i => ({ end: i.end.toMillis(), start: i.start.toMillis() }))
    .sort((a, b) => a.start - b.start)
}
const useSlotsWithAvailability = (
  dates: Array<Dates>,
  busySlots: Map<string, Interval<true>[]>,
  availableSlots: Map<string, Interval<true>[]>,
  meetingMembers: Account[],
  participantAvailabilities: string[],
  timezone: string,
  busySlotsWithDetails?: Map<string, TimeSlot[]>,
  currentAccountAddress?: string,
  ignoreBusyOverlaps = false
) => {
  const busyLookupsMap = useMemo(() => {
    const map = new Map<string, Array<{ start: number; end: number }>>()
    busySlots.forEach((intervals, account) => {
      map.set(account, createIntervalLookup(intervals))
    })
    return map
  }, [busySlots])

  const availableLookupsMap = useMemo(() => {
    const map = new Map<string, Array<{ start: number; end: number }>>()
    availableSlots.forEach((intervals, account) => {
      map.set(account, createIntervalLookup(intervals))
    })
    return map
  }, [availableSlots])

  const processedUserBusySlots = useMemo(() => {
    if (!currentAccountAddress || !busySlotsWithDetails) return null

    const userBusySlots = busySlotsWithDetails.get(
      currentAccountAddress.toLowerCase()
    )

    if (!userBusySlots || userBusySlots.length === 0) return null

    // Filter and convert to milliseconds once
    return userBusySlots
      .filter(slot => slot.eventTitle || slot.eventId || slot.eventWebLink)
      .map(slot => ({
        end:
          slot.end instanceof Date
            ? slot.end.getTime()
            : new Date(slot.end).getTime(),
        start:
          slot.start instanceof Date
            ? slot.start.getTime()
            : new Date(slot.start).getTime(),
        timeSlot: slot,
      }))
      .sort((a, b) => a.start - b.start)
  }, [currentAccountAddress, busySlotsWithDetails])
  const nowMillis = useMemo(
    () => DateTime.now().setZone(timezone).toMillis(),
    [timezone]
  )

  return useMemo(() => {
    const accountDisplayNames = new Map<string, string>()
    meetingMembers.forEach(member => {
      accountDisplayNames.set(member.address, getAccountDisplayName(member))
    })

    return dates.map(dateData => ({
      ...dateData,
      slots: dateData.slots.map(slot => {
        const slotStart = slot.start.toMillis()
        const slotEnd = slot.end.toMillis()
        const isAfterNow = slotStart >= nowMillis

        let numberOfAvailable = 0
        const userStates: Array<{ state: boolean; displayName: string }> =
          participantAvailabilities.map(account => {
            const busyLookup = busyLookupsMap.get(account) || []
            const availableLookup = availableLookupsMap.get(account) || []

            const isBusy = hasOverlap(slot, busyLookup)
            const hasAvailability = isEngulfed(slot, availableLookup)

            const isUserAvailable = ignoreBusyOverlaps
              ? hasAvailability
              : !isBusy && hasAvailability
            if (isUserAvailable) {
              numberOfAvailable++
            }

            return {
              displayName: accountDisplayNames.get(account) || '',
              state: isUserAvailable,
            }
          })

        const totalParticipants = participantAvailabilities.length
        let state: State

        if (numberOfAvailable === 0) {
          state = State.NONE_AVAILABLE
        } else if (numberOfAvailable === totalParticipants) {
          state = State.ALL_AVAILABLE
        } else if (numberOfAvailable >= totalParticipants / 2) {
          state = State.MOST_AVAILABLE
        } else {
          state = State.SOME_AVAILABLE
        }

        // Find overlapping event for current user if available
        let currentUserEvent: TimeSlot | null = null
        let eventUrl: string | null = null
        if (processedUserBusySlots && isAfterNow) {
          // Binary search for overlapping event
          for (const processed of processedUserBusySlots) {
            if (processed.start >= slotEnd) break
            if (processed.end > slotStart && processed.start < slotEnd) {
              currentUserEvent = processed.timeSlot
              eventUrl = generateCalendarEventUrl(
                processed.timeSlot.source,
                processed.timeSlot.eventId,
                processed.timeSlot.eventWebLink
              )
              break
            }
          }
        }

        return {
          currentUserEvent,
          eventUrl,
          slot,
          slotKey: `${slot.start.toMillis()}-${slot.end.toMillis()}`,
          state,
          userStates,
        }
      }),
    }))
  }, [
    dates,
    busySlots,
    availableSlots,
    timezone,
    busySlotsWithDetails,
    currentAccountAddress,
    ignoreBusyOverlaps,
  ])
}

export default useSlotsWithAvailability
