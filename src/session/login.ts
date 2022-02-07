import { useToast } from '@chakra-ui/react'
import * as Sentry from '@sentry/browser'
import router from 'next/router'
import { useContext } from 'react'

import { AccountContext } from '../providers/AccountProvider'
import { logEvent } from '../utils/analytics'
import { loginWithWallet, web3 } from '../utils/user_manager'

export const useLogin = () => {
  const { currentAccount, logged, login, loginIn, setLoginIn } =
    useContext(AccountContext)
  const toast = useToast()
  const handleLogin = async (useWaiting = true, forceRedirect = true) => {
    logEvent('Clicked to connect wallet')
    try {
      const account = await loginWithWallet(
        useWaiting ? setLoginIn : () => null
      )
      if (!account) {
        return
      }

      login(account)
      const provider = web3.currentProvider as any
      provider &&
        provider.on('accountsChanged', async (accounts: string[]) => {
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
