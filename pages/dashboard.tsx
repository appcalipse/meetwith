import React, { useContext, useEffect, useState } from 'react'
import { AccountContext } from '../providers/AccountProvider'
import { MeetingEncrypted } from '../types/Meeting'
import { Account } from '../types/Account'
import { Box } from '@chakra-ui/layout'
import MeetingCard from '../components/meeting/MeetingCard'
import { getMeetings } from '../utils/api_helper'

const Dashboard: React.FC = () => {

    const { currentAccount, logged } = useContext(AccountContext)
    const [meetings, setMeetings] = useState([] as MeetingEncrypted[])

    const updateMeetings = async (account: Account) => {
        setMeetings(await getMeetings(account.address))
    }
    useEffect(() => {
        logged && updateMeetings(currentAccount!)
    }, [logged])

    return (
        <Box>
            {meetings.map(meeting => <MeetingCard key={meeting.id} meeting={meeting} />)}
        </Box>
    )
}

export default Dashboard