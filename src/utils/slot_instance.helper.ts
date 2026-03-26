import { DateTime } from 'luxon'
import { rrulestr } from 'rrule'

import { Tables } from '@/types/Supabase'

export const parseSlotInstanceId = (
  slotInstanceId: string
): { seriesId: string; startMillis: number } | null => {
  const idx = slotInstanceId.lastIndexOf('_')
  if (idx <= 0) return null
  const seriesId = slotInstanceId.slice(0, idx)
  const startMillisRaw = slotInstanceId.slice(idx + 1)
  const startMillis = Number(startMillisRaw)
  if (!seriesId || !Number.isFinite(startMillis)) return null
  return { seriesId, startMillis }
}

export const isValidSeriesOccurrence = (
  series: Tables<'slot_series'>,
  startMillis: number
): boolean => {
  if (!series.rrule || series.rrule.length === 0) return false

  const requestedStart = DateTime.fromMillis(startMillis).toUTC()

  const effectiveStart = series.effective_start
    ? DateTime.fromISO(series.effective_start).toUTC()
    : null
  const effectiveEnd = series.effective_end
    ? DateTime.fromISO(series.effective_end).toUTC()
    : null

  if (effectiveStart && requestedStart < effectiveStart) return false
  if (effectiveEnd && requestedStart > effectiveEnd) return false

  // Validate time-of-day mapping against the template start
  const templateStart = DateTime.fromISO(series.template_start).toUTC()
  if (
    requestedStart.hour !== templateStart.hour ||
    requestedStart.minute !== templateStart.minute ||
    requestedStart.second !== templateStart.second
  ) {
    return false
  }

  // Validate requested start is a real occurrence in the RRULE.
  const rule = rrulestr(series.rrule.join('\n'), {
    dtstart: templateStart.toJSDate(),
  })
  const occurrences = rule.between(
    requestedStart.toJSDate(),
    requestedStart.toJSDate(),
    true
  )
  return occurrences.some(d => d.getTime() === requestedStart.toMillis())
}
