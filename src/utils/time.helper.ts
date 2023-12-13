import { format, Locale, roundToNearestMinutes, startOfWeek } from 'date-fns'
import { enGB, enUS, es, pt, ptBR } from 'date-fns/locale'
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'

import { NotBefore } from '@/types/Meeting'

export const findStartDateForNotBefore = (
  _startDate: Date,
  notBefore: NotBefore,
  timezone: string
): Date => {
  let startDate = new Date(_startDate)
  switch (notBefore) {
    case NotBefore.OneHour:
      startDate.setHours(startDate.getHours() + 1)
      break
    case NotBefore.TwoHours:
      startDate.setHours(startDate.getHours() + 2)
      break
    case NotBefore.SixHours:
      startDate.setHours(startDate.getHours() + 6)
      break
    case NotBefore.TwelveHours:
      startDate.setHours(startDate.getHours() + 12)
      break
    case NotBefore.Tomorrow:
      const zonedNow = utcToZonedTime(new Date(startDate), timezone)
      zonedNow.setDate(zonedNow.getDate() + 1)
      zonedNow.setHours(0, 0, 0, 0)
      startDate = zonedTimeToUtc(zonedNow, timezone)

      break
    case NotBefore.NextWeek:
      const zonedNow2 = utcToZonedTime(new Date(startDate), timezone)
      zonedNow2.setDate(zonedNow2.getDate() + 7)
      zonedNow2.setHours(0, 0, 0, 0)
      startDate = zonedTimeToUtc(
        startOfWeek(zonedNow2, { weekStartsOn: 1 }),
        timezone
      )
      break
  }

  return startDate
}

export const parseTime = (date: Date, roundMinutes?: boolean): string => {
  let _date = new Date(date)
  if (roundMinutes) {
    _date = roundToNearestMinutes(_date, {
      nearestTo: 5,
      roundingMethod: 'ceil',
    })
  }
  return format(_date, 'p')
}

export const getLocaleForDateFNS = (): Locale => {
  let browserLocale = window.navigator.language || 'en'

  if (browserLocale.indexOf('en') !== -1) {
    if (browserLocale !== 'en-US') {
      browserLocale = 'en'
    }
  }
  if (browserLocale.indexOf('es') !== -1) {
    browserLocale = 'es'
  }

  /* eslint-disable @typescript-eslint/no-var-requires */
  switch (browserLocale) {
    case 'pt':
    case 'pt-PT':
      return pt
    case 'pt-BR':
      return ptBR
    case 'es':
      return es
    case 'en-US':
      return enUS
    case 'en':
    default:
      return enGB
  }
  /* eslint-enable @typescript-eslint/no-var-requires */
}
