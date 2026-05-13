export const DEFAULT_LOCALE = 'en'
export const SUPPORTED_LOCALES = ['en', 'es'] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  es: 'Español',
}

export const isSupportedLocale = (
  locale?: string | null
): locale is SupportedLocale => {
  if (!locale) return false
  return SUPPORTED_LOCALES.includes(locale.toLowerCase() as SupportedLocale)
}

export const normalizeLocale = (locale?: string | null): SupportedLocale => {
  if (!locale) return DEFAULT_LOCALE

  const normalized = locale.toLowerCase().split('-')[0]
  return isSupportedLocale(normalized) ? normalized : DEFAULT_LOCALE
}
