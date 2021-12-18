import {
  Button,
  VStack,
  Spacer,
  Image,
  Text,
  HStack,
  Spinner,
} from '@chakra-ui/react'
import dayjs from 'dayjs'
import { useContext, useEffect, useState } from 'react'
import { AccountContext } from '../../providers/AccountProvider'
import { DBSlot } from '../../types/Meeting'
import { getMeetingsForDashboard } from '../../utils/api_helper'
import MeetingCard from '../meeting/MeetingCard'

const Meetings: React.FC = () => {
  const { currentAccount } = useContext(AccountContext)
  const [meetings, setMeetings] = useState<DBSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [noMoreFetch, setNoMoreFetch] = useState(false)
  const [firstFetch, setFirstFetch] = useState(true)

  const endToFetch = dayjs().add(-1, 'hour')

  const fetchMeetings = async () => {
    const PAGE_SIZE = 5
    setLoading(true)
    const newMeetings = (await getMeetingsForDashboard(
      currentAccount!.address,
      endToFetch.toDate(),
      PAGE_SIZE,
      meetings.length
    )) as DBSlot[]
    if (newMeetings.length < PAGE_SIZE) {
      setNoMoreFetch(true)
    }
    setMeetings(meetings.concat(newMeetings))
    setLoading(false)
    setFirstFetch(false)
  }

  useEffect(() => {
    fetchMeetings()
  }, [])

  return firstFetch ? (
    <VStack alignItems="center">
      <Image src="/assets/schedule.svg" height="200px" alt="Loading..." />
      <HStack pt={8}>
        <Spinner />
        <Text fontSize="lg">Checking your schedule...</Text>
      </HStack>
    </VStack>
  ) : meetings.length === 0 ? (
    <VStack alignItems="center">
      <Image src="/assets/no_meetings.svg" height="200px" alt="Loading..." />
      <HStack pt={8}>
        <Text fontSize="lg">You have no scheduled meetings</Text>
      </HStack>
    </VStack>
  ) : (
    <VStack>
      {meetings.map(meeting => (
        <MeetingCard key={meeting.id} meeting={meeting} />
      ))}
      {!noMoreFetch && !firstFetch && (
        <Button
          isLoading={loading}
          colorScheme="orange"
          variant="outline"
          alignSelf="center"
          my={4}
          onClick={fetchMeetings}
        >
          Load more
        </Button>
      )}
      <Spacer />
    </VStack>
  )
}

export default Meetings
