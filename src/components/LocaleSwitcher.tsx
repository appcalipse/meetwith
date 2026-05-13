import { Button, Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/react'
import { useRouter } from 'next/router'

import { LOCALE_LABELS, SUPPORTED_LOCALES, type SupportedLocale } from '@/i18n'
import { useI18n } from '@/i18n/I18nProvider'

export const LocaleSwitcher = () => {
  const router = useRouter()
  const { locale, t } = useI18n()

  const changeLocale = async (nextLocale: SupportedLocale) => {
    await router.push(router.asPath, router.asPath, { locale: nextLocale })
  }

  return (
    <Menu placement="bottom-end">
      <MenuButton
        as={Button}
        size="sm"
        variant="ghost"
        aria-label={t('app.language')}
      >
        {locale.toUpperCase()}
      </MenuButton>
      <MenuList zIndex={1000}>
        {SUPPORTED_LOCALES.map(nextLocale => (
          <MenuItem
            key={nextLocale}
            onClick={() => void changeLocale(nextLocale)}
            fontWeight={nextLocale === locale ? 700 : 400}
          >
            {LOCALE_LABELS[nextLocale]}
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  )
}
