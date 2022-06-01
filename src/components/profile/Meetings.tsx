import {
  Button,
  Flex,
  Heading,
  HStack,
  Image,
  Spacer,
  Spinner,
  Text,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { addHours } from 'date-fns'
import { useContext, useEffect, useState } from 'react'
import { FaPlus } from 'react-icons/fa'

import { AccountContext } from '../../providers/AccountProvider'
import { DBSlot } from '../../types/Meeting'
import { getMeetingsForDashboard } from '../../utils/api_helper'
import MeetingCard from '../meeting/MeetingCard'
import { ScheduleModal } from '../schedule/schedule-modal'

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
      <VStack alignItems="center" mb={8}>
        <Image src="/assets/schedule.svg" height="200px" alt="Loading..." />
        <HStack pt={8}>
          <Spinner />
          <Text fontSize="lg">Checking your schedule...</Text>
        </HStack>
      </VStack>
    )
  } else if (meetings.length === 0) {
    content = (
      <VStack alignItems="center" mb={8}>
        <Image src="/assets/no_meetings.svg" height="200px" alt="Loading..." />
        <HStack pt={8}>
          <Text fontSize="lg">You have no scheduled meetings</Text>
        </HStack>
      </VStack>
    )
  } else {
    content = (
      <VStack mb={8}>
        {meetings.map(meeting => (
          <MeetingCard
            key={meeting.id}
            meeting={meeting}
            timezone={Intl.DateTimeFormat().resolvedOptions().timeZone}
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

  const toast = useToast()

  const afterClose = (meeting?: DBSlot) => {
    if (meeting) {
      meetings.push(meeting)
      setMeetings(
        meetings.sort((m1, m2) => m1.start.getTime() - m2.start.getTime())
      )
      toast({
        title: 'Scheduled',
        description: 'Meeting scheduled successfully.',
        status: 'success',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
    }
    onClose()
  }

  return (
    <Flex direction={'column'}>
      <HStack justifyContent="center" alignItems="flex-start" mb={4}>
        <Heading flex={1} fontSize="2xl">
          My Meetings
        </Heading>
        <Button
          onClick={onOpen}
          colorScheme="orange"
          display={{ base: 'none', md: 'block' }}
          mt={{ base: 4, md: 0 }}
          mb={4}
          leftIcon={<FaPlus />}
        >
          New meeting
        </Button>
      </HStack>
      <Text fontSize="sm" mb={4}>
        Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
      </Text>
      <Button
        onClick={onOpen}
        colorScheme="orange"
        display={{ base: 'block', md: 'none' }}
        mb={8}
        leftIcon={<FaPlus />}
      >
        New meeting
      </Button>
      {content}
      <ScheduleModal isOpen={isOpen} onClose={afterClose} onOpen={onOpen} />
    </Flex>
  )
}

export default Meetings
