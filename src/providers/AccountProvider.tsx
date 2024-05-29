import React, { ReactNode, useContext, useState } from 'react'
import { useCookies } from 'react-cookie'
import { useDisconnect } from 'thirdweb/react'
import { type Wallet } from 'thirdweb/wallets'

import { SESSION_COOKIE_NAME } from '@/middleware'
import { Account } from '@/types/Account'
import { getOwnAccount } from '@/utils/api_helper'
import QueryKeys from '@/utils/query_keys'
import { queryClient } from '@/utils/react_query'
import { removeSignature } from '@/utils/storage'

import { OnboardingModalContext } from './OnboardingModalProvider'
import { OnboardingProvider } from './OnboardingProvider'

interface IAccountContext {
  currentAccount?: Account | null
  logged: boolean
  login: (account: Account) => void
  logout: (wallet?: Wallet) => void
  setLoginIn: (value: boolean) => void
  loginIn: boolean
  updateUser: () => Promise<void>
}

const DEFAULT_STATE: IAccountContext = {
  logged: false,
  login: () => null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  logout: (wallet?: Wallet) => null,
  loginIn: false,
  setLoginIn: () => null,
  updateUser: () => Promise.resolve(),
}

const AccountContext = React.createContext<IAccountContext>(DEFAULT_STATE)

interface AccountProviderProps {
  currentAccount?: Account | null
  logged: boolean
  children: ReactNode
}

const AccountProvider: React.FC<AccountProviderProps> = ({
  children,
  currentAccount,
  logged,
}) => {
  const [userContext, setUserContext] = useState({
    ...DEFAULT_STATE,
    currentAccount,
    logged,
  })

  const { resetOnboarding } = useContext(OnboardingModalContext)

  const { disconnect } = useDisconnect()
  const [loginIn, setLoginIn] = useState(false)
  const [, , removeCookie] = useCookies([SESSION_COOKIE_NAME])

  function login(currentAccount: Account) {
    setUserContext(() => ({
      ...userContext,
      currentAccount,
      logged: true,
    }))
  }

  async function updateUser() {
    if (!currentAccount?.address) return

    await queryClient.invalidateQueries(
      QueryKeys.account(currentAccount?.address?.toLowerCase())
    )

    const account = await getOwnAccount(currentAccount.address)

    setUserContext(() => ({
      ...userContext,
      currentAccount: account,
      logged: true,
    }))
  }

  const logout = async (wallet?: Wallet) => {
    wallet && disconnect(wallet)
    const address = wallet?.getAccount()?.address?.toLowerCase()
    if (address) {
      queryClient.invalidateQueries(QueryKeys.account(address))
      removeSignature(address)
    } else if (userContext.currentAccount) {
      removeSignature(userContext.currentAccount!.address)
    }

    removeCookie(SESSION_COOKIE_NAME, {
      path: '/',
      secure:
        process.env.NEXT_PUBLIC_ENV === 'production' ||
        process.env.NEXT_PUBLIC_ENV === 'development',
    })
    setUserContext(() => ({
      ...userContext,
      currentAccount: null,
      logged: false,
    }))
    resetOnboarding()
  }
  const context = {
    ...userContext,
    loginIn,
    setLoginIn,
    login,
    logout,
    updateUser,
  }
  return (
    <AccountContext.Provider value={context}>
      <OnboardingProvider currentAccount={context.currentAccount}>
        {children}
      </OnboardingProvider>
    </AccountContext.Provider>
  )
}

export { AccountContext, AccountProvider }
