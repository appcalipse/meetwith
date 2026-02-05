import { DateTime, Interval } from 'luxon'
import slugify from 'slugify'

import { Account } from '@/types/Account'
import {
  AvailabilitySlot,
  MonthOption,
  PollDateRange,
  QuickPollBySlugResponse,
  QuickPollParticipant,
  QuickPollParticipantType,
} from '@/types/QuickPoll'
import { MeetingPermissions } from '@/utils/constants/schedule'

import { QUICKPOLL_SLUG_MAX_LENGTH } from './constants'
import { generateTimeSlots } from './slots.helper'

const convertQuickPollParticipant = (
  participant: QuickPollParticipant,
  existingAccountsMap?: Map<string, Account>
): Account => {
  const identifier = participant.account_address?.toLowerCase()
  const existingAccount = identifier
    ? existingAccountsMap?.get(identifier)
    : undefined

  if (existingAccount) {
    return {
      ...existingAccount,
      preferences: {
        ...existingAccount.preferences,
        availabilities: existingAccount.preferences?.availabilities || [],
        meetingProviders: existingAccount.preferences?.meetingProviders || [],
        name:
          participant.guest_name ||
          existingAccount.preferences?.name ||
          participant.guest_email,
        timezone:
          existingAccount.preferences?.timezone ||
          participant.timezone ||
          existingAccount.preferences?.timezone ||
          'UTC',
      },
    }
  }

  const mockAccount: Partial<Account> = {
    address: participant.account_address || participant.guest_email!,
    preferences: {
      availabilities: [],
      meetingProviders: [],
      name: participant.guest_name || participant.guest_email,
      timezone: participant.timezone || 'UTC',
    },
  }

  return mockAccount as Account
}

// Generate a unique slug for a poll based on title and random characters
export const generatePollSlug = (title: string): string => {
  const baseSlug = slugify(title, {
    lower: true,
    strict: true,
    trim: true,
  }).substring(0, QUICKPOLL_SLUG_MAX_LENGTH)

  const randomSuffix = Math.random().toString(36).substring(2, 6)
  return `${baseSlug}-${randomSuffix}`
}

export const mergeTimeRanges = (
  ranges: Array<{ start: string; end: string }>
): Array<{ start: string; end: string }> => {
  if (ranges.length === 0) return []

  // Sort ranges by start time
  const sorted = ranges.sort((a, b) => a.start.localeCompare(b.start))
  const merged: Array<{ start: string; end: string }> = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]
    const last = merged[merged.length - 1]

    // Check if current range overlaps
    if (current.start <= last.end) {
      // Merge ranges by extending the end time
      last.end = current.end > last.end ? current.end : last.end
    } else {
      // No overlap, add as new range
      merged.push(current)
    }
  }

  return merged
}

export const parsePollMeetingDateRange = (
  startsAt: string,
  endsAt: string,
  timezone: string
): PollDateRange | null => {
  const start = DateTime.fromISO(startsAt, { zone: 'utc' })
    .setZone(timezone)
    .startOf('day')
  const end = DateTime.fromISO(endsAt, { zone: 'utc' })
    .setZone(timezone)
    .endOf('day')
  if (!start.isValid || !end.isValid) return null
  return { pollStart: start, pollEnd: end }
}

export const getMonthOptionsForPollRange = (
  pollStart: DateTime,
  pollEnd: DateTime
): MonthOption[] => {
  const options: MonthOption[] = []
  let cursor = pollStart.startOf('month')
  while (cursor <= pollEnd) {
    options.push({
      value: String(cursor.month),
      label: cursor.toFormat('MMMM yyyy'),
    })
    cursor = cursor.plus({ months: 1 })
  }
  return options
}

export const getDefaultMonthOptions = (
  timezone: string,
  count = 12
): MonthOption[] => {
  const options: MonthOption[] = []
  let cursor = DateTime.now().setZone(timezone)
  for (let i = 0; i < count; i++) {
    options.push({
      value: String(cursor.month),
      label: cursor.toFormat('MMMM yyyy'),
    })
    cursor = cursor.plus({ months: 1 })
  }
  return options
}

export const isDayInPollRange = (
  day: DateTime,
  pollStart: DateTime,
  pollEnd: DateTime,
  timezone: string
): boolean => {
  const dayStart = day.setZone(timezone).startOf('day')
  return dayStart >= pollStart && dayStart <= pollEnd.startOf('day')
}

export const clampDateTimeToPollRange = (
  dateTime: DateTime,
  pollStart: DateTime,
  pollEnd: DateTime
): DateTime => {
  const dayStart = dateTime.startOf('day')
  if (dayStart < pollStart) return pollStart
  if (dayStart > pollEnd.startOf('day')) return pollEnd.startOf('day')
  return dateTime
}

export const clampSlotTimeToPollRange = (
  slotStart: DateTime,
  pollStart: DateTime,
  pollEnd: DateTime
): DateTime => {
  if (slotStart < pollStart) return pollStart
  if (slotStart > pollEnd) return pollEnd
  return slotStart
}

export const filterSlotsToPollRange = <
  T extends { start: DateTime; end: DateTime }
>(
  slots: T[],
  pollStart: DateTime,
  pollEnd: DateTime
): T[] => {
  return slots.filter(slot => slot.start >= pollStart && slot.end <= pollEnd)
}

export const clampMonthRangeToPollRange = (
  monthStart: DateTime,
  monthEnd: DateTime,
  pollStart: DateTime,
  pollEnd: DateTime
): { monthStart: DateTime; monthEnd: DateTime } => {
  let start = monthStart
  let end = monthEnd
  if (monthStart < pollStart) start = pollStart
  if (monthEnd > pollEnd) end = pollEnd
  return { monthStart: start, monthEnd: end }
}

export const isPollRangeNextDisabled = (
  currentSelectedDate: DateTime,
  timezone: string,
  slotLength: number,
  pollEnd: DateTime | null
): boolean => {
  if (!pollEnd) return false
  const startOfView = currentSelectedDate.setZone(timezone).startOf('day')
  const lastDayInView = startOfView.plus({ days: slotLength - 1 })
  const endOfMonth = startOfView.endOf('month').startOf('day')
  const lastVisibleDay =
    lastDayInView <= endOfMonth ? lastDayInView : endOfMonth
  const pollEndStart = pollEnd.startOf('day')
  const effectiveLast =
    lastVisibleDay > pollEndStart ? pollEndStart : lastVisibleDay
  return effectiveLast >= pollEndStart
}

export const convertSelectedSlotsToAvailabilitySlots = (
  selectedSlots: Array<{ start: DateTime; end: DateTime; date: string }>
): Array<{
  weekday: number
  ranges: Array<{ start: string; end: string }>
  date: string
}> => {
  const slotsByDate = new Map<
    string,
    { weekday: number; ranges: Array<{ start: string; end: string }> }
  >()

  for (const slot of selectedSlots) {
    const date = slot.start.toFormat('yyyy-MM-dd')
    const weekday = slot.start.weekday === 7 ? 0 : slot.start.weekday
    const startTime = slot.start.toFormat('HH:mm')
    const endTime = slot.end.toFormat('HH:mm')

    if (!slotsByDate.has(date)) {
      slotsByDate.set(date, { ranges: [], weekday })
    }

    slotsByDate.get(date)!.ranges.push({
      end: endTime,
      start: startTime,
    })
  }

  const availabilitySlots: Array<{
    weekday: number
    ranges: Array<{ start: string; end: string }>
    date: string
  }> = []
  slotsByDate.forEach((value, date) => {
    availabilitySlots.push({
      date,
      ranges: value.ranges,
      weekday: value.weekday,
    })
  })

  return availabilitySlots
}

/**
 * Computes base availability for a participant (without overrides).
 * Base = calendar free slots + default availability blocks + manual slots (excluding existing overrides)
 */
export const computeBaseAvailability = (
  participant: { available_slots?: AvailabilitySlot[]; timezone?: string },
  manualIntervals: Interval[],
  defaultIntervals: Interval[],
  busyIntervals: Interval[],
  monthStart: Date,
  monthEnd: Date,
  timezone: string
): Interval[] => {
  // Get manual ranges from available_slots (excluding overrides)
  const manualFromSlots: Interval[] = []
  if (participant.available_slots) {
    for (const slot of participant.available_slots) {
      const intervals = convertAvailabilitySlotRangesToIntervals(
        slot,
        monthStart,
        monthEnd,
        timezone,
        participant.timezone
      )
      manualFromSlots.push(...intervals)
    }
  }

  // Combine manual intervals
  const allManual = mergeLuxonIntervals([
    ...manualIntervals,
    ...manualFromSlots,
  ])

  // Determine calendar base
  let calendarBase: Interval[] = []
  if (defaultIntervals.length > 0) {
    calendarBase = defaultIntervals
  } else if (allManual.length > 0) {
    calendarBase = allManual
  } else {
    // Generate full day blocks
    const startDT = DateTime.fromJSDate(monthStart).setZone(timezone)
    const endDT = DateTime.fromJSDate(monthEnd).setZone(timezone)
    let currentDay = startDT.startOf('day')
    while (currentDay <= endDT.endOf('day')) {
      const dayStart = currentDay.set({ hour: 0, minute: 0 })
      const dayEnd = currentDay.set({ hour: 23, minute: 59 })
      const interval = Interval.fromDateTimes(dayStart, dayEnd)
      if (interval.isValid) {
        calendarBase.push(interval)
      }
      currentDay = currentDay.plus({ days: 1 })
    }
  }

  // Compute calendar free (base minus busy times)
  let calendarFree: Interval[] = calendarBase
  if (busyIntervals.length > 0 && calendarBase.length > 0) {
    // Subtract busy times from calendar base
    const freeSlots: Interval[] = []
    for (const block of calendarBase) {
      let remainingIntervals = [block]
      for (const busyTime of busyIntervals) {
        const newRemaining: Interval[] = []
        for (const remaining of remainingIntervals) {
          if (!remaining.overlaps(busyTime)) {
            newRemaining.push(remaining)
            continue
          }
          if (
            remaining.start &&
            busyTime.start &&
            remaining.start < busyTime.start
          ) {
            const beforeBusy = Interval.fromDateTimes(
              remaining.start,
              busyTime.start
            )
            if (beforeBusy.isValid && beforeBusy.length('minutes') > 0) {
              newRemaining.push(beforeBusy)
            }
          }
          if (remaining.end && busyTime.end && remaining.end > busyTime.end) {
            const afterBusy = Interval.fromDateTimes(
              busyTime.end,
              remaining.end
            )
            if (afterBusy.isValid && afterBusy.length('minutes') > 0) {
              newRemaining.push(afterBusy)
            }
          }
        }
        remainingIntervals = newRemaining
      }
      freeSlots.push(...remainingIntervals)
    }
    calendarFree = freeSlots
  }

  // Base availability = manual + calendar free
  let baseAvailability = mergeLuxonIntervals([...allManual, ...calendarFree])

  // Subtract existing removals from base availability
  // This ensures that when a user re-selects a previously removed slot,
  // it will be detected as an addition (not in base) rather than just being in ranges
  if (participant.available_slots) {
    const existingRemovals: Interval[] = []
    for (const slot of participant.available_slots) {
      if (slot.overrides?.removals?.length) {
        for (const removal of slot.overrides.removals) {
          const [startHour, startMinute] = removal.start.split(':').map(Number)
          const [endHour, endMinute] = removal.end.split(':').map(Number)

          if (slot.date) {
            const specificDate = DateTime.fromISO(slot.date, {
              zone: participant.timezone || timezone,
            }).setZone(timezone)
            const monthStartDT =
              DateTime.fromJSDate(monthStart).setZone(timezone)
            const monthEndDT = DateTime.fromJSDate(monthEnd).setZone(timezone)

            if (
              specificDate >= monthStartDT.startOf('day') &&
              specificDate <= monthEndDT.endOf('day')
            ) {
              const slotStart = specificDate.set({
                hour: startHour,
                minute: startMinute,
              })
              const slotEnd = specificDate.set({
                hour: endHour,
                minute: endMinute,
              })
              const interval = Interval.fromDateTimes(slotStart, slotEnd)
              if (interval.isValid) {
                existingRemovals.push(interval)
              }
            }
          } else {
            // Recurring weekday removal
            const startOfMonth =
              DateTime.fromJSDate(monthStart).setZone(timezone)
            const endOfMonth = DateTime.fromJSDate(monthEnd).setZone(timezone)
            let currentDay = startOfMonth.startOf('month')
            while (currentDay <= endOfMonth.endOf('month')) {
              const luxonWeekday = slot.weekday === 0 ? 7 : slot.weekday
              if (currentDay.weekday === luxonWeekday) {
                const slotStart = currentDay.set({
                  hour: startHour,
                  minute: startMinute,
                })
                const slotEnd = currentDay.set({
                  hour: endHour,
                  minute: endMinute,
                })
                const interval = Interval.fromDateTimes(slotStart, slotEnd)
                if (interval.isValid) {
                  existingRemovals.push(interval)
                }
              }
              currentDay = currentDay.plus({ days: 1 })
            }
          }
        }
      }
    }

    // Subtract removals from base availability
    if (existingRemovals.length > 0) {
      const mergedRemovals = mergeLuxonIntervals(existingRemovals)
      const afterRemovals: Interval[] = []
      for (const availInterval of baseAvailability) {
        let remaining = [availInterval]
        for (const removalInterval of mergedRemovals) {
          const newRemaining: Interval[] = []
          for (const remainingInterval of remaining) {
            if (!remainingInterval.overlaps(removalInterval)) {
              newRemaining.push(remainingInterval)
              continue
            }
            // Split interval around removal
            if (
              remainingInterval.start &&
              removalInterval.start &&
              remainingInterval.start < removalInterval.start
            ) {
              const before = Interval.fromDateTimes(
                remainingInterval.start,
                removalInterval.start
              )
              if (before.isValid && before.length('minutes') > 0) {
                newRemaining.push(before)
              }
            }
            if (
              remainingInterval.end &&
              removalInterval.end &&
              remainingInterval.end > removalInterval.end
            ) {
              const after = Interval.fromDateTimes(
                removalInterval.end,
                remainingInterval.end
              )
              if (after.isValid && after.length('minutes') > 0) {
                newRemaining.push(after)
              }
            }
          }
          remaining = newRemaining
        }
        afterRemovals.push(...remaining)
      }
      baseAvailability = mergeLuxonIntervals(afterRemovals)
    }
  }

  return baseAvailability
}

/**
 * Computes overrides by comparing selected slots with base availability.
 * Base availability = calendar free slots + default availability blocks + manual slots (before overrides)
 */
export const computeAvailabilityWithOverrides = (
  selectedSlots: Array<{ start: DateTime; end: DateTime; date: string }>,
  baseAvailability: Interval[],
  monthStart: Date,
  monthEnd: Date,
  timezone: string
): AvailabilitySlot[] => {
  // Convert selected slots to intervals
  const selectedIntervals = selectedSlots
    .map(slot => Interval.fromDateTimes(slot.start, slot.end))
    .filter(interval => interval.isValid)

  // Merge base availability intervals
  const mergedBase = mergeLuxonIntervals(baseAvailability)

  // Determine additions: selected slots that are NOT in base (making busy slots available)
  const additions: Interval[] = []
  for (const selectedInterval of selectedIntervals) {
    const isInBase = mergedBase.some(baseInterval => {
      if (!selectedInterval.isValid || !baseInterval.isValid) return false
      return (
        baseInterval.overlaps(selectedInterval) ||
        (baseInterval.start &&
          baseInterval.end &&
          selectedInterval.start &&
          selectedInterval.end &&
          baseInterval.start <= selectedInterval.start &&
          baseInterval.end >= selectedInterval.end)
      )
    })
    if (!isInBase) {
      additions.push(selectedInterval)
    }
  }

  // Determine removals: base availability slots that are NOT selected (making free slots busy)
  const removals: Interval[] = []
  for (const baseInterval of mergedBase) {
    if (!baseInterval.isValid || !baseInterval.start || !baseInterval.end)
      continue

    // Find all selected intervals that overlap with this base interval
    const overlappingSelected = selectedIntervals.filter(selectedInterval => {
      if (
        !selectedInterval.isValid ||
        !selectedInterval.start ||
        !selectedInterval.end
      )
        return false
      return selectedInterval.overlaps(baseInterval)
    })

    if (overlappingSelected.length === 0) {
      // No overlap at all
      removals.push(baseInterval)
    } else {
      // Sort overlapping intervals by start time
      const sorted = overlappingSelected.sort((a, b) => {
        if (!a.start || !b.start) return 0
        return a.start.toMillis() - b.start.toMillis()
      })

      // Check if there are gaps in coverage
      let currentCoverageStart = baseInterval.start
      for (const selected of sorted) {
        if (!selected.start || !selected.end) continue
        // If there's a gap before this selected interval
        if (currentCoverageStart && selected.start > currentCoverageStart) {
          // There's a gap - add the uncovered portion to removals
          const gap = Interval.fromDateTimes(
            currentCoverageStart,
            selected.start
          )
          if (gap.isValid && gap.length('minutes') > 0) {
            removals.push(gap)
          }
        }
        // Update coverage start to the end of this selected interval
        if (
          selected.end &&
          (!currentCoverageStart || selected.end > currentCoverageStart)
        ) {
          currentCoverageStart = selected.end
        }
      }
      // Check if there's a gap at the end
      if (
        currentCoverageStart &&
        baseInterval.end &&
        currentCoverageStart < baseInterval.end
      ) {
        const gap = Interval.fromDateTimes(
          currentCoverageStart,
          baseInterval.end
        )
        if (gap.isValid && gap.length('minutes') > 0) {
          removals.push(gap)
        }
      }
    }
  }

  // Determine manual ranges: selected slots that ARE in base and NOT in removals
  const manualRanges: Interval[] = []
  for (const selectedInterval of selectedIntervals) {
    if (!selectedInterval.isValid) continue

    // Check if this selected interval overlaps with any removal
    const isInRemoval = removals.some(removalInterval => {
      if (!removalInterval.isValid) return false
      return removalInterval.overlaps(selectedInterval)
    })

    // If it's in a removal, don't add it to manual ranges (it will be removed via override)
    if (isInRemoval) continue

    // Check if this selected interval is in base availability
    const isInBase = mergedBase.some(baseInterval => {
      if (!baseInterval.isValid) return false
      return baseInterval.overlaps(selectedInterval)
    })

    // Only add to manual ranges if it's in base and not being removed
    if (isInBase) {
      manualRanges.push(selectedInterval)
    }
  }

  // Group by date and build AvailabilitySlot array
  const slotMap = new Map<
    string,
    {
      weekday: number
      date?: string
      ranges: Array<{ start: string; end: string }>
      overrides?: {
        additions?: Array<{ start: string; end: string }>
        removals?: Array<{ start: string; end: string }>
      }
    }
  >()

  // Helper to add intervals to slot map
  const addIntervalsToMap = (
    intervals: Interval[],
    type: 'ranges' | 'additions' | 'removals'
  ) => {
    for (const interval of intervals) {
      if (!interval.isValid || !interval.start || !interval.end) {
        continue
      }
      const date = interval.start.toFormat('yyyy-MM-dd')
      const weekday = interval.start.weekday === 7 ? 0 : interval.start.weekday
      const key = `date:${date}`

      let slot = slotMap.get(key)
      if (!slot) {
        slot = { date, ranges: [], weekday }
        slotMap.set(key, slot)
      }

      const timeRange = {
        end: interval.end.toFormat('HH:mm'),
        start: interval.start.toFormat('HH:mm'),
      }

      if (type === 'ranges') {
        slot.ranges.push(timeRange)
      } else {
        if (!slot.overrides) {
          slot.overrides = {}
        }
        if (type === 'additions') {
          if (!slot.overrides.additions) {
            slot.overrides.additions = []
          }
          slot.overrides.additions.push(timeRange)
        } else if (type === 'removals') {
          if (!slot.overrides.removals) {
            slot.overrides.removals = []
          }
          slot.overrides.removals.push(timeRange)
        }
      }
    }
  }

  // Add manual ranges, additions, and removals
  addIntervalsToMap(removals, 'removals')
  addIntervalsToMap(additions, 'additions')
  addIntervalsToMap(manualRanges, 'ranges')

  // Build final result
  const result: AvailabilitySlot[] = []
  for (const slot of slotMap.values()) {
    const finalSlot: AvailabilitySlot = {
      date: slot.date,
      ranges: mergeTimeRanges(slot.ranges),
      weekday: slot.weekday,
    }

    if (slot.overrides) {
      const mergedAdditions =
        slot.overrides.additions && slot.overrides.additions.length > 0
          ? mergeTimeRanges(slot.overrides.additions)
          : []
      const mergedRemovals =
        slot.overrides.removals && slot.overrides.removals.length > 0
          ? mergeTimeRanges(slot.overrides.removals)
          : []

      if (mergedAdditions.length > 0 || mergedRemovals.length > 0) {
        finalSlot.overrides = {}
        if (mergedAdditions.length > 0) {
          finalSlot.overrides.additions = mergedAdditions
        }
        if (mergedRemovals.length > 0) {
          finalSlot.overrides.removals = mergedRemovals
        }
      }
    }

    result.push(finalSlot)
  }

  return result
}

export const generateQuickPollBestSlots = (
  startDate: Date,
  endDate: Date,
  duration: number,
  timezone: string,
  participantAvailabilities: Map<string, Interval[]>
): Interval<true>[] => {
  const allSlots = generateTimeSlots(
    startDate,
    duration || 30,
    true,
    timezone,
    endDate
  ).filter(slot => slot.isValid)

  const now = DateTime.now().setZone(timezone)
  const participantIntervals = Array.from(participantAvailabilities.values())

  return allSlots
    .filter(slot => slot.start >= now)
    .filter(slot => {
      return participantIntervals.every(intervals =>
        intervals.some(availability => availability.overlaps(slot))
      )
    })
    .slice(0, 10)
}

/**
 * Subtracts busy time intervals from availability blocks.
 * Splits blocks around busy times to return only free periods.
 */
export const subtractBusyTimesFromBlocks = (
  blocks: Interval[],
  busyTimes: Interval[]
): Interval[] => {
  if (!blocks.length) return []

  const freeSlots: Interval[] = []

  for (const block of blocks) {
    let remainingIntervals = [block]

    for (const busyTime of busyTimes) {
      const newRemaining: Interval[] = []
      for (const remaining of remainingIntervals) {
        if (!remaining.overlaps(busyTime)) {
          newRemaining.push(remaining)
          continue
        }

        // Add interval before busy time
        if (
          remaining.start &&
          busyTime.start &&
          remaining.start < busyTime.start
        ) {
          const beforeBusy = Interval.fromDateTimes(
            remaining.start,
            busyTime.start
          )
          if (beforeBusy.isValid && beforeBusy.length('minutes') > 0) {
            newRemaining.push(beforeBusy)
          }
        }
        // Add interval after busy time
        if (remaining.end && busyTime.end && remaining.end > busyTime.end) {
          const afterBusy = Interval.fromDateTimes(busyTime.end, remaining.end)
          if (afterBusy.isValid && afterBusy.length('minutes') > 0) {
            newRemaining.push(afterBusy)
          }
        }
      }
      remainingIntervals = newRemaining
    }

    freeSlots.push(...remainingIntervals)
  }

  return freeSlots
}

/**
 * Subtracts removal intervals from availability intervals.
 * Similar to subtractBusyTimesFromBlocks but specifically for override removals.
 */
export const subtractRemovalIntervals = (
  availabilityIntervals: Interval[],
  removalIntervals: Interval[]
): Interval[] => {
  if (!removalIntervals.length) return availabilityIntervals

  const afterRemovals: Interval[] = []
  for (const availInterval of availabilityIntervals) {
    let remaining = [availInterval]
    for (const removalInterval of removalIntervals) {
      const newRemaining: Interval[] = []
      for (const remainingInterval of remaining) {
        if (!remainingInterval.overlaps(removalInterval)) {
          newRemaining.push(remainingInterval)
          continue
        }
        // Split interval around removal
        if (
          remainingInterval.start &&
          removalInterval.start &&
          remainingInterval.start < removalInterval.start
        ) {
          const before = Interval.fromDateTimes(
            remainingInterval.start,
            removalInterval.start
          )
          if (before.isValid && before.length('minutes') > 0) {
            newRemaining.push(before)
          }
        }
        if (
          remainingInterval.end &&
          removalInterval.end &&
          remainingInterval.end > removalInterval.end
        ) {
          const after = Interval.fromDateTimes(
            removalInterval.end,
            remainingInterval.end
          )
          if (after.isValid && after.length('minutes') > 0) {
            newRemaining.push(after)
          }
        }
      }
      remaining = newRemaining
    }
    afterRemovals.push(...remaining)
  }

  return afterRemovals
}

/**
 * Generates full day blocks (00:00-23:59) for each day in the given month range.
 */
export const generateFullDayBlocks = (
  monthStart: Date,
  monthEnd: Date,
  timezone: string
): Interval[] => {
  const defaultBlocks: Interval[] = []
  const startDT = DateTime.fromJSDate(monthStart).setZone(timezone)
  const endDT = DateTime.fromJSDate(monthEnd).setZone(timezone)

  let currentDay = startDT.startOf('day')
  while (currentDay <= endDT.endOf('day')) {
    const dayStart = currentDay.set({ hour: 0, minute: 0 })
    const dayEnd = currentDay.set({ hour: 23, minute: 59 })

    const interval = Interval.fromDateTimes(dayStart, dayEnd)
    if (interval.isValid) {
      defaultBlocks.push(interval)
    }

    currentDay = currentDay.plus({ days: 1 })
  }

  return defaultBlocks
}

/**
 * Clips intervals to only include portions within the given bounds.
 */
export const clipIntervalsToBounds = (
  intervals: Interval[],
  bounds: Interval[]
): Interval[] => {
  if (!bounds.length || !intervals.length) return intervals

  const clipped: Interval[] = []
  for (const bound of bounds) {
    for (const interval of intervals) {
      const intersection = interval.intersection(bound)
      if (
        intersection &&
        intersection.isValid &&
        intersection.length('minutes') > 0
      ) {
        clipped.push(intersection)
      }
    }
  }

  return mergeLuxonIntervals(clipped)
}

/**
 * Computes month start and end dates for availability calculations.
 */
export const getMonthRange = (
  currentSelectedDate: Date,
  timezone: string
): { monthStart: Date; monthEnd: Date } => {
  const monthStart = DateTime.fromJSDate(currentSelectedDate)
    .setZone(timezone)
    .startOf('month')
    .toJSDate()
  const monthEnd = DateTime.fromJSDate(currentSelectedDate)
    .setZone(timezone)
    .endOf('month')
    .toJSDate()
  return { monthEnd, monthStart }
}

/**
 * Converts raw busy slot data from API to Interval objects.
 */
export const convertBusySlotsToIntervals = (
  busySlotsRaw: Array<{ start: unknown; end: unknown }>
): Interval[] => {
  return busySlotsRaw
    .map(slot => {
      const startDate =
        slot.start instanceof Date
          ? slot.start
          : new Date(slot.start as string | number)
      const endDate =
        slot.end instanceof Date
          ? slot.end
          : new Date(slot.end as string | number)

      return Interval.fromDateTimes(
        DateTime.fromJSDate(startDate),
        DateTime.fromJSDate(endDate)
      )
    })
    .filter(interval => interval.isValid)
}

/**
 * Computes availability slots with overrides from selected slots.
 */
export const computeAvailabilitySlotsWithOverrides = (
  selectedSlots: Array<{ start: DateTime; end: DateTime; date: string }>,
  baseAvailability: Interval[],
  monthStart: Date,
  monthEnd: Date,
  timezone: string
): AvailabilitySlot[] => {
  try {
    return computeAvailabilityWithOverrides(
      selectedSlots,
      baseAvailability,
      monthStart,
      monthEnd,
      timezone
    )
  } catch (_error) {
    // Fallback
    return convertSelectedSlotsToAvailabilitySlots(selectedSlots)
  }
}

/**
 * Checks if two time slot intervals overlap or one contains the other.
 */
export const doSlotsOverlapOrContain = (
  slot1: { start: DateTime; end: DateTime },
  slot2: { start: DateTime; end: DateTime }
): boolean => {
  const interval1 = Interval.fromDateTimes(slot1.start, slot1.end)
  const interval2 = Interval.fromDateTimes(slot2.start, slot2.end)

  // Return false if either interval is invalid (they don't overlap)
  if (!interval1.isValid || !interval2.isValid) {
    return false
  }

  return interval1.overlaps(interval2)
}

/**
 * Converts availability intervals to selected time slots that match rendered slots.
 * Used for pre-selecting existing availability when editing starts.
 */
export const convertAvailabilityToSelectedSlots = (
  availabilityIntervals: Interval[],
  renderedSlots: Interval[]
): Array<{ start: DateTime; end: DateTime; date: string }> => {
  const selectedTimeSlots: Array<{
    start: DateTime
    end: DateTime
    date: string
  }> = []

  renderedSlots.forEach(renderedSlot => {
    if (!renderedSlot.isValid || !renderedSlot.start || !renderedSlot.end) {
      return
    }

    availabilityIntervals.forEach(availabilityInterval => {
      if (
        !availabilityInterval.isValid ||
        !availabilityInterval.start ||
        !availabilityInterval.end
      ) {
        return
      }

      if (
        renderedSlot.overlaps(availabilityInterval) &&
        renderedSlot.start &&
        renderedSlot.end
      ) {
        selectedTimeSlots.push({
          date: renderedSlot.start.toFormat('yyyy-MM-dd'),
          end: renderedSlot.end,
          start: renderedSlot.start,
        })
      }
    })
  })

  // Remove duplicates
  return selectedTimeSlots.filter(
    (slot, index, self) =>
      index ===
      self.findIndex(s => s.start.equals(slot.start) && s.end.equals(slot.end))
  )
}

export const mergeLuxonIntervals = (intervals: Interval[]): Interval[] => {
  const normalised = intervals.reduce<
    Array<{ start: DateTime; end: DateTime; interval: Interval }>
  >((accumulator, interval) => {
    if (!interval || !interval.isValid || !interval.start || !interval.end) {
      return accumulator
    }

    accumulator.push({
      end: interval.end,
      interval,
      start: interval.start,
    })

    return accumulator
  }, [])

  if (!normalised.length) {
    return []
  }

  const deduplicated: Array<{
    start: DateTime
    end: DateTime
    interval: Interval
  }> = []
  for (const current of normalised) {
    const currentInterval = Interval.fromDateTimes(current.start, current.end)
    const hasOverlap = deduplicated.some(existing => {
      const existingInterval = Interval.fromDateTimes(
        existing.start,
        existing.end
      )
      return currentInterval.overlaps(existingInterval)
    })
    if (!hasOverlap) {
      deduplicated.push(current)
    }
  }

  if (!deduplicated.length) {
    return []
  }

  deduplicated.sort((a, b) => a.start.toMillis() - b.start.toMillis())

  const merged: Array<{ start: DateTime; end: DateTime }> = [
    { end: deduplicated[0].end, start: deduplicated[0].start },
  ]

  for (let i = 1; i < deduplicated.length; i++) {
    const current = deduplicated[i]
    const last = merged[merged.length - 1]

    if (last.end.toMillis() >= current.start.toMillis()) {
      if (current.end.toMillis() > last.end.toMillis()) {
        last.end = current.end
      }
    } else {
      merged.push({ end: current.end, start: current.start })
    }
  }

  return merged.map(interval =>
    Interval.fromDateTimes(interval.start, interval.end)
  )
}

export const mergeAvailabilitySlots = (
  existingSlots: AvailabilitySlot[],
  newSlots: AvailabilitySlot[]
): AvailabilitySlot[] => {
  if (!existingSlots?.length && !newSlots?.length) {
    return []
  }

  const slotMap = new Map<string, AvailabilitySlot>()

  const normalizeSlot = (
    slot: AvailabilitySlot | undefined
  ): AvailabilitySlot | undefined => {
    if (!slot) return undefined

    const normalized: AvailabilitySlot = {
      date: slot.date,
      ranges: mergeTimeRanges(slot.ranges || []),
      weekday: slot.weekday,
    }

    if (slot.overrides) {
      const additions = slot.overrides.additions
        ? mergeTimeRanges(slot.overrides.additions)
        : []
      const removals = slot.overrides.removals
        ? mergeTimeRanges(slot.overrides.removals)
        : []

      if (additions.length > 0 || removals.length > 0) {
        normalized.overrides = {}
        if (additions.length > 0) {
          normalized.overrides.additions = additions
        }
        if (removals.length > 0) {
          normalized.overrides.removals = removals
        }
      }
    }

    return normalized
  }

  // Seed map with existing slots
  existingSlots?.forEach(slot => {
    const key = slot.date ? `date:${slot.date}` : `weekday:${slot.weekday}`
    const normalized = normalizeSlot(slot)
    if (normalized) {
      slotMap.set(key, normalized)
    }
  })

  // New slots are authoritative for their keys - overwrite existing entries
  newSlots?.forEach(slot => {
    const key = slot.date ? `date:${slot.date}` : `weekday:${slot.weekday}`
    const normalized = normalizeSlot(slot)
    if (normalized) {
      slotMap.set(key, normalized)
    }
  })

  return Array.from(slotMap.values())
}

/**
 * Converts availability slot ranges to intervals
 */
export const convertAvailabilitySlotRangesToIntervals = (
  daySlot: AvailabilitySlot,
  monthStart: Date,
  monthEnd: Date,
  timezone: string,
  participantTimezone?: string
): Interval[] => {
  const intervals: Interval[] = []

  if (!daySlot.ranges?.length) return intervals

  for (const range of daySlot.ranges) {
    const [startHour, startMinute] = range.start.split(':').map(Number)
    const [endHour, endMinute] = range.end.split(':').map(Number)

    // If a specific date is provided, only create interval for that date
    if (daySlot.date) {
      const specificDate = DateTime.fromISO(daySlot.date, {
        zone: participantTimezone || timezone,
      })

      const monthStartDT = DateTime.fromJSDate(monthStart).setZone(timezone)
      const monthEndDT = DateTime.fromJSDate(monthEnd).setZone(timezone)

      if (
        specificDate >= monthStartDT.startOf('day') &&
        specificDate <= monthEndDT.endOf('day')
      ) {
        const slotStart = specificDate.set({
          hour: startHour,
          minute: startMinute,
        })
        const slotEnd = specificDate.set({
          hour: endHour,
          minute: endMinute,
        })

        const interval = Interval.fromDateTimes(slotStart, slotEnd)
        if (interval.isValid) {
          intervals.push(interval)
        }
      }
    } else {
      // If no specific date, treat as recurring weekly availability
      const startOfMonth = DateTime.fromJSDate(monthStart).setZone(timezone)
      const endOfMonth = DateTime.fromJSDate(monthEnd).setZone(timezone)

      let currentDay = startOfMonth.startOf('month')
      while (currentDay <= endOfMonth.endOf('month')) {
        // Convert weekday (0=Sunday) to Luxon weekday (1=Monday, 7=Sunday)
        const luxonWeekday = daySlot.weekday === 0 ? 7 : daySlot.weekday

        if (currentDay.weekday === luxonWeekday) {
          const slotStart = currentDay.set({
            hour: startHour,
            minute: startMinute,
          })
          const slotEnd = currentDay.set({
            hour: endHour,
            minute: endMinute,
          })

          const interval = Interval.fromDateTimes(slotStart, slotEnd)
          if (interval.isValid) {
            intervals.push(interval)
          }
        }
        currentDay = currentDay.plus({ days: 1 })
      }
    }
  }

  return intervals
}

/**
 * Extracts override intervals from availability slots
 */
export const extractOverrideIntervals = (
  participant: { available_slots?: AvailabilitySlot[]; timezone?: string },
  monthStart: Date,
  monthEnd: Date,
  timezone: string
): {
  additions: Interval[]
  removals: Interval[]
} => {
  const additions: Interval[] = []
  const removals: Interval[] = []

  if (!participant.available_slots?.length) {
    return { additions, removals }
  }

  for (const daySlot of participant.available_slots) {
    if (!daySlot.overrides) continue

    // Process additions
    if (daySlot.overrides.additions?.length) {
      for (const range of daySlot.overrides.additions) {
        const [startHour, startMinute] = range.start.split(':').map(Number)
        const [endHour, endMinute] = range.end.split(':').map(Number)

        if (daySlot.date) {
          // Parse the date in the participant's timezone, then convert to display timezone
          const specificDateInParticipantTz = DateTime.fromISO(daySlot.date, {
            zone: participant.timezone || timezone,
          })
          // Convert to the display timezone for consistent comparison
          const specificDate = specificDateInParticipantTz.setZone(timezone)
          const monthStartDT = DateTime.fromJSDate(monthStart).setZone(timezone)
          const monthEndDT = DateTime.fromJSDate(monthEnd).setZone(timezone)

          if (
            specificDate >= monthStartDT.startOf('day') &&
            specificDate <= monthEndDT.endOf('day')
          ) {
            const slotStart = specificDate.set({
              hour: startHour,
              minute: startMinute,
            })
            const slotEnd = specificDate.set({
              hour: endHour,
              minute: endMinute,
            })
            const interval = Interval.fromDateTimes(slotStart, slotEnd)
            if (interval.isValid) {
              additions.push(interval)
            }
          }
        } else {
          const startOfMonth = DateTime.fromJSDate(monthStart).setZone(timezone)
          const endOfMonth = DateTime.fromJSDate(monthEnd).setZone(timezone)
          let currentDay = startOfMonth.startOf('month')
          while (currentDay <= endOfMonth.endOf('month')) {
            const luxonWeekday = daySlot.weekday === 0 ? 7 : daySlot.weekday
            if (currentDay.weekday === luxonWeekday) {
              const slotStart = currentDay.set({
                hour: startHour,
                minute: startMinute,
              })
              const slotEnd = currentDay.set({
                hour: endHour,
                minute: endMinute,
              })
              const interval = Interval.fromDateTimes(slotStart, slotEnd)
              if (interval.isValid) {
                additions.push(interval)
              }
            }
            currentDay = currentDay.plus({ days: 1 })
          }
        }
      }
    }

    // Process removals
    if (daySlot.overrides.removals?.length) {
      for (const range of daySlot.overrides.removals) {
        const [startHour, startMinute] = range.start.split(':').map(Number)
        const [endHour, endMinute] = range.end.split(':').map(Number)

        if (daySlot.date) {
          // Parse the date in the participant's timezone, then convert to display timezone
          const specificDateInParticipantTz = DateTime.fromISO(daySlot.date, {
            zone: participant.timezone || timezone,
          })
          // Convert to the display timezone for consistent comparison
          const specificDate = specificDateInParticipantTz.setZone(timezone)
          const monthStartDT = DateTime.fromJSDate(monthStart).setZone(timezone)
          const monthEndDT = DateTime.fromJSDate(monthEnd).setZone(timezone)

          if (
            specificDate >= monthStartDT.startOf('day') &&
            specificDate <= monthEndDT.endOf('day')
          ) {
            const slotStart = specificDate.set({
              hour: startHour,
              minute: startMinute,
            })
            const slotEnd = specificDate.set({
              hour: endHour,
              minute: endMinute,
            })
            const interval = Interval.fromDateTimes(slotStart, slotEnd)
            if (interval.isValid) {
              removals.push(interval)
            }
          }
        } else {
          const startOfMonth = DateTime.fromJSDate(monthStart).setZone(timezone)
          const endOfMonth = DateTime.fromJSDate(monthEnd).setZone(timezone)
          let currentDay = startOfMonth.startOf('month')
          while (currentDay <= endOfMonth.endOf('month')) {
            const luxonWeekday = daySlot.weekday === 0 ? 7 : daySlot.weekday
            if (currentDay.weekday === luxonWeekday) {
              const slotStart = currentDay.set({
                hour: startHour,
                minute: startMinute,
              })
              const slotEnd = currentDay.set({
                hour: endHour,
                minute: endMinute,
              })
              const interval = Interval.fromDateTimes(slotStart, slotEnd)
              if (interval.isValid) {
                removals.push(interval)
              }
            }
            currentDay = currentDay.plus({ days: 1 })
          }
        }
      }
    }
  }

  return { additions, removals }
}

export const processPollParticipantAvailabilities = (
  pollData: QuickPollBySlugResponse,
  groupAvailability: Record<string, Array<string>>,
  monthStart: Date,
  monthEnd: Date,
  timezone: string,
  currentAccount?: Account | null,
  isHost?: boolean,
  currentGuestEmail?: string
): Map<string, Interval[]> => {
  const availableSlotsMap: Map<string, Interval[]> = new Map()

  const visibleParticipants = new Set<string>()
  Object.values(groupAvailability)
    .flat()
    .forEach(addr => {
      visibleParticipants.add(addr.toLowerCase())
    })

  const participantsToProcess = getVisibleParticipants(
    pollData,
    currentAccount,
    isHost,
    currentGuestEmail
  )

  for (const participant of participantsToProcess) {
    if (
      !participant ||
      (!participant.account_address && !participant.guest_email) ||
      !participant.available_slots?.length
    )
      continue

    const participantIdentifier = (participant.account_address?.toLowerCase() ||
      participant.guest_email?.toLowerCase())!

    // Skip if this participant is not visible in groupAvailability
    if (!visibleParticipants.has(participantIdentifier)) continue

    const participantAvailabilities: Interval[] = []

    // Convert available_slots to Interval objects (only manual ranges, not overrides)
    for (const daySlot of participant.available_slots) {
      const intervals = convertAvailabilitySlotRangesToIntervals(
        daySlot,
        monthStart,
        monthEnd,
        timezone,
        participant.timezone
      )
      participantAvailabilities.push(...intervals)
    }

    availableSlotsMap.set(participantIdentifier, participantAvailabilities)
  }

  return availableSlotsMap
}

const getVisibleParticipants = (
  pollData: QuickPollBySlugResponse,
  currentAccount?: Account | null,
  isHost?: boolean,
  currentGuestEmail?: string
) => {
  // If current user is the scheduler/host, show all participants
  if (isHost) {
    return pollData.poll.participants
  }

  const hasSeeGuestListPermission = pollData.poll.permissions?.includes(
    MeetingPermissions.SEE_GUEST_LIST
  )

  if (hasSeeGuestListPermission) {
    return pollData.poll.participants
  } else {
    // If no permission, show only host and current participant
    const host = pollData.poll.participants.find(
      p => p.participant_type === QuickPollParticipantType.SCHEDULER
    )
    const currentParticipant = pollData.poll.participants.find(
      p =>
        p.account_address?.toLowerCase() ===
          currentAccount?.address?.toLowerCase() ||
        (currentGuestEmail &&
          p.guest_email?.toLowerCase() === currentGuestEmail.toLowerCase())
    )

    const visibleParticipants = [host].filter(Boolean)
    if (currentParticipant && currentParticipant !== host) {
      visibleParticipants.push(currentParticipant)
    }

    return visibleParticipants
  }
}

export const createMockMeetingMembers = (
  pollData: QuickPollBySlugResponse,
  currentAccount?: Account | null,
  isHost?: boolean,
  currentGuestEmail?: string,
  existingAccounts: Account[] = []
): Account[] => {
  const existingAccountMap = new Map(
    existingAccounts.map(account => [account.address.toLowerCase(), account])
  )

  const allParticipants = pollData.poll.participants.map(participant =>
    convertQuickPollParticipant(participant, existingAccountMap)
  )

  // If current user is the scheduler/host, show all participants
  if (isHost) {
    return allParticipants as Account[]
  }

  const hasSeeGuestListPermission = pollData.poll.permissions?.includes(
    MeetingPermissions.SEE_GUEST_LIST
  )

  if (hasSeeGuestListPermission) {
    return allParticipants as Account[]
  } else {
    // If no permission, show only host and current participant
    const host = pollData.poll.participants.find(
      p => p.participant_type === QuickPollParticipantType.SCHEDULER
    )
    const currentParticipant = pollData.poll.participants.find(
      p =>
        p.account_address?.toLowerCase() ===
          currentAccount?.address?.toLowerCase() ||
        (currentGuestEmail &&
          p.guest_email?.toLowerCase() === currentGuestEmail.toLowerCase())
    )

    const visibleParticipants = host ? [convertQuickPollParticipant(host)] : []
    if (currentParticipant && currentParticipant !== host) {
      visibleParticipants.push(convertQuickPollParticipant(currentParticipant))
    }

    return visibleParticipants as Account[]
  }
}
