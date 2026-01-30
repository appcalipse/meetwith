import { DateTime, Interval } from 'luxon'

const MIN_DURATION = 1
const MAX_DURATION = 480

/** Pixel height for a slot of given duration (minutes). Matches grid slot styling. */
const slotHeightPx = (min: number): number =>
  (min >= 45 ? 12 : 12 / (60 / (min || 30))) * 4

export type LabelRow = {
  label: string
  heightPx?: number
  heightMinutes?: number
}

/**
 * Computes pixel height for a label row in the schedule grid.
 */
export const getLabelRowHeightPx = (
  row: LabelRow,
  gridSlotDuration: number,
  durationMode: 'preset' | 'custom' | 'timeRange'
): number => {
  if (typeof row.heightPx === 'number') return row.heightPx
  const g = gridSlotDuration || 30
  const slotHeight = slotHeightPx(g)
  if (durationMode === 'timeRange' && typeof row.heightMinutes === 'number') {
    return slotHeightPx(row.heightMinutes)
  }
  return g >= 45 ? slotHeight : (60 / g) * slotHeight
}

/**
 * Parses duration from "90" (minutes) or "2:55" / "1:30" (H:MM) into total minutes.
 */
export const parseDurationInput = (input: string): number | null => {
  const t = input.trim()
  if (!t) return null
  if (t.includes(':')) {
    const parts = t.split(':')
    if (parts.length !== 2) return null
    const h = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10)
    if (isNaN(h) || isNaN(m) || h < 0 || m < 0 || m >= 60) return null
    const total = h * 60 + m
    return total >= MIN_DURATION && total <= MAX_DURATION ? total : null
  }
  const n = parseInt(t, 10)
  if (isNaN(n) || n < MIN_DURATION || n > MAX_DURATION) return null
  return n
}

/**
 * Human-readable label for a duration in minutes: "2 hour 55 minutes", "1 hour", "30 minutes".
 */
export const durationToAddLabel = (totalMinutes: number): string => {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  const parts: string[] = []
  if (h > 0) parts.push(`${h} ${h === 1 ? 'hour' : 'hours'}`)
  if (m > 0) parts.push(`${m} ${m === 1 ? 'minute' : 'minutes'}`)
  return parts.join(' ')
}

/**
 * Formats the create label for custom duration: "Add 2 hour 55 minutes", "Add 30 minutes".
 */
export const formatDurationCreateLabel = (inputValue: string): string => {
  const total = parseDurationInput(inputValue)
  if (total === null) return 'Invalid duration'
  return `Add ${durationToAddLabel(total)}`
}

/**
 * Validates if a custom duration option is valid (minutes or H:MM, 1–480 min).
 */
export const isValidDurationOption = (inputValue: string): boolean => {
  return parseDurationInput(inputValue) !== null
}

/** Add minutes to HH:MM time. Caps at 24:00. */
export const addMinutesToTime = (time: string, minutes: number): string => {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  if (total >= 24 * 60) return '24:00'
  const nh = Math.floor(total / 60)
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

/** Subtract minutes from HH:MM time. Floors at 00:00. */
export const subtractMinutesFromTime = (
  time: string,
  minutes: number
): string => {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m - minutes
  if (total <= 0) return '00:00'
  const nh = Math.floor(total / 60)
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

/** Compare HH:MM times. Returns < 0 if a < b, 0 if equal, > 0 if a > b. */
export const compareTimes = (a: string, b: string): number => {
  const [ah, am] = a.split(':').map(Number)
  const [bh, bm] = b.split(':').map(Number)
  return ah * 60 + am - (bh * 60 + bm)
}

/**
 * Builds 24 hourly label rows for time-range mode when range < 45 min.
 * Groups slots by start hour, sums their pixel heights, so label column aligns with grid.
 */
export const buildHourlyTimeRangeLabelRows = (
  slotTemplate: Array<Interval<true>>,
  timezone: string
): Array<{ label: string; heightPx: number }> => {
  const byHour: Array<{ label: string; heightPx: number }> = []
  for (let h = 0; h < 24; h++) {
    const zoned = DateTime.fromObject(
      { hour: h, minute: 0, second: 0, year: 2000, month: 1, day: 1 },
      { zone: timezone }
    )
    const label = zoned.toFormat(zoned.hour < 12 ? 'HH:mm a' : 'hh:mm a')
    const slotsInHour = slotTemplate.filter(
      s => s.start.setZone(timezone).hour === h
    )
    const heightPx = slotsInHour.reduce(
      (sum, s) => sum + slotHeightPx(s.toDuration('minutes').minutes),
      0
    )
    byHour.push({ label, heightPx })
  }
  return byHour
}

/**
 * Calculates effective duration based on duration mode
 */
export const calculateEffectiveDuration = (
  durationMode: 'preset' | 'custom' | 'timeRange',
  duration: number,
  timeRange: { startTime: string; endTime: string } | null
): number => {
  if (durationMode === 'timeRange' && timeRange) {
    const [startHours, startMinutes] = timeRange.startTime
      .split(':')
      .map(Number)
    const [endHours, endMinutes] = timeRange.endTime.split(':').map(Number)
    const startTotalMinutes = startHours * 60 + startMinutes
    const endTotalMinutes = endHours * 60 + endMinutes
    return endTotalMinutes - startTotalMinutes
  }
  return duration
}
