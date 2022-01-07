import React, { useState } from 'react'
import { Account } from '../types/Account'

interface IAccountContext {
  currentAccount?: Account
  logged: boolean
  login: (user: Account) => void
  logout: () => void
  setLoginIn: (value: boolean) => void
  loginIn: boolean
}

const DEFAULT_STATE = {
  logged: false,
  login: () => null,
  logout: () => null,
  loginIn: false,
  setLoginIn: () => null,
}

const AccountContext = React.createContext<IAccountContext>(DEFAULT_STATE)

const AccountProvider: React.FC = ({ children }) => {
  const [userContext, setUserContext] = useState(DEFAULT_STATE)
  const [loginIn, setLoginIn] = useState(false)

  const login = (account: Account) => {
    setUserContext(() => ({
      ...userContext,
      currentAccount: account,
      logged: true,
    }))
  }

  const logout = () => {
    setUserContext(() => ({
      ...userContext,
      currentAccount: null,
      logged: false,
    }))
  }

  return (
    <AccountContext.Provider
      value={{ ...userContext, login, logout, loginIn, setLoginIn }}
    >
      {children}
    </AccountContext.Provider>
  )
}

export { AccountProvider, AccountContext }
