import { useToast } from '@chakra-ui/react'
import * as Sentry from '@sentry/nextjs'
import { watchAccount } from '@wagmi/core'
import router from 'next/router'
import { useContext } from 'react'

import { AccountContext } from '../providers/AccountProvider'
import { logEvent } from '../utils/analytics'
import { InvalidSessionError } from '../utils/errors'
import { loginWithAddress } from '../utils/user_manager'
export const useLogin = () => {
  const {
    waitLoginResolve,
    setWaitLoginResolve,
    currentAccount,
    logged,
    login,
    loginIn,
    setLoginIn,
    logout,
  } = useContext(AccountContext)
  const toast = useToast()

  watchAccount(async account => {
    if (!account || !account.address || !currentAccount) {
      return
    }

    if (
      currentAccount &&
      account.address.toLowerCase() !== currentAccount?.address.toLowerCase() &&
      !waitLoginResolve
    ) {
      setWaitLoginResolve(true)
      const newAccount = await loginWithAddress(account.address!, setLoginIn)
      if (newAccount) {
        login(newAccount)
      }
      setWaitLoginResolve(false)
    }
  })

  const handleLogin = async (
    address: string | undefined,
    useWaiting = true,
    forceRedirect = true
  ) => {
    !forceRedirect && logEvent('Clicked to connect wallet')
    if (!address) return
    try {
      const account = await loginWithAddress(
        address,
        useWaiting ? setLoginIn : () => null
      )

      // user could revoke wallet authorization any moment
      if (!account) {
        await logout(address)
        if (logged && forceRedirect) {
          await router.push('/')
        }
        return
      }

      login(account)

      logEvent('Signed in')

      // avoid redirecting if person is scheduling on a public calendar of someone else and was not logged. Definitely not the best way to do this
      if (
        forceRedirect &&
        (router.pathname === '/' || router.pathname.indexOf('/embed') != -1)
      ) {
        await router.push('/dashboard/meetings')
        return
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

  return { handleLogin, currentAccount, logged, loginIn }
}
