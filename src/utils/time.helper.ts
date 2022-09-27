import { format, Locale, roundToNearestMinutes } from 'date-fns'
import { enGB, enUS, es, pt, ptBR } from 'date-fns/locale'

export const ParseTime = (date: Date, roundMinutes?: boolean): string => {
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
