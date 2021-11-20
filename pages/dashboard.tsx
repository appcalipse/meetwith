import React, { useContext, useEffect, useState } from 'react'
import { AccountContext } from '../providers/AccountProvider'
import { fetchAccountMeetings } from '../utils/calendar_manager'
import { Meeting } from '../types/Meeting'
import { Account } from '../types/Account'
import { Box } from '@chakra-ui/layout'
import MeetingCard from '../components/meeting/MeetingCard'

const Dashboard: React.FC = () => {

    const { currentUser, logged } = useContext(AccountContext)
    const [meetings, setMeetings] = useState([] as Meeting[])

    const updateMeetings = async (account: Account) => {
        setMeetings(await fetchAccountMeetings(account.address))
    }
    useEffect(() => {
        logged && updateMeetings(currentUser!)
    }, [logged])

    return (
        <Box>
            {meetings.map(meeting => <MeetingCard key={meeting.id} meeting={meeting} />)}
        </Box>
    )
}

export default Dashboard