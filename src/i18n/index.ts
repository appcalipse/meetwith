import { DEFAULT_LOCALE, normalizeLocale, type SupportedLocale } from './config'
import {
  dictionaries,
  type TranslationKey,
  type TranslationParams,
} from './dictionaries'
import { textTranslations } from './textTranslations'

export type { SupportedLocale } from './config'
export {
  DEFAULT_LOCALE,
  isSupportedLocale,
  LOCALE_LABELS,
  normalizeLocale,
  SUPPORTED_LOCALES,
} from './config'
export type { TranslationKey, TranslationParams } from './dictionaries'

export const interpolate = (
  value: string,
  params?: TranslationParams
): string => {
  if (!params) return value

  return value.replace(/{{\s*([^}]+)\s*}}/g, (_, token: string) => {
    const replacement = params[token.trim()]
    return replacement === null || replacement === undefined
      ? ''
      : String(replacement)
  })
}

export const translate = (
  locale: SupportedLocale | string | undefined,
  key: TranslationKey,
  params?: TranslationParams
): string => {
  const normalizedLocale = normalizeLocale(locale)
  const template =
    dictionaries[normalizedLocale]?.[key] ??
    dictionaries[DEFAULT_LOCALE][key] ??
    key

  return interpolate(template, params)
}

export const translateText = (
  locale: SupportedLocale | string | undefined,
  text: string,
  params?: TranslationParams
): string => {
  const normalizedLocale = normalizeLocale(locale)
  const exactTextTranslation = textTranslations[normalizedLocale]?.[text]

  if (exactTextTranslation) return interpolate(exactTextTranslation, params)

  const entry = Object.entries(dictionaries[DEFAULT_LOCALE]).find(
    ([, value]) => value === text
  )

  if (!entry) return interpolate(text, params)

  return translate(normalizedLocale, entry[0] as TranslationKey, params)
}

export const localizePath = (
  locale: SupportedLocale | string | undefined,
  path: string
): string => {
  const normalizedLocale = normalizeLocale(locale)

  if (
    normalizedLocale === DEFAULT_LOCALE ||
    path.startsWith('http') ||
    path.startsWith('mailto:') ||
    path.startsWith('#') ||
    path.startsWith(`/${normalizedLocale}/`) ||
    path === `/${normalizedLocale}`
  ) {
    return path
  }

  return path.startsWith('/') ? `/${normalizedLocale}${path}` : path
}

export const getBrowserLocale = (): SupportedLocale => {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  return normalizeLocale(window.navigator.language)
}

export const getDocumentDirection = (_locale: SupportedLocale): 'ltr' => 'ltr'
