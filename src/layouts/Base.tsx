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

  const isDashboardPage = router.pathname.startsWith('/dashboard')

  const navVisible = !(logged && isDashboardPage && !isMobile)
  const footerVisible = !(logged && isDashboardPage)

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
