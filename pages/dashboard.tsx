import React, { useContext, useEffect, useState } from 'react'
import { AccountContext } from '../providers/AccountProvider'
import { DBSlot } from '../types/Meeting'
import { Box, Container, Flex } from '@chakra-ui/layout'
import MeetingCard from '../components/meeting/MeetingCard'
import router from 'next/router'
import ProfileEdit from '../components/profile/ProfileEdit'

const Dashboard: React.FC = () => {
  const { currentAccount, logged } = useContext(AccountContext)
  const [meetings, setMeetings] = useState([] as DBSlot[])

  if (!logged) {
    router.push('/')
    return <></>
  }

  return (
    <Container maxW="6xl" mt={8} flex={1}>
      <ProfileEdit />
    </Container>
  )
}

export default Dashboard
