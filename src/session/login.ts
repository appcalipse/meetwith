import { useToast } from '@chakra-ui/react'
import * as Sentry from '@sentry/nextjs'
import router from 'next/router'
import { useContext } from 'react'
import { Wallet } from 'thirdweb/wallets'
import { getUserEmail } from 'thirdweb/wallets/in-app'

import { AccountContext } from '@/providers/AccountProvider'
import {
  AccountNotifications,
  NotificationChannel,
} from '@/types/AccountNotifications'
import { logEvent } from '@/utils/analytics'
import { setNotificationSubscriptions } from '@/utils/api_helper'
import { InvalidSessionError } from '@/utils/errors'
import { loginWithAddress, thirdWebClient } from '@/utils/user_manager'

export const useLogin = () => {
  const { logged, currentAccount, login, loginIn, setLoginIn, logout } =
    useContext(AccountContext)
  const toast = useToast()
  const handleLogin = async (
    wallet: Wallet | undefined,
    useWaiting = true,
    forceRedirect = true,
    shouldRedirect = true,
    redirectPath?: string
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
          shouldRedirect && (await router.push('/'))
        }
        return
      }

      login(account)

      logEvent('Signed in')

      if (forceRedirect) {
        // redirect new accounts to onboarding
        if (account.signedUp) {
          const stateObj: any = { signedUp: true }

          if (wallet.id === 'inApp') {
            // needed due bug in the SDK that returns the last email even if a new EOA signs in
            const email = await getUserEmail({ client: thirdWebClient })
            if (email) {
              stateObj.email = email
              if (!shouldRedirect) {
                // force-set email notification for users signing up from pages with no onboarding redirection
                const subs = {
                  account_address: account.address,
                  notification_types: [],
                } as AccountNotifications

                subs.notification_types.push({
                  channel: NotificationChannel.EMAIL,
                  destination: email,
                  disabled: false,
                })

                await setNotificationSubscriptions(subs)

                logEvent('Set notifications', {
                  channels: subs.notification_types.map(sub => sub.channel),
                })
              }
            }
          }
          if (redirectPath) {
            stateObj.redirect = redirectPath
          }
          const state = Buffer.from(JSON.stringify(stateObj)).toString('base64')

          shouldRedirect &&
            (await router.push(
              redirectPath
                ? `${redirectPath}&authstate=${state}`
                : `/dashboard/details?state=${state}`
            ))
          return
        }

        // avoid redirecting if person is scheduling on a public calendar
        // of someone else and was not logged. Definitely not the best way to do this
        if (router.pathname === '/invite-accept' && redirectPath) {
          await router.push(redirectPath)
        }
        if (
          router.pathname === '/' ||
          router.pathname.indexOf('/embed') != -1
        ) {
          shouldRedirect &&
            (await router.push(
              `/dashboard/meetings${
                redirectPath ? `?redirect=${redirectPath}` : ''
              }`
            ))
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
