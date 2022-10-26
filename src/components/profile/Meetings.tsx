import {
  Button,
  Flex,
  Heading,
  HStack,
  Image,
  Spacer,
  Spinner,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { addHours } from 'date-fns'
import { useRouter } from 'next/router'
import { useContext, useEffect, useState } from 'react'
import { FaPlus } from 'react-icons/fa'

import { decodeMeeting } from '@/utils/calendar_manager'

import { AccountContext } from '../../providers/AccountProvider'
import { DBSlot } from '../../types/Meeting'
import { getMeeting, getMeetingsForDashboard } from '../../utils/api_helper'
import MeetingCard from '../meeting/MeetingCard'
import { useMeetingDialog } from '../schedule/meeting.dialog.hook'

const Meetings: React.FC = () => {
  const { currentAccount } = useContext(AccountContext)
  const [meetings, setMeetings] = useState<DBSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [noMoreFetch, setNoMoreFetch] = useState(false)
  const [firstFetch, setFirstFetch] = useState(true)

  const endToFetch = addHours(new Date(), -1)

  const { slotId } = useRouter().query

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
            onUpdate={fetchMeetings}
            onClickToOpen={(meeting, decryptedMeeting, timezone) =>
              openMeetingDialog(meeting, decryptedMeeting, timezone, afterClose)
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

  const [MeetingDialog, openMeetingDialog] = useMeetingDialog()

  useEffect(() => {
    slotId && fillMeeting()
  }, [slotId])

  const afterClose = (meeting?: DBSlot) => {
    // not using router API to avoid re-rendinreing component
    history.pushState(null, '', window.location.pathname)

    if (meeting) {
      meetings.push(meeting)
      setMeetings(
        meetings.sort(
          (m1, m2) =>
            (m1.start as Date).getTime() - (m2.start as Date).getTime()
        )
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
  }

  const fillMeeting = async () => {
    const meeting = await getMeeting(slotId as string)
    const decodedMeeting = await decodeMeeting(meeting, currentAccount!)
    openMeetingDialog(
      meeting,
      decodedMeeting,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      afterClose
    )
  }

  const toast = useToast()

  return (
    <Flex direction={'column'} maxWidth="100%">
      <HStack justifyContent="center" alignItems="flex-start" mb={4}>
        <Heading flex={1} fontSize="2xl">
          My Meetings
          <Text fontSize="sm" fontWeight={100} mt={1}>
            Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </Text>
        </Heading>
        <Button
          onClick={() =>
            openMeetingDialog(
              null,
              null,
              Intl.DateTimeFormat().resolvedOptions().timeZone,
              afterClose
            )
          }
          colorScheme="orange"
          display={{ base: 'none', md: 'flex' }}
          mt={{ base: 4, md: 0 }}
          mb={4}
          leftIcon={<FaPlus />}
        >
          New meeting
        </Button>
      </HStack>
      <Button
        onClick={() =>
          openMeetingDialog(
            null,
            null,
            Intl.DateTimeFormat().resolvedOptions().timeZone,
            afterClose
          )
        }
        colorScheme="orange"
        display={{ base: 'flex', md: 'none' }}
        mb={8}
        leftIcon={<FaPlus />}
      >
        New meeting
      </Button>
      {content}
      <MeetingDialog />
    </Flex>
  )
}

export default Meetings
