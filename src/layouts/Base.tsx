import { Box, ChakraProvider } from '@chakra-ui/react'
import React, { ReactNode } from 'react'
import { CookiesProvider } from 'react-cookie'

import { CookieConsent } from '@/components/CookieConsent'
import Footer from '@/components/Footer'
import { ChakraMDXProvider } from '@/components/mdx.provider'
import { Navbar } from '@/components/nav/Navbar'
import DiscordOnboardingModal from '@/components/onboarding/DiscordOnboardingModal'
import OnboardingModal from '@/components/onboarding/OnboardingModal'
import customTheme from '@/styles/theme'

export const BaseLayout: React.FC<{
  children: ReactNode
  consentCookie: boolean
}> = ({ children, consentCookie }) => {
  const onboardingModalRef = React.useRef<{ onOpen: () => void }>(null)

  return (
    <ChakraProvider theme={customTheme}>
      <ChakraMDXProvider>
        <CookieConsent consentCookie={consentCookie} />
        <CookiesProvider>
          <Box minH="100vh" display="flex" flexDir="column">
            <Navbar />
            {children}
            <Footer />
          </Box>
          <OnboardingModal ref={onboardingModalRef} />
          <DiscordOnboardingModal
            callback={onboardingModalRef.current?.onOpen}
          />
        </CookiesProvider>
      </ChakraMDXProvider>
    </ChakraProvider>
  )
}
