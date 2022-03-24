import React, { useState } from 'react'
import { useCookies } from 'react-cookie'

import { Account } from '../types/Account'
import { SESSION_COOKIE_NAME } from '../utils/auth/withSessionApiRoute'
import { removeSignature } from '../utils/storage'

interface IAccountContext {
  currentAccount?: Account | null
  logged: boolean
  login: (user: Account) => void
  logout: () => void
  setLoginIn: (value: boolean) => void
  loginIn: boolean
}

const DEFAULT_STATE: IAccountContext = {
  logged: false,
  login: () => null,
  logout: () => null,
  loginIn: false,
  setLoginIn: () => null,
}

const AccountContext = React.createContext<IAccountContext>(DEFAULT_STATE)

interface AccountProviderProps {
  currentAccount?: Account | null
  logged: boolean
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

  const [loginIn, setLoginIn] = useState(false)
  const [_, setCookie, removeCookie] = useCookies([SESSION_COOKIE_NAME])

  function login(account: Account) {
    setUserContext(() => ({
      ...userContext,
      currentAccount: account,
      logged: true,
    }))
  }

  const logout = async () => {
    removeCookie(SESSION_COOKIE_NAME, {
      path: '/',
      secure: process.env.NEXT_PUBLIC_ENV !== 'local',
    })
    userContext.currentAccount &&
      removeSignature(userContext.currentAccount!.address)
    setUserContext(() => ({
      ...userContext,
      currentAccount: null,
      logged: false,
    }))
  }

  const context = { ...userContext, loginIn, setLoginIn, login, logout }
  return (
    <AccountContext.Provider value={context}>
      {children}
    </AccountContext.Provider>
  )
}

export { AccountContext, AccountProvider }
