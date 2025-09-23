import { Box, ChakraProvider } from '@chakra-ui/react'
import { useMediaQuery } from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React, { ReactNode, useContext } from 'react'
import { CookiesProvider } from 'react-cookie'

import { CookieConsent } from '@/components/CookieConsent'
import Footer from '@/components/Footer'
import { ChakraMDXProvider } from '@/components/mdx.provider'
import { Navbar } from '@/components/nav/Navbar'
import DiscordOnboardingModal from '@/components/onboarding/DiscordOnboardingModal'
import OnboardingModal from '@/components/onboarding/OnboardingModal'
import { AccountContext } from '@/providers/AccountProvider'
import customTheme from '@/styles/theme'
import {
  DASHBOARD_ROUTE_PREFIX,
  DASHBOARD_SCHEDULE_ROUTE,
  PUBLIC_ADDRESS_ROUTE,
  PUBLIC_POLL_GUEST_DETAILS_ROUTE,
  PUBLIC_POLL_ROUTE,
  PUBLIC_USERNAME_ROUTE,
  SETTINGS_ROUTE_PREFIX,
} from '@/utils/constants'

export const BaseLayout: React.FC<{
  children: ReactNode
  consentCookie: boolean
}> = ({ children, consentCookie }) => {
  const router = useRouter()
  const { logged } = useContext(AccountContext)
  const [isMobile] = useMediaQuery(['(max-width: 800px)'], {
    ssr: true,
    fallback: false,
  })

  const isDashboardPage = router.pathname.startsWith(DASHBOARD_ROUTE_PREFIX)
  const isSchedulePage = router.pathname === DASHBOARD_SCHEDULE_ROUTE
  const isSettingsPage = router.asPath.startsWith(SETTINGS_ROUTE_PREFIX)
  const isPublicPage =
    router.pathname === PUBLIC_USERNAME_ROUTE ||
    router.pathname === PUBLIC_ADDRESS_ROUTE
  const isPollPage = router.pathname === PUBLIC_POLL_ROUTE
  const isPollGuestDetailsPage =
    router.pathname === PUBLIC_POLL_GUEST_DETAILS_ROUTE

  const navVisible =
    !(logged && isDashboardPage && !isMobile) &&
    !isPublicPage &&
    !isSchedulePage &&
    !isSettingsPage &&
    !isPollPage &&
    !isPollGuestDetailsPage

  const footerVisible =
    !(logged && isDashboardPage) &&
    !isPublicPage &&
    !isPollPage &&
    !isPollGuestDetailsPage &&
    !isSchedulePage

  return (
    <ChakraProvider theme={customTheme}>
      <ChakraMDXProvider>
        <CookieConsent consentCookie={consentCookie} />
        <CookiesProvider>
          <Box minH="100vh" display="flex" flexDir="column">
            {navVisible && <Navbar />}
            {children}
            {footerVisible && <Footer />}
          </Box>
          <OnboardingModal />
          <DiscordOnboardingModal />
        </CookiesProvider>
      </ChakraMDXProvider>
    </ChakraProvider>
  )
}
