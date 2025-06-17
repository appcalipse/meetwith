import { TimeRange } from '@/types/Account'
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

  if (totalHours === 0) return '0hrs/week'

  return `${Math.round(totalHours)}hrs/week`
}

export const formatTime = (time: string | undefined): string => {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'pm' : 'am'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minutes}${ampm}`
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
      return `${dayNames[days[0]]}, ${
        dayNames[days[days.length - 1]]
      } : ${timeRange}`
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
