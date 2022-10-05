import {
  Box,
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
import { addHours, endOfMonth, startOfMonth } from 'date-fns'
import { Encrypted } from 'eth-crypto'
import { useContext, useEffect, useState } from 'react'
import { FaPlus } from 'react-icons/fa'

import { Account } from '@/types/Account'
import { decryptMeeting } from '@/utils/calendar_manager'
import { CalendarServiceHelper } from '@/utils/services/calendar.helper'

import { AccountContext } from '../../providers/AccountProvider'
import { DBSlot, MeetingDecrypted } from '../../types/Meeting'
import {
  fetchContentFromIPFSFromBrowser,
  getMeetings,
  getMeetingsForDashboard,
} from '../../utils/api_helper'
import MeetingCard from '../meeting/MeetingCard'
import { ScheduleMeetingDialog } from '../schedule/schedule-meeting-dialog'
import CalendarView from './components/CalendarView'

interface DashboardMeetings {
  original: DBSlot
  decoded?: MeetingDecrypted
}
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
  const [meetings, setMeetings] = useState<Map<string, DashboardMeetings>>(
    new Map()
  )
  const [currentDate, setCurrentDate] = useState(new Date())

  const [loading, setLoading] = useState(true)
  const [noMoreFetch, setNoMoreFetch] = useState(false)
  const [firstFetch, setFirstFetch] = useState(true)

  const { slotId } = useRouter().query

  const fetchMeetings = async () => {
    const startToFetch = startOfMonth(currentDate)
    const endToFetch = endOfMonth(currentDate)
    const map = meetings
    const originalMeetings = (await getMeetings(
      currentAccount!.address,
      startToFetch,
      endToFetch
    )) as DBSlot[]

    for (const meeting of originalMeetings) {
      if (!map.has(meeting.id!)) {
        map.set(meeting.id!, { original: meeting })
      }
    }

    setLoading(true)
    setMeetings(map)
    setLoading(false)
    setFirstFetch(false)
    decodeMeetings()
  }

  const decodeMeetings = async () => {
    const map = meetings
    for (const entry of map.values()) {
      if (!entry.decodedMeeting) {
        const meetingInfoEncrypted = (await fetchContentFromIPFSFromBrowser(
          entry.original.meeting_info_file_path
        )) as Encrypted
        if (meetingInfoEncrypted) {
          const decryptedMeeting = await decryptMeeting(
            {
              ...entry.original,
              meeting_info_encrypted: meetingInfoEncrypted,
            },
            currentAccount!
          )

          if (decryptedMeeting) {
            map.set(entry.original.id!, {
              original: entry.original,
              decoded: {
                ...decryptedMeeting,
                title: CalendarServiceHelper.getMeetingTitle(
                  currentAccount!.address,
                  decryptedMeeting!.participants
                ),
              },
            })
          }
        }
      }
    }
    setMeetings(map)
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
  } else if (meetings.size === 0) {
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
      meetings.set(meeting.id, { original: meeting })
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
    <Flex direction={'column'}>
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
