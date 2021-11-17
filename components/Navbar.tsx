import React, { useContext } from 'react'
import { Button } from "@chakra-ui/react"
import { loginWithWallet } from '../utils/wallet'
import { UserContext } from '../providers/UserProvider'

const NavBar = () => {

    const { currentUser, logged, login } = useContext(UserContext)

    const handleLogin = async () => {
        if (!currentUser) {
            const user = await loginWithWallet()
            await login(user)
        }
    }

    return (
        <header>
            <Button size="lg" onClick={handleLogin}>
                {!logged ? 'Log in with wallet' : currentUser!.address}
            </Button>
        </header>
    )
}
export default NavBar