import { DateTime, Interval } from 'luxon'
import { useMemo } from 'react'

import {
  Dates,
  State,
} from '@/components/schedule/schedule-time-discover/SchedulePickTime'
import { Account } from '@/types/Account'
import { getAccountDisplayName } from '@/utils/user_manager'

const useSlotsWithAvailability = (
  dates: Array<Dates>,
  busySlots: Map<string, Interval<true>[]>,
  availableSlots: Map<string, Interval<true>[]>,
  meetingMembers: Account[],
  participantAvailabilities: string[],
  timezone: string
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

          const isUserAvailable = !isBusy && hasOverlap

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

        return {
          slot,
          state,
          userStates,
          slotKey: `${slot.start.toMillis()}-${slot.end.toMillis()}`,
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
  ])
}

export default useSlotsWithAvailability
