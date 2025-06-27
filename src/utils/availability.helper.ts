import { TimeRange } from '@/types/Account'
import { Account } from '@/types/Account'
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
    minute: '2-digit',
    hour12: true,
  })
}

export const getFormattedSchedule = (
  availabilities: Array<{ weekday: number; ranges: TimeRange[] }>
): string[] => {
  if (!availabilities) return []

  const workingDays = availabilities.filter(
    day => day.ranges && day.ranges.length > 0
  )

  if (workingDays.length === 0) return []

  // Group consecutive days with same time ranges
  const scheduleLines: string[] = []
  let currentGroup: number[] = []
  let currentTimeRange = ''

  workingDays.forEach((day, index) => {
    const timeRange =
      day.ranges && day.ranges.length > 0
        ? `${formatTime(day.ranges[0].start)} - ${formatTime(
            day.ranges[0].end
          )}`
        : ''

    if (index === 0) {
      currentGroup = [day.weekday]
      currentTimeRange = timeRange
    } else {
      const prevDay = workingDays[index - 1]
      const prevTimeRange =
        prevDay.ranges && prevDay.ranges.length > 0
          ? `${formatTime(prevDay.ranges[0].start)} - ${formatTime(
              prevDay.ranges[0].end
            )}`
          : ''

      if (
        timeRange === prevTimeRange &&
        day.weekday === currentGroup[currentGroup.length - 1] + 1
      ) {
        // Same time range and consecutive day
        currentGroup.push(day.weekday)
      } else {
        // Different time range or non-consecutive day, finish current group
        const groupText = formatDayGroup(currentGroup, currentTimeRange)
        if (groupText) scheduleLines.push(groupText)

        currentGroup = [day.weekday]
        currentTimeRange = timeRange
      }
    }

    // Handle last group
    if (index === workingDays.length - 1) {
      const groupText = formatDayGroup(currentGroup, currentTimeRange)
      if (groupText) scheduleLines.push(groupText)
    }
  })

  return scheduleLines
}

export const formatDayGroup = (days: number[], timeRange: string): string => {
  if (days.length === 0) return ''

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (days.length === 1) {
    return `${dayNames[days[0]]} : ${timeRange}`
  } else if (days.length === 2) {
    // Check if consecutive
    if (days[1] === days[0] + 1) {
      return `${dayNames[days[0]]} - ${dayNames[days[1]]} : ${timeRange}`
    } else {
      return `${dayNames[days[0]]}, ${dayNames[days[1]]} : ${timeRange}`
    }
  } else {
    // Check if consecutive
    let consecutive = true
    for (let i = 1; i < days.length; i++) {
      if (days[i] !== days[i - 1] + 1) {
        consecutive = false
        break
      }
    }

    if (consecutive) {
      return `${dayNames[days[0]]} - ${
        dayNames[days[days.length - 1]]
      } : ${timeRange}`
    } else {
      const dayLabels = days.map(day => dayNames[day]).join(', ')
      return `${dayLabels} : ${timeRange}`
    }
  }
}

export const initializeEmptyAvailabilities = () => {
  const emptyAvailabilities = []
  for (let i = 0; i <= 6; i++) {
    emptyAvailabilities.push({ weekday: i, ranges: [] })
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
          weekday: i,
          ranges: [
            { start: '09:00', end: '17:00' },
            { start: '18:00', end: '19:00' },
          ],
        })
      } else {
        // Tuesday to Friday get one slot: 9:00-17:00
        defaultAvailabilities.push({
          weekday: i,
          ranges: [{ start: '09:00', end: '17:00' }],
        })
      }
    } else {
      // Sunday and Saturday remain empty
      defaultAvailabilities.push({ weekday: i, ranges: [] })
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
      isValid: false,
      error: 'Title required',
    }
  }

  const hasAvailabilities = availabilities.some(
    day => day.ranges && day.ranges.length > 0
  )

  if (!hasAvailabilities) {
    return {
      isValid: false,
      error: 'Availability required',
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
  } catch (error) {
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
    targetWeekdays,
    copyTypeText:
      copyType === 'all'
        ? 'all other days'
        : copyType === 'weekdays'
        ? 'weekdays (Mon-Fri)'
        : 'weekends (Sat-Sun)',
  }
}

export const validateTimeFormat = (value: string): boolean => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  if (!timeRegex.test(value)) return false

  const [hours, minutes] = value.split(':').map(Number)
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
}

export const sortAvailabilitiesByWeekday = (
  availabilities: Array<{ weekday: number; ranges: TimeRange[] }>
) => {
  return availabilities.sort((a, b) => {
    const getWeekdayOrder = (weekday: number) => {
      if (weekday === 0) return 6
      if (weekday === 6) return 7
      return weekday
    }

    return getWeekdayOrder(a.weekday) - getWeekdayOrder(b.weekday)
  })
}
