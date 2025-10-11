import { DateTime, Interval } from 'luxon'
import slugify from 'slugify'

import { Account } from '@/types/Account'
import { QuickPollBySlugResponse } from '@/types/QuickPoll'
import {
  QuickPollParticipant,
  QuickPollParticipantType,
} from '@/types/QuickPoll'
import { MeetingPermissions } from '@/utils/constants/schedule'

import { QUICKPOLL_SLUG_MAX_LENGTH } from './constants'
import { generateTimeSlots } from './slots.helper'

const convertQuickPollParticipant = (
  participant: QuickPollParticipant
): Partial<Account> => ({
  address: participant.account_address || participant.guest_email!,
  preferences: {
    name: participant.guest_name || participant.guest_email,
    timezone: participant.timezone || 'UTC',
    availabilities: [],
    meetingProviders: [],
  },
})

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

    // Convert available_slots to Interval objects
    for (const daySlot of participant.available_slots) {
      if (!daySlot.ranges?.length) continue

      for (const range of daySlot.ranges) {
        // Create intervals for each day in the month that matches this weekday
        const startOfMonth = DateTime.fromJSDate(monthStart).setZone(timezone)
        const endOfMonth = DateTime.fromJSDate(monthEnd).setZone(timezone)

        let currentDay = startOfMonth.startOf('month')
        while (currentDay <= endOfMonth.endOf('month')) {
          // Convert weekday (0=Sunday) to Luxon weekday (1=Monday, 7=Sunday)
          const luxonWeekday = daySlot.weekday === 0 ? 7 : daySlot.weekday

          if (currentDay.weekday === luxonWeekday) {
            const [startHour, startMinute] = range.start.split(':').map(Number)
            const [endHour, endMinute] = range.end.split(':').map(Number)

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
              participantAvailabilities.push(interval)
            }
          }
          currentDay = currentDay.plus({ days: 1 })
        }
      }
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
  currentGuestEmail?: string
): Account[] => {
  const allParticipants = pollData.poll.participants.map(
    convertQuickPollParticipant
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
