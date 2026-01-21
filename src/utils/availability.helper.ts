import { Account, TimeRange } from '@/types/Account'
import { AvailabilityBlock } from '@/types/availability'

export const getHoursPerWeek = (
  availabilities: Array<{ weekday: number; ranges: TimeRange[] }>
): string => {
  if (!availabilities) return '0hrs/week'

  const totalHours = availabilities.reduce((total, day) => {
    if (!day.ranges) return total

    const dayHours = day.ranges.reduce((dayTotal, range) => {
      if (!range.start || !range.end) return dayTotal

      const start = new Date(`2000-01-01T${range.start}:00`)
      const end = new Date(`2000-01-01T${range.end}:00`)
      return dayTotal + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    }, 0)
    return total + dayHours
  }, 0)

  return `${Math.round(totalHours)}hrs/week`
}

export const formatTime = (time: string | undefined): string => {
  if (!time) return ''
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    hour12: true,
    minute: '2-digit',
  })
}

export const getFormattedSchedule = (
  availabilities: Array<{ weekday: number; ranges: TimeRange[] }>
): Array<{ weekdays: string; timeRange: string }> => {
  if (!availabilities) return []

  const workingDays = availabilities.filter(
    day => day.ranges && day.ranges.length > 0
  )

  if (workingDays.length === 0) return []

  // Sort days by weekday order
  const sortedDays = workingDays.sort((a, b) => {
    const getWeekdayOrder = (weekday: number) => {
      if (weekday === 0) return 7
      if (weekday === 6) return 6
      return weekday
    }
    return getWeekdayOrder(a.weekday) - getWeekdayOrder(b.weekday)
  })

  // Build a comparable signature and a display string for all ranges in a day
  const getDaySignatureAndDisplay = (ranges: TimeRange[] | undefined) => {
    if (!ranges || ranges.length === 0) {
      return { display: '', signature: '' }
    }

    // Sort ranges by start time for stable comparison and display
    const sortedRanges = [...ranges].sort((a, b) =>
      (a.start || '').localeCompare(b.start || '')
    )

    const signature = sortedRanges.map(r => `${r.start}-${r.end}`).join('|')

    const display = sortedRanges
      .map(r => `${formatTime(r.start)} - ${formatTime(r.end)}`)
      .join(', ')

    return { display, signature }
  }

  // Group consecutive days that share identical sets of ranges
  const consecutiveGroups: Array<{
    days: number[]
    signature: string
    display: string
  }> = []
  let currentGroup: number[] = []
  let currentSignature = ''
  let currentDisplay = ''

  sortedDays.forEach((day, index) => {
    const { signature, display } = getDaySignatureAndDisplay(day.ranges)

    if (index === 0) {
      currentGroup = [day.weekday]
      currentSignature = signature
      currentDisplay = display
    } else {
      const prevDay = sortedDays[index - 1]
      const { signature: prevSignature } = getDaySignatureAndDisplay(
        prevDay.ranges
      )

      const isConsecutive =
        day.weekday === currentGroup[currentGroup.length - 1] + 1 ||
        (currentGroup[currentGroup.length - 1] === 6 && day.weekday === 0)

      if (signature === prevSignature && isConsecutive) {
        // Same ranges and consecutive day
        currentGroup.push(day.weekday)
      } else {
        // Different ranges or non-consecutive day
        if (currentGroup.length > 0) {
          consecutiveGroups.push({
            days: [...currentGroup],
            display: currentDisplay,
            signature: currentSignature,
          })
        }
        currentGroup = [day.weekday]
        currentSignature = signature
        currentDisplay = display
      }
    }

    // Handle last group
    if (index === sortedDays.length - 1) {
      if (currentGroup.length > 0) {
        consecutiveGroups.push({
          days: [...currentGroup],
          display: currentDisplay,
          signature: currentSignature,
        })
      }
    }
  })

  // Now group non-consecutive days that share identical sets of ranges
  const signatureMap: Map<string, { days: number[]; display: string }> =
    new Map()

  consecutiveGroups.forEach(group => {
    if (!signatureMap.has(group.signature)) {
      signatureMap.set(group.signature, { days: [], display: group.display })
    }
    const entry = signatureMap.get(group.signature)!
    entry.days.push(...group.days)
  })

  // Convert to formatted strings
  const scheduleLines: Array<{ weekdays: string; timeRange: string }> = []
  signatureMap.forEach(({ days, display }) => {
    const groupText = formatDayGroup(days, display)
    if (groupText.weekdays) scheduleLines.push(groupText)
  })

  return scheduleLines
}

export const formatDayGroup = (
  days: number[],
  timeRange: string
): { weekdays: string; timeRange: string } => {
  if (days.length === 0) return { timeRange: '', weekdays: '' }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (days.length === 1) {
    return { timeRange, weekdays: dayNames[days[0]] }
  } else {
    let consecutive = true
    for (let i = 1; i < days.length; i++) {
      const isConsecutive =
        days[i] === days[i - 1] + 1 || (days[i - 1] === 6 && days[i] === 0)
      if (!isConsecutive) {
        consecutive = false
        break
      }
    }

    if (consecutive) {
      return {
        timeRange,
        weekdays: `${dayNames[days[0]]} - ${dayNames[days[days.length - 1]]}`,
      }
    } else {
      const dayLabels = days.map(day => dayNames[day]).join(', ')
      return { timeRange, weekdays: dayLabels }
    }
  }
}

export const initializeEmptyAvailabilities = () => {
  const emptyAvailabilities = []
  for (let i = 0; i <= 6; i++) {
    emptyAvailabilities.push({ ranges: [], weekday: i })
  }
  return emptyAvailabilities
}

export const initializeDefaultAvailabilities = () => {
  const defaultAvailabilities = []
  for (let i = 0; i <= 6; i++) {
    if (i >= 1 && i <= 5) {
      // Monday to Friday (weekdays 1-5)
      if (i === 1) {
        // Monday gets two slots: 9:00-17:00 and 18:00-20:00
        defaultAvailabilities.push({
          ranges: [
            { end: '17:00', start: '09:00' },
            { end: '19:00', start: '18:00' },
          ],
          weekday: i,
        })
      } else {
        // Tuesday to Friday get one slot: 9:00-17:00
        defaultAvailabilities.push({
          ranges: [{ end: '17:00', start: '09:00' }],
          weekday: i,
        })
      }
    } else {
      // Sunday and Saturday remain empty
      defaultAvailabilities.push({ ranges: [], weekday: i })
    }
  }
  return defaultAvailabilities
}

export const validateAvailabilityBlock = (
  title: string,
  availabilities: Array<{ weekday: number; ranges: TimeRange[] }>
) => {
  if (!title.trim()) {
    return {
      error: 'Title required',
      isValid: false,
    }
  }

  const hasAvailabilities = availabilities.some(
    day => day.ranges && day.ranges.length > 0
  )

  if (!hasAvailabilities) {
    return {
      error: 'Availability required',
      isValid: false,
    }
  }

  return { isValid: true }
}

export const getCurrentEditingBlock = (
  blocks: AvailabilityBlock[] | undefined,
  editingBlockId: string | null
) => {
  return blocks?.find(block => block.id === editingBlockId)
}

export const getBrowserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch (_error) {
    return 'UTC'
  }
}

export const getBestTimezone = (account?: Account): string => {
  // First try account preference
  if (account?.preferences?.timezone) {
    return account.preferences.timezone
  }

  // Fallback to browser timezone
  return getBrowserTimezone()
}

export const getDayName = (weekday: number): string => {
  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ]
  return dayNames[weekday]
}

export const handleCopyToDays = (
  sourceWeekday: number,
  ranges: TimeRange[],
  copyType: 'all' | 'weekdays' | 'weekends',
  availabilities: Array<{ weekday: number; ranges: TimeRange[] }>,
  onAvailabilityChange: (weekday: number, ranges: TimeRange[]) => void
) => {
  let targetWeekdays: number[] = []

  if (copyType === 'all') {
    targetWeekdays = availabilities
      .map(availability => availability.weekday)
      .filter(weekday => weekday !== sourceWeekday)
  } else if (copyType === 'weekdays') {
    targetWeekdays = [1, 2, 3, 4, 5]
  } else if (copyType === 'weekends') {
    targetWeekdays = [0, 6]
  }

  targetWeekdays.forEach(weekday => {
    onAvailabilityChange(weekday, [...ranges])
  })

  return {
    copyTypeText:
      copyType === 'all'
        ? 'all other days'
        : copyType === 'weekdays'
          ? 'weekdays (Mon-Fri)'
          : 'weekends (Sat-Sun)',
    targetWeekdays,
  }
}

export const validateTimeFormat = (value: string): boolean => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  if (!timeRegex.test(value)) return false

  const [hours, minutes] = value.split(':').map(Number)
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
}

export const validateTimeRange = (start: string, end: string): boolean => {
  // First validate the time format
  if (!validateTimeFormat(start) || !validateTimeFormat(end)) {
    return false
  }

  const [startHours, startMinutes] = start.split(':').map(Number)
  const [endHours, endMinutes] = end.split(':').map(Number)

  const startTotalMinutes = startHours * 60 + startMinutes
  const endTotalMinutes = endHours * 60 + endMinutes

  // Start time should be before end time
  return startTotalMinutes < endTotalMinutes
}

export const sortAvailabilitiesByWeekday = (
  availabilities: Array<{ weekday: number; ranges: TimeRange[] }>
) => {
  return availabilities.sort((a, b) => {
    const getWeekdayOrder = (weekday: number) => {
      if (weekday === 0) return 7
      if (weekday === 6) return 6
      return weekday
    }

    return getWeekdayOrder(a.weekday) - getWeekdayOrder(b.weekday)
  })
}
