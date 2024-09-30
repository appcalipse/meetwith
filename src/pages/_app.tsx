import '../styles/globals.css'
import '../styles/swipers.css'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import cookie from 'cookie'
import setDefaultOptions from 'date-fns/setDefaultOptions'
import type { AppContext, AppInitialProps, AppProps } from 'next/app'
import App from 'next/app'
import * as React from 'react'
import { ThirdwebProvider } from 'thirdweb/react'

import { Head } from '@/components/Head'
import { ConnectModal } from '@/components/nav/ConnectModal'
import { BaseLayout } from '@/layouts/Base'
import { AccountProvider } from '@/providers/AccountProvider'
import { OnboardingModalProvider } from '@/providers/OnboardingModalProvider'
import { validateAuthenticationApp } from '@/session/core'
import { Account } from '@/types/Account'
import { initAnalytics, pageView } from '@/utils/analytics'
import { queryClient } from '@/utils/react_query'
import { getLocaleForDateFNS } from '@/utils/time.helper'

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
      <ThirdwebProvider>
        <OnboardingModalProvider>
          <AccountProvider
            currentAccount={currentAccount}
            logged={!!currentAccount}
          >
            <Head />
            <BaseLayout consentCookie={consentCookie ?? false}>
              <Component {...customProps} />
            </BaseLayout>
            <ConnectModal />
          </AccountProvider>
        </OnboardingModalProvider>
      </ThirdwebProvider>
    </QueryClientProvider>
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
