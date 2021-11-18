import { useRouter } from 'next/router'
import { useContext, useEffect, useState } from 'react'
import MeetSlotPicker from '../components/MeetSlotPicker'
import { UserContext } from '../providers/UserProvider'
import { RegisteredUser } from '../types/User'
import { scheduleMeeting } from '../utils/calendar_manager'
import { getAccountsDB } from '../utils/database'
import dayjs from 'dayjs'

const Schedule = () => {
    const router = useRouter()
    const { address } = router.query

    const [account, setAccount] = useState(null as RegisteredUser | null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)

    const { currentUser, logged } = useContext(UserContext)

    const checkUser = async () => {
        const accountsDB = await getAccountsDB()
        const account: RegisteredUser = accountsDB.get(address)
        if (account) {
            setAccount(account)
        } else {
            setNotFound(true)
        }
        setLoading(false)
    }

    useEffect(() => {
        checkUser()
    }, [])

    const confirmSchedule = async (startTime: Date) => {
        if (logged) {
            const start = dayjs(startTime)
            const end = dayjs(startTime).add(15, 'minute')
            await scheduleMeeting(currentUser!, account!, start, end, 'testing')
        } else {
            //TODO: provide feedback to log
        }
    }

    return (

        loading ?
            <div>Loading...</div>
            :
            notFound ? <div>User not found</div> : <div><div><MeetSlotPicker onSchedule={confirmSchedule} /></div>Wallet: {account?.address}</div>
    )
}

export default Schedule