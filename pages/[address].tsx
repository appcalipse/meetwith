import { useRouter } from 'next/router'
import { useContext, useEffect, useState } from 'react'
import MeetSlotPicker from '../components/MeetSlotPicker'
import { AccountContext } from '../providers/AccountProvider'
import { fetchAccountMeetings, isSlotAvailable, scheduleMeeting } from '../utils/calendar_manager'
import dayjs from 'dayjs'
import { Meeting } from '../types/Meeting'
import { getAccount } from '../utils/database'

const Schedule = () => {
    const router = useRouter()
    const { address } = router.query

    if (!address) {
        router.push('/')
    }

    const [account, setAccount] = useState(null as string | null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [meetings, setMeetings] = useState([] as Meeting[])

    const { currentUser, logged } = useContext(AccountContext)

    const checkUser = async () => {
        const account = await getAccount(address! as string)
        if (account) {
            setAccount(account.address)
            updateMeetings(account.address)
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
            await scheduleMeeting(currentUser!.address, account!, start, end, 'testing')
        } else {
            //TODO: provide feedback to log
        }
    }

    const updateMeetings = async (account: string) => {
        const monthStart = dayjs(currentMonth).startOf('month')
        const monthEnd = dayjs(currentMonth).endOf('month')

        setMeetings(await fetchAccountMeetings(account!, monthStart.toDate(), monthEnd.toDate()))
    }

    useEffect(() => {
        account && updateMeetings(account)
    }, [currentMonth])

    const validateSlot = (slot: Date): boolean => {
        return isSlotAvailable(30, slot, meetings)
    }

    return (

        loading ?
            <div>Loading...</div>
            :
            notFound ? <div>User not found</div> :
                <div>
                    <div>
                        <MeetSlotPicker onMonthChange={(day: Date) => setCurrentMonth(day)} onSchedule={confirmSchedule} slotDurationInMinutes={30} timeSlotAvailability={validateSlot} />
                    </div>Wallet: {account}
                </div>
    )
}

export default Schedule