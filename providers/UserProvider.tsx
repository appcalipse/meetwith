import React, { useState } from "react"
import { RegisteredUser } from "../models/User";

interface IUserConetxt {
    currentUser?: RegisteredUser,
    logged: boolean,
    login: (user: RegisteredUser) => void,
    logout: () => void,
}

const DEFAULT_STATE = { logged: false, login: () => { }, logout: () => { } }

const UserContext = React.createContext<IUserConetxt>(DEFAULT_STATE);

const UserProvider = ({ children }: any) => {

    const [userContext, setUserContext] = useState(DEFAULT_STATE);

    const login = (user: RegisteredUser) => {
        setUserContext(() => ({
            ...userContext,
            currentUser: user,
            logged: true,
        }));
    };

    const logout = () => {
        setUserContext(() => ({
            ...userContext,
            currentUser: null,
            logged: false,
        }));
    };

    return (
        <UserContext.Provider value={{ ...userContext, login, logout }}>
            {children}
        </UserContext.Provider>
    );
}

export { UserProvider, UserContext }
