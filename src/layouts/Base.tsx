import { Box, ChakraProvider, useMediaQuery } from '@chakra-ui/react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import React, { ReactNode, useContext } from 'react'
import { CookiesProvider } from 'react-cookie'

import { CookieConsent } from '@/components/CookieConsent'
import Footer from '@/components/Footer'
import { ChakraMDXProvider } from '@/components/mdx.provider'
import { Navbar } from '@/components/nav/Navbar'
import { AccountContext } from '@/providers/AccountProvider'

const OnboardingModal = dynamic(
  () => import('@/components/onboarding/OnboardingModal'),
  { ssr: false }
)
const DiscordOnboardingModal = dynamic(
  () => import('@/components/onboarding/DiscordOnboardingModal'),
  { ssr: false }
)

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
    fallback: false,
    ssr: true,
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

  const pagesWithoutFooter = [
    isDashboardPage,
    isPublicPage,
    isPollPage,
    isPollGuestDetailsPage,
    isSchedulePage,
  ]

  const pagesWithoutNav = [
    isPublicPage,
    isSchedulePage,
    isSettingsPage,
    isPollPage,
    isPollGuestDetailsPage,
  ]

  const navVisible = (() => {
    if (pagesWithoutNav.includes(true)) {
      return false
    }

    if (isDashboardPage) {
      return isMobile || !logged
    }

    return true
  })()

  const footerVisible =
    !(logged && isDashboardPage) && !pagesWithoutFooter.includes(true)

  return (
    <ChakraProvider theme={customTheme}>
      <ChakraMDXProvider>
        <CookieConsent consentCookie={consentCookie} />
        <CookiesProvider>
          <Box display="flex" flexDir="column" minH="100vh">
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
