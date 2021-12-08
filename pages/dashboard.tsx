import React, { useContext, useEffect, useState } from 'react'
import { AccountContext } from '../providers/AccountProvider'
import { DBSlot } from '../types/Meeting'
import { Account } from '../types/Account'
import { Box, Container, Flex, Spacer } from '@chakra-ui/layout'
import MeetingCard from '../components/meeting/MeetingCard'
import { getMeetings } from '../utils/api_helper'
import router from 'next/router'
import ProfileInfo from '../components/profile/ProfileInfo'

const Dashboard: React.FC = () => {
  const { currentAccount, logged } = useContext(AccountContext)
  const [meetings, setMeetings] = useState([] as DBSlot[])

  const updateMeetings = async (account: Account) => {
    setMeetings(await getMeetings(account.address))
  }
  useEffect(() => {
    logged && updateMeetings(currentAccount!)
  }, [logged])

  if (!logged) {
    router.push('/')
    return <></>
  }

  return (
    <Container maxW="7xl">
      <Flex>
        <Box>
          <ProfileInfo account={currentAccount!} />
        </Box>
        <Box bg="red.500">
          {meetings.map(meeting => (
            <MeetingCard key={meeting.id} meeting={meeting} />
          ))}
        </Box>
      </Flex>
    </Container>
  )
}

export default Dashboard
