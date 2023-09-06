import '../styles/globals.css'
import '../styles/swipers.css'

import { ChakraProvider } from '@chakra-ui/react'
import { watchAccount } from '@wagmi/core'
import { ConnectKitProvider } from 'connectkit'
import cookie from 'cookie'
import setDefaultOptions from 'date-fns/setDefaultOptions'
import type { AppContext, AppInitialProps, AppProps } from 'next/app'
import App from 'next/app'
import * as React from 'react'
import { CookiesProvider } from 'react-cookie'
import { WagmiConfig } from 'wagmi'
import { useDisconnect } from 'wagmi'

import { useLogin } from '@/session/login'
import { getLocaleForDateFNS } from '@/utils/time.helper'
import { loginWithAddress, wagmiConfig } from '@/utils/user_manager'

import { CookieConsent } from '../components/CookieConsent'
import { Head } from '../components/Head'
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
  React.useEffect(() => {
    const initApp = async () => {
      setDefaultOptions({
        locale: getLocaleForDateFNS(),
      })
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

  const { login, setLoginIn } = useLogin()

  watchAccount(async account => {
    if (!account || !account.address || !currentAccount) {
      return
    }

    console.log('watchAccount', account, currentAccount)

    if (
      currentAccount &&
      account.address.toLowerCase() !== currentAccount?.address.toLowerCase()
    ) {
      const newAccount = await loginWithAddress(account.address, setLoginIn)
      if (newAccount) {
        login(newAccount)
      }
    }
  })

  return (
    <ChakraProvider theme={customTheme}>
      <ChakraMDXProvider>
        <CookiesProvider>
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
        </CookiesProvider>
      </ChakraMDXProvider>
    </ChakraProvider>
  )
}

const Inner = (props: any) => {
  const { handleLogin, logged } = useLogin()
  const { disconnect } = useDisconnect()

  React.useEffect(() => {
    if (!logged) {
      //make sure wagmi doesn't stay connect if for any reason we don't have the account
      disconnect()
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
