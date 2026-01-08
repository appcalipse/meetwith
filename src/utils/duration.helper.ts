import { durationToHumanReadable } from '@/utils/calendar_manager'
import { DURATION_CONFIG } from '@/utils/constants/schedule'

export const parseDurationInput = (input: string): number | null => {
  if (!input || input.trim() === '') return null

  const trimmed = input.trim()

  const pureNumber = parseInt(trimmed)
  if (!isNaN(pureNumber) && trimmed === String(pureNumber)) {
    return pureNumber
  }

  // Then try HH:MM or H:MM format (e.g., "1:30" → 1 hour 30 minutes)
  const colonMatch = trimmed.match(/^(\d+):(\d+)$/)
  if (colonMatch) {
    const hours = parseInt(colonMatch[1])
    const minutes = parseInt(colonMatch[2])
    if (!isNaN(hours) && !isNaN(minutes) && minutes < 60 && hours >= 0) {
      return hours * 60 + minutes
    }
  }

  return null
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

export const formatDurationValue = (minutes: number): string => {
  if (minutes <= 0) return ''
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0 && mins > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}`
  } else if (hours > 0) {
    return `${hours}:00`
  }
  return String(minutes)
}

export const calculateDurationFromTimeRange = (
  startTime: string,
  endTime: string
): number => {
  const [startHours, startMinutes] = startTime.split(':').map(Number)
  const [endHours, endMinutes] = endTime.split(':').map(Number)

  const startTotalMinutes = startHours * 60 + startMinutes
  const endTotalMinutes = endHours * 60 + endMinutes

  // Handle overnight ranges (e.g., 22:00 - 02:00)
  return endTotalMinutes >= startTotalMinutes
    ? endTotalMinutes - startTotalMinutes
    : 24 * 60 - startTotalMinutes + endTotalMinutes
}
