import {
  Button,
  VStack,
  Spacer,
  Image,
  Text,
  HStack,
  Spinner,
  useDisclosure,
  Wrap,
  Flex,
  Box,
} from '@chakra-ui/react'
import { addHours } from 'date-fns'
import { useContext, useEffect, useState } from 'react'
import { AccountContext } from '../../providers/AccountProvider'
import { DBSlot } from '../../types/Meeting'
import { getMeetingsForDashboard } from '../../utils/api_helper'
import MeetingCard from '../meeting/MeetingCard'
import { FaPlus } from 'react-icons/fa'
import { ScheduleModal } from '../schedule-modal'

const Meetings: React.FC = () => {
  const { currentAccount } = useContext(AccountContext)
  const [meetings, setMeetings] = useState<DBSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [noMoreFetch, setNoMoreFetch] = useState(false)
  const [firstFetch, setFirstFetch] = useState(true)

  const endToFetch = addHours(new Date(), -1)

  const fetchMeetings = async () => {
    const PAGE_SIZE = 5
    setLoading(true)
    const newMeetings = (await getMeetingsForDashboard(
      currentAccount!.address,
      endToFetch,
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

  let content: any

  if (firstFetch) {
    content = (
      <VStack alignItems="center">
        <Image src="/assets/schedule.svg" height="200px" alt="Loading..." />
        <HStack pt={8}>
          <Spinner />
          <Text fontSize="lg">Checking your schedule...</Text>
        </HStack>
      </VStack>
    )
  } else if (meetings.length === 0) {
    content = (
      <VStack alignItems="center">
        <Image src="/assets/no_meetings.svg" height="200px" alt="Loading..." />
        <HStack pt={8}>
          <Text fontSize="lg">You have no scheduled meetings</Text>
        </HStack>
      </VStack>
    )
  } else {
    content = (
      <VStack>
        {meetings.map(meeting => (
          <MeetingCard
            key={meeting.id}
            meeting={meeting}
            timezone={
              currentAccount?.preferences?.timezone ||
              Intl.DateTimeFormat().resolvedOptions().timeZone
            }
          />
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

  const { isOpen, onOpen, onClose } = useDisclosure()
  const isLocalDevelopment = process.env.NEXT_PUBLIC_ENV === 'local'
  return (
    <Flex direction={'column'}>
      <ScheduleModal isOpen={isOpen} onClose={onClose} onOpen={onOpen} />
      <Text sx={{ alignSelf: 'left' }}>Meeting list</Text>
      <Box>
        <Button
          onClick={onOpen}
          colorScheme="orange"
          isFullWidth={false}
          display={isLocalDevelopment ? 'flex' : 'none'}
          float={'right'}
          leftIcon={<FaPlus />}
        >
          New meeting
        </Button>
      </Box>
      {content}
    </Flex>
  )
}

export default Meetings
