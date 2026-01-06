import { durationToHumanReadable } from '@/utils/calendar_manager'
import { DURATION_CONFIG } from '@/utils/constants/schedule'

export const parseDurationInput = (input: string): number | null => {
  if (!input || input.trim() === '') return null

  const trimmed = input.trim().toLowerCase()

  const pureNumber = parseInt(trimmed)
  if (!isNaN(pureNumber) && trimmed === String(pureNumber)) {
    return pureNumber
  }

  // Match HH:MM or H:MM format first (e.g., "1:30" → 1 hour 30 minutes)
  const colonMatch = trimmed.match(/^(\d+):(\d+)$/)
  if (colonMatch) {
    const hours = parseInt(colonMatch[1])
    const minutes = parseInt(colonMatch[2])
    if (!isNaN(hours) && !isNaN(minutes) && minutes < 60 && hours >= 0) {
      return hours * 60 + minutes
    }
  }

  // Parse hours and minutes formats
  let totalMinutes = 0
  let foundAny = false

  // Match hours: "2h", "2 hours", "2 hour", etc.
  const hourMatches = trimmed.match(/(\d+)\s*h(?:ou)?r(?:s)?/i)
  if (hourMatches) {
    const hours = parseInt(hourMatches[1])
    if (!isNaN(hours)) {
      totalMinutes += hours * 60
      foundAny = true
    }
  }

  // Match minutes: "30m", "30 min", "30 minutes", etc.
  const minuteMatches = trimmed.match(/(\d+)\s*m(?:in(?:ute)?(?:s)?)?/i)
  if (minuteMatches) {
    const minutes = parseInt(minuteMatches[1])
    if (!isNaN(minutes)) {
      totalMinutes += minutes
      foundAny = true
    }
  }

  return foundAny && totalMinutes > 0 ? totalMinutes : null
}

export const validateDuration = (
  minutes: number | null
): { isValid: boolean; errorMessage?: string } => {
  if (minutes === null) {
    return {
      isValid: false,
      errorMessage: 'Please enter a valid duration',
    }
  }

  if (minutes < DURATION_CONFIG.MIN_CUSTOM_DURATION) {
    return {
      isValid: false,
      errorMessage: `Minimum duration is ${DURATION_CONFIG.MIN_CUSTOM_DURATION} minutes`,
    }
  }

  if (minutes > DURATION_CONFIG.MAX_CUSTOM_DURATION) {
    return {
      isValid: false,
      errorMessage: `Maximum duration is ${durationToHumanReadable(
        DURATION_CONFIG.MAX_CUSTOM_DURATION
      )}`,
    }
  }

  return { isValid: true }
}
