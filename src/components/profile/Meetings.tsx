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
import { utcToZonedTime } from 'date-fns-tz'
import { useRouter } from 'next/router'
import { ReactNode, useEffect, useState } from 'react'
import { FaPlus } from 'react-icons/fa'

import { useMeetingDialog } from '@/components/schedule/meeting.dialog.hook'
import { Account } from '@/types/Account'
import { Intents } from '@/types/Dashboard'
import { DBSlot, MeetingChangeType } from '@/types/Meeting'
import { getMeeting, getMeetingsForDashboard } from '@/utils/api_helper'
import { decodeMeeting } from '@/utils/calendar_manager'

import MeetingCard from '../meeting/MeetingCard'
import { useCancelDialog } from '../schedule/cancel.dialog.hook'

const Meetings: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  const [meetings, setMeetings] = useState<DBSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [noMoreFetch, setNoMoreFetch] = useState(false)
  const [firstFetch, setFirstFetch] = useState(true)
  const { push, query } = useRouter()
  const { slotId, intent } = query as {
    slotId: string
    intent: Intents
  }

  const timezone =
    currentAccount?.preferences?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone
  const endToFetch = addHours(utcToZonedTime(new Date(), timezone), -1)

  const fetchMeetings = async (reset?: boolean) => {
    const PAGE_SIZE = 5
    setLoading(true)
    const newMeetings = (await getMeetingsForDashboard(
      currentAccount.address,
      endToFetch,
      PAGE_SIZE,
      meetings.length
    )) as DBSlot[]

    if (newMeetings.length < PAGE_SIZE) {
      setNoMoreFetch(true)
    }
    setMeetings((reset ? [] : [...meetings]).concat(newMeetings))
    setLoading(false)
    setFirstFetch(false)
  }

  const resetState = async () => {
    setFirstFetch(true)
    setNoMoreFetch(false)
    void fetchMeetings(true)
  }

  useEffect(() => {
    void resetState()
  }, [currentAccount?.address])

  let content: ReactNode

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
            timezone={timezone}
            onCancel={removed =>
              afterClose(MeetingChangeType.DELETE, undefined, removed)
            }
          />
        ))}
        {!noMoreFetch && !firstFetch && (
          <Button
            isLoading={loading}
            colorScheme="primary"
            variant="outline"
            alignSelf="center"
            my={4}
            onClick={() => fetchMeetings()}
          >
            Load more
          </Button>
        )}
        <Spacer />
      </VStack>
    )
  }

  const afterClose = (
    changeType: MeetingChangeType,
    meeting?: DBSlot,
    removedSlots?: string[]
  ) => {
    // not using router API to avoid re-rendering component
    history.pushState(null, '', window.location.pathname)

    if (meeting || removedSlots) {
      let newMeetings: DBSlot[] = []

      if (meeting) {
        newMeetings = meetings.filter(m => m.id !== meeting.id)
        newMeetings.push(meeting!)
      }
      if (removedSlots) {
        newMeetings = meetings.filter(m => removedSlots?.indexOf(m.id!) === -1)
      }
      setMeetings(
        newMeetings.sort(
          (m1, m2) =>
            (m1.start as Date).getTime() - (m2.start as Date).getTime()
        )
      )

      let title, description
      switch (changeType) {
        case MeetingChangeType.CREATE:
          title = 'Scheduled'
          description = 'Meeting scheduled successfully.'
          break
        case MeetingChangeType.UPDATE:
          title = 'Updated'
          description = 'Meeting updated successfully.'
          break
        case MeetingChangeType.DELETE:
          title = 'Canceled'
          description = 'Meeting canceled successfully.'
          break
      }
      toast({
        title,
        description,
        status: 'success',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
    }
  }

  const toast = useToast()
  const [MeetingDialog, openMeetingDialog] = useMeetingDialog()
  const { CancelDialog, openCancelDialog } = useCancelDialog()
  const fillMeeting = async () => {
    try {
      const meeting = await getMeeting(slotId as string)
      const decodedMeeting = await decodeMeeting(meeting, currentAccount!)
      if (intent === Intents.CANCEL_MEETING) {
        openCancelDialog(
          meeting,
          decodedMeeting ?? undefined,
          afterClose,
          currentAccount
        )
      } else {
        openMeetingDialog(
          meeting,
          decodedMeeting,
          Intl.DateTimeFormat().resolvedOptions().timeZone,
          afterClose
        )
      }
    } catch (e) {}
  }
  useEffect(() => {
    if (!slotId) return
    fillMeeting()
  }, [slotId])

  return (
    <Flex direction={'column'} maxWidth="100%">
      <HStack justifyContent="center" alignItems="flex-start" mb={4}>
        <Heading flex={1} fontSize="2xl">
          My Meetings
          <Text fontSize="sm" fontWeight={100} mt={1}>
            Timezone: {currentAccount.preferences.timezone}
          </Text>
        </Heading>
        <Button
          onClick={() => push(`/dashboard/schedule`)}
          colorScheme="primary"
          display={{ base: 'none', md: 'flex' }}
          mt={{ base: 4, md: 0 }}
          mb={4}
          leftIcon={<FaPlus />}
        >
          New meeting
        </Button>
      </HStack>
      <Button
        onClick={() => push(`/dashboard/schedule`)}
        colorScheme="primary"
        display={{ base: 'flex', md: 'none' }}
        mb={8}
        leftIcon={<FaPlus />}
      >
        New meeting
      </Button>
      {content}
      <MeetingDialog />
      <CancelDialog />
    </Flex>
  )
}

export default Meetings
