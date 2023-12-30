import { watchAccount } from '@wagmi/core'
import React, { useEffect, useState } from 'react'
import { useCookies } from 'react-cookie'
import { useDisconnect } from 'wagmi'

import { SESSION_COOKIE_NAME } from '@/middleware'
import { getAccount, getOwnAccount } from '@/utils/api_helper'
import QueryKeys from '@/utils/query_keys'
import { queryClient } from '@/utils/react_query'
import { loginWithAddress } from '@/utils/user_manager'

import { Account } from '../types/Account'
import { removeSignature } from '../utils/storage'

interface IAccountContext {
  currentAccount?: Account | null
  logged: boolean
  login: (user: Account) => void
  logout: (address?: string) => void
  setLoginIn: (value: boolean) => void
  loginIn: boolean
  updateUser: () => Promise<void>
}

const DEFAULT_STATE: IAccountContext = {
  logged: false,
  login: () => null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  logout: (address?: string) => null,
  loginIn: false,
  setLoginIn: () => null,
  updateUser: () => Promise.resolve(),
}

const AccountContext = React.createContext<IAccountContext>(DEFAULT_STATE)

interface AccountProviderProps {
  currentAccount?: Account | null
  logged: boolean
  children: any
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

  const { disconnect } = useDisconnect()
  const [loginIn, setLoginIn] = useState(false)
  const [newAccount, setNewAccount] = useState(undefined as string | undefined)
  const [_, setCookie, removeCookie] = useCookies([SESSION_COOKIE_NAME])

  watchAccount(async account => {
    if (
      !account ||
      !account.address ||
      !context.currentAccount ||
      !context.logged
    ) {
      return
    } else if (
      account.address.toLowerCase() !==
      context.currentAccount.address.toLowerCase()
    ) {
      setNewAccount(account.address)
    }
  })

  const changeAccount = async (accountAddress: string) => {
    const newAccount = await loginWithAddress(accountAddress, setLoginIn)
    if (newAccount) {
      login(newAccount)
    }
  }

  useEffect(() => {
    if (newAccount && context.logged) {
      const accountAddress = newAccount
      setNewAccount(undefined)
      changeAccount(accountAddress)
    }
  }, [newAccount])

  function login(account: Account) {
    setUserContext(() => ({
      ...userContext,
      currentAccount: account,
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

  const logout = async (address?: string) => {
    disconnect()
    queryClient.invalidateQueries(QueryKeys.account(address?.toLowerCase()))
    if (address) {
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
      {children}
    </AccountContext.Provider>
  )
}

export { AccountContext, AccountProvider }
