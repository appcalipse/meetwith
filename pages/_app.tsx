import '../styles/globals.css'
import type { AppContext, AppInitialProps, AppProps } from 'next/app'
import App from 'next/app'
import * as React from 'react'
import { ChakraProvider } from '@chakra-ui/react'
import { CookiesProvider } from 'react-cookie'
import { extendTheme } from '@chakra-ui/react'
import NavBar from '../components/Navbar'
import Footer from '../components/Footer'
import { AccountProvider } from '../providers/AccountProvider'
import Head from 'next/head'
import { initAnalytics, pageView } from '../utils/analytics'
import customTheme from '../styles/theme'
import { CookieConsent } from '../components/CookieConsent'
import cookie from 'cookie'

const theme = extendTheme(customTheme)

interface MyAppProps extends AppProps {
  consentCookie?: boolean | undefined
}

export default function MyApp({
  Component,
  pageProps,
  router,
  consentCookie,
}: MyAppProps) {
  const [loading, setLoading] = React.useState(true)

  const initApp = async () => {
    setLoading(false)
    await initAnalytics()
    pageView(router.asPath)
  }

  React.useEffect(() => {
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

  return (
    <ChakraProvider theme={theme}>
      <CookiesProvider>
        <AccountProvider>
          <Head>
            <title>
              Meeting scheduler for #web3 - Meet with Wallet -
              meetwthwallet.xyz
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
          {loading ? (
            <div>Loading...</div>
          ) : (
            <>
              <NavBar />
              <Component {...pageProps} />
              <Footer />
            </>
          )}
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

  return { ...appProps, consentCookie }
}
