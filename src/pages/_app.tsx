import '../styles/globals.css'
import '../styles/swipers.css'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ConnectKitProvider } from 'connectkit'
import cookie from 'cookie'
import setDefaultOptions from 'date-fns/setDefaultOptions'
import type { AppContext, AppInitialProps, AppProps } from 'next/app'
import App from 'next/app'
import * as React from 'react'
import { CookiesProvider } from 'react-cookie'
import { useDisconnect, WagmiConfig } from 'wagmi'

import { CookieConsent } from '@/components/CookieConsent'
import { Head } from '@/components/Head'
import { BaseLayout } from '@/layouts/Base'
import { AccountProvider } from '@/providers/AccountProvider'
import { validateAuthenticationApp } from '@/session/core'
import { useLogin } from '@/session/login'
import { Account } from '@/types/Account'
import { initAnalytics, pageView } from '@/utils/analytics'
import { queryClient } from '@/utils/react_query'
import { getLocaleForDateFNS } from '@/utils/time.helper'
import { wagmiConfig } from '@/utils/user_manager'

interface MyAppProps extends AppProps {
  consentCookie?: boolean | undefined
  currentAccount?: Account | null
  checkAuthOnClient?: boolean
}

let appDidInit = false

function MyApp({
  Component,
  pageProps,
  router,
  consentCookie,
  currentAccount,
  checkAuthOnClient,
}: MyAppProps) {
  React.useEffect(() => {
    if (appDidInit) return
    const initApp = async () => {
      setDefaultOptions({
        locale: getLocaleForDateFNS(),
      })
      await initAnalytics()
      pageView(router.asPath)
      appDidInit = true
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
    <QueryClientProvider client={queryClient}>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={true} />
      )}
      <WagmiConfig config={wagmiConfig}>
        <AccountProvider
          currentAccount={currentAccount}
          logged={!!currentAccount}
        >
          <Inner>
            <Component {...customProps} />
          </Inner>
        </AccountProvider>
        <CookieConsent consentCookie={consentCookie as boolean} />
      </WagmiConfig>
    </QueryClientProvider>
  )
}

const Inner = (props: { children: React.ReactNode }) => {
  const { handleLogin, logged } = useLogin()
  const { disconnect } = useDisconnect()

  // This protection is to avoid pre-rendering of the modal
  // that leads to errors
  const [isClient, setIsClient] = React.useState(false)

  React.useEffect(() => {
    if (!logged) {
      //make sure wagmi doesn't stay connect if for any reason we don't have the account
      disconnect()
    }

    if (!isClient) {
      setIsClient(true)
    }
  }, [])

  return (
    <ConnectKitProvider
      options={{ initialChainId: 0, enforceSupportedChains: false }}
      onConnect={({ address }) => {
        handleLogin(address)
      }}
    >
      <Head />
      <BaseLayout>{props.children}</BaseLayout>
    </ConnectKitProvider>
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
