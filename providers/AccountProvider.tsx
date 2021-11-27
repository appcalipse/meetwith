import React, { useState } from "react"
import { Account } from "../types/Account";

interface IAccountContext {
    currentAccount?: Account,
    logged: boolean,
    login: (user: Account) => void,
    logout: () => void,
}

const DEFAULT_STATE = { logged: false, login: () => { }, logout: () => { } }

const AccountContext = React.createContext<IAccountContext>(DEFAULT_STATE);

const AccountProvider = ({ children }: any) => {

    const [userContext, setUserContext] = useState(DEFAULT_STATE);

    const login = (account: Account) => {
        setUserContext(() => ({
            ...userContext,
            currentAccount: account,
            logged: true,
        }));
    };

    const logout = () => {
        setUserContext(() => ({
            ...userContext,
            currentAccount: null,
            logged: false,
        }));
    };

    return (
        <AccountContext.Provider value={{ ...userContext, login, logout }}>
            {children}
        </AccountContext.Provider>
    );
}

export { AccountProvider, AccountContext }
