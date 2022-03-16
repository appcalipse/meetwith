import { useToast } from '@chakra-ui/react'
import * as Sentry from '@sentry/browser'
import router from 'next/router'
import { useContext } from 'react'

import { AccountContext } from '../providers/AccountProvider'
import { logEvent } from '../utils/analytics'
import { InvalidSessionError } from '../utils/errors'
import { loginWithWallet, web3 } from '../utils/user_manager'

export const useLogin = () => {
  const { currentAccount, logged, login, loginIn, setLoginIn, logout } =
    useContext(AccountContext)
  const toast = useToast()
  const handleLogin = async (useWaiting = true, forceRedirect = true) => {
    !forceRedirect && logEvent('Clicked to connect wallet')
    try {
      const account = await loginWithWallet(
        useWaiting ? setLoginIn : () => null
      )

      // user could revoke wallet authorization any moment
      if (!account) {
        if (logged && forceRedirect) {
          await logout()
          await router.push('/')
        }
        return
      }

      login(account)
      const provider = web3.currentProvider as any
      provider &&
        provider.on('accountsChanged', async (accounts: string[]) => {
          // for this to get called, we need to have an account connected first
          // if this changed, then the user removed the permission directly in
          // the wallet manager, and we should logout the user right away,
          // because the account provider will throw an exception and not ask the
          // user to give the required permissions automatically
          if (!accounts?.length) {
            await router.push('/logout')
            return
          }

          const newAccount = await loginWithWallet(setLoginIn)
          if (newAccount) {
            login(newAccount)
          }
        })

      logEvent('Signed in')

      if (forceRedirect && router.pathname === '/') {
        await router.push('/dashboard')
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
