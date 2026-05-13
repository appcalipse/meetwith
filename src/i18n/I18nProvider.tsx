import { useRouter } from 'next/router'
import React, { createContext, ReactNode, useContext, useMemo } from 'react'

import {
  DEFAULT_LOCALE,
  normalizeLocale,
  type SupportedLocale,
  type TranslationKey,
  type TranslationParams,
  translate,
} from '@/i18n'

type I18nContextValue = {
  locale: SupportedLocale
  defaultLocale: SupportedLocale
  t: (key: TranslationKey, params?: TranslationParams) => string
}

const I18nContext = createContext<I18nContextValue>({
  defaultLocale: DEFAULT_LOCALE,
  locale: DEFAULT_LOCALE,
  t: (key, params) => translate(DEFAULT_LOCALE, key, params),
})

export const I18nProvider: React.FC<{
  children: ReactNode
  locale?: string
}> = ({ children, locale }) => {
  const router = useRouter()
  const activeLocale = normalizeLocale(
    locale ?? router.locale ?? DEFAULT_LOCALE
  )

  const value = useMemo<I18nContextValue>(
    () => ({
      defaultLocale: DEFAULT_LOCALE,
      locale: activeLocale,
      t: (key, params) => translate(activeLocale, key, params),
    }),
    [activeLocale]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)
