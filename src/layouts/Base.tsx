import { Box, ChakraProvider, ColorModeProvider } from '@chakra-ui/react'
import { DM_Sans } from 'next/font/google'
import React, { ReactNode } from 'react'
import { CookiesProvider } from 'react-cookie'
const dmSans = DM_Sans({ subsets: ['latin'], display: 'swap' })
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
  return (
    <ChakraProvider theme={customTheme}>
      <ColorModeProvider>
        <ChakraMDXProvider>
          <CookieConsent consentCookie={consentCookie} />
          <CookiesProvider>
            <Box
              minH="100vh"
              display="flex"
              flexDir="column"
              style={{
                fontFamily: dmSans.style.fontFamily,
              }}
            >
              <Navbar />
              {children}
              <Footer />
            </Box>
            <OnboardingModal />
            <DiscordOnboardingModal />
          </CookiesProvider>
        </ChakraMDXProvider>
      </ColorModeProvider>
    </ChakraProvider>
  )
}
