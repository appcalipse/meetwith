import '../styles/globals.css'

import { Box, ChakraProvider, Flex, useColorModeValue } from '@chakra-ui/react'
import { extendTheme } from '@chakra-ui/react'
import cookie from 'cookie'
import type { AppContext, AppInitialProps, AppProps } from 'next/app'
import App from 'next/app'
import * as React from 'react'
import { CookiesProvider } from 'react-cookie'

import { CookieConsent } from '../components/CookieConsent'
import { Head } from '../components/Head'
import Loading from '../components/Loading'
import { ChakraMDXProvider } from '../components/mdx.provider'
import { BaseLayout } from '../layouts/Base'
import { AccountProvider } from '../providers/AccountProvider'
import { validateAuthenticationApp } from '../session/core'
import customTheme from '../styles/theme'
import { Account } from '../types/Account'
import { initAnalytics, pageView } from '../utils/analytics'

interface MyAppProps extends AppProps {
  consentCookie?: boolean | undefined
  currentAccount?: Account | null
  checkAuthOnClient?: boolean
}

function MyApp({
  Component,
  pageProps,
  router,
  consentCookie,
  currentAccount,
  checkAuthOnClient,
}: MyAppProps) {
  const [loading, setLoading] = React.useState(true)
  React.useEffect(() => {
    const initApp = async () => {
      setLoading(false)
      await initAnalytics()
      pageView(router.asPath)
    }
    initApp()
  }, [])

  React.useEffect(() => {
    const handleRouteChange = (url: string) => {
      pageView(url)
    }
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events])

  const customProps = {
    ...pageProps,
    checkAuthOnClient,
  }

  return (
    <ChakraProvider theme={customTheme}>
      <ChakraMDXProvider>
        <CookiesProvider>
          <AccountProvider
            currentAccount={currentAccount}
            logged={!!currentAccount}
          >
            <Head />
            <BaseLayout>
              {loading ? (
                <Flex
                  width="100%"
                  height="100%"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Loading />
                </Flex>
              ) : (
                <Component {...customProps} />
              )}
            </BaseLayout>
          </AccountProvider>
          <CookieConsent consentCookie={consentCookie as boolean} />
        </CookiesProvider>
      </ChakraMDXProvider>
    </ChakraProvider>
  )
}

MyApp.getInitialProps = async (appContext: AppContext) => {
  const appProps: AppInitialProps = await App.getInitialProps(appContext)

  const consentCookie =
    appContext.ctx.req && appContext.ctx.req.headers!.cookie
      ? cookie.parse(appContext.ctx.req.headers!.cookie).mww_consent
      : false

  // we will only have web3 defined when on the client side, if we don't have
  // then it means that we should force reload metamask connection on the client side
  const currentAccount = await validateAuthenticationApp(appContext)

  // only force check on the client side if we have an account and we came from the backend
  const checkAuthOnClient = !!currentAccount && !!appContext.ctx.req

  return { ...appProps, consentCookie, currentAccount, checkAuthOnClient }
}

export default MyApp
