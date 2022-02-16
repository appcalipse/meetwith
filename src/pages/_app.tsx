import '../styles/globals.css'

import { ChakraProvider, Flex } from '@chakra-ui/react'
import { extendTheme } from '@chakra-ui/react'
import cookie from 'cookie'
import type { AppContext, AppInitialProps, AppProps } from 'next/app'
import App from 'next/app'
import Head from 'next/head'
import * as React from 'react'
import { CookiesProvider } from 'react-cookie'

import { CookieConsent } from '../components/CookieConsent'
import Loading from '../components/Loading'
import { BaseLayout } from '../layouts/Base'
import { AccountProvider } from '../providers/AccountProvider'
import { validateAuthenticationApp } from '../session/core'
import customTheme from '../styles/theme'
import { Account } from '../types/Account'
import { initAnalytics, pageView } from '../utils/analytics'

const theme = extendTheme(customTheme)

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
    <ChakraProvider theme={theme}>
      <CookiesProvider>
        <AccountProvider
          currentAccount={currentAccount}
          logged={!!currentAccount}
        >
          <Head>
            <title>
              Meeting scheduler for #web3 - Meet with Wallet -
              meetwithwallet.xyz
            </title>
            <meta
              name="description"
              content="Meet with wallet provides an easy way to share you calendar and let people find the perfect time to meet with you, always ensuring your data is private. Booking for FREE by simply connecting a crypto wallet (No transaction is needed)."
            />

            <meta property="og:url" content="https://meetwithwallet.xyz/" />
            <meta property="og:type" content="website" />
            <meta
              property="og:title"
              content="Meeting scheduler for #web3 - Meet with Wallet - meetwithwallet.xyz"
            />
            <meta
              property="og:description"
              content="Meet with wallet provides an easy way to share you calendar and let people find the perfect time to meet with you, always ensuring your data is private. Booking for FREE by simply connecting a crypto wallet (No transaction is needed)."
            />
            <meta
              property="og:image"
              content="https://meetwithwallet.xyz/assets/opengraph.jpg"
            />

            <meta name="twitter:card" content="summary_large_image" />
            <meta property="twitter:domain" content="meetwithwallet.xyz" />
            <meta property="twitter:url" content="https://meetwithwallet.xyz" />
            <meta
              name="twitter:title"
              content="Meeting scheduler for #web3 - Meet with Wallet - meetwithwallet.xyz"
            />
            <meta
              name="twitter:description"
              content="Meet with wallet provides an easy way to share you calendar and let people find the perfect time to meet with you, always ensuring your data is private. Booking for FREE by simply connecting a crypto wallet (No transaction is needed)."
            />
            <meta
              name="twitter:image"
              content="https://meetwithwallet.xyz/assets/opengraph.jpg"
            />

            <meta
              name="viewport"
              content="initial-scale=1, width=device-width"
            />
            <link
              rel="apple-touch-icon"
              sizes="180x180"
              href="/apple-touch-icon.png"
            />
            <link
              rel="icon"
              type="image/png"
              sizes="32x32"
              href="/favicon-32x32.png"
            />
            <link
              rel="icon"
              type="image/png"
              sizes="16x16"
              href="/favicon-16x16.png"
            />
            <link rel="manifest" href="/site.webmanifest" />
            <link
              rel="mask-icon"
              href="/safari-pinned-tab.svg"
              color="#f35826"
            />
            <meta name="msapplication-TileColor" content="#1a202c" />
            <meta name="theme-color" content="#f35826"></meta>
          </Head>
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
