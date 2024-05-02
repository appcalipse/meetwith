import { useToast } from '@chakra-ui/react'
import * as Sentry from '@sentry/nextjs'
import router from 'next/router'
import { useContext } from 'react'
import { Wallet } from 'thirdweb/wallets'

import { AccountContext } from '../providers/AccountProvider'
import { logEvent } from '../utils/analytics'
import { InvalidSessionError } from '../utils/errors'
import { loginWithAddress } from '../utils/user_manager'

export const useLogin = () => {
  const { logged, currentAccount, login, loginIn, setLoginIn, logout } =
    useContext(AccountContext)
  const toast = useToast()

  const handleLogin = async (
    wallet: Wallet | undefined,
    useWaiting = true,
    forceRedirect = true
  ) => {
    !forceRedirect && logEvent('Clicked to connect wallet')
    if (!wallet?.getAccount()) return
    try {
      const account = await loginWithAddress(
        wallet,
        useWaiting ? setLoginIn : () => null
      )

      // user could revoke wallet authorization any moment
      if (!account) {
        await logout(wallet)
        if (logged && forceRedirect) {
          await router.push('/')
        }
        return
      }

      login(account)

      logEvent('Signed in')

      if (forceRedirect) {
        // redirect new accounts to onboarding
        if (account.signedUp) {
          const state = Buffer.from(
            JSON.stringify({
              signedUp: true,
            })
          ).toString('base64')
          await router.push(`/dashboard/details?state=${state}`)
          return
        }

        // avoid redirecting if person is scheduling on a public calendar
        // of someone else and was not logged. Definitely not the best way to do this
        if (
          router.pathname === '/' ||
          router.pathname.indexOf('/embed') != -1
        ) {
          await router.push('/dashboard/meetings')
          return
        }
      }
    } catch (error: any) {
      if (error instanceof InvalidSessionError) {
        await router.push('/logout')
        return
      }
      Sentry.captureException(error)
      toast({
        title: 'Error',
        description: error.message || error,
        status: 'error',
        duration: 7000,
        position: 'top',
        isClosable: true,
      })
      logEvent('Failed to sign in', error)
    }
  }

  return { handleLogin, currentAccount, logged, loginIn, login, setLoginIn }
}
