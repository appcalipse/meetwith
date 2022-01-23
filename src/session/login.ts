import React, { useContext, useEffect, useState } from 'react'
import { loginWithWallet, web3 } from '../utils/user_manager'
import { AccountContext } from '../providers/AccountProvider'
import { logEvent } from '../utils/analytics'
import router from 'next/router'
import * as Sentry from '@sentry/browser'
import { useToast } from '@chakra-ui/react'

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
            console.log('login new account!')
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
