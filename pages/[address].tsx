import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { RegisteredUser } from '../models/User'
import { getAccountsDB } from '../utils/database'

const Schedule = () => {
    const router = useRouter()
    const { address } = router.query

    const [account, setAccount] = useState('')
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)

    const checkUser = async () => {
        const accountsDB = await getAccountsDB()
        console.log(accountsDB.get())
        const account: RegisteredUser = accountsDB.get(address)
        if (account) {
            setAccount(account.address)
        } else {
            setNotFound(true)
        }
        setLoading(false)
    }
    useEffect(() => {
        checkUser()
    }, [])

    return (

        loading ?
            <div>Loading...</div>
            :
            notFound ? <div>User not found</div> : <div>Wallet: {account}</div>
    )
}

export default Schedule