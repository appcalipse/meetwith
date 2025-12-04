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
import { ActionsContext } from '@/providers/schedule/ActionsContext'
import { Account } from '@/types/Account'
import { Intents } from '@/types/Dashboard'
import {
  ExtendedDBSlot,
  MeetingChangeType,
  MeetingDecrypted,
} from '@/types/Meeting'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import {
  getMeeting,
  getMeetingsForDashboard,
  getSlotByMeetingId,
} from '@/utils/api_helper'
import { decodeMeeting, deleteMeeting } from '@/utils/calendar_manager'
import { NO_MEETING_TYPE } from '@/utils/constants/meeting-types'
import { handleApiError } from '@/utils/error_helper'
import {
  GateConditionNotValidError,
  GoogleServiceUnavailable,
  Huddle01ServiceUnavailable,
  InvalidURL,
  MeetingChangeConflictError,
  MeetingCreationError,
  MeetingWithYourselfError,
  MultipleSchedulersError,
  TimeNotAvailableError,
  UrlCreationError,
  ZoomServiceUnavailable,
} from '@/utils/errors'
import { getSignature } from '@/utils/storage'

import MeetingCard from '../meeting/MeetingCard'
import { useCancelDialog } from '../schedule/cancel.dialog.hook'
const Meetings: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  const [meetings, setMeetings] = useState<ExtendedDBSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [noMoreFetch, setNoMoreFetch] = useState(false)
  const [firstFetch, setFirstFetch] = useState(true)
  const { push, query } = useRouter()
  const { slotId, conferenceId, intent } = query as {
    slotId: string
    conferenceId: string
    intent: Intents
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const endToFetch = addHours(utcToZonedTime(new Date(), timezone), -1)

  const fetchMeetings = async (reset?: boolean) => {
    const PAGE_SIZE = 5
    setLoading(true)
    const newMeetings = (await getMeetingsForDashboard(
      currentAccount.address,
      endToFetch,
      PAGE_SIZE,
      meetings.length
    )) as ExtendedDBSlot[]

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
  const handleDelete = async (
    actor?: ParticipantInfo,
    decryptedMeeting?: MeetingDecrypted
  ) => {
    if (!decryptedMeeting) return
    try {
      const meeting = await deleteMeeting(
        true,
        currentAccount?.address || '',
        NO_MEETING_TYPE,
        decryptedMeeting?.start,
        decryptedMeeting?.end,
        decryptedMeeting,
        getSignature(currentAccount?.address || '') || '',
        actor
      )
      toast({
        title: 'Meeting Deleted',
        description: 'The meeting was deleted successfully',
        status: 'success',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
      return meeting
    } catch (e: unknown) {
      if (e instanceof MeetingWithYourselfError) {
        toast({
          title: "Ops! Can't do that",
          description: e.message,
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof TimeNotAvailableError) {
        toast({
          title: 'Failed to delete meeting',
          description: 'The selected time is not available anymore',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof GateConditionNotValidError) {
        toast({
          title: 'Failed to delete meeting',
          description: e.message,
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof MeetingCreationError) {
        toast({
          title: 'Failed to delete meeting',
          description:
            'A meeting requires at least two participants. Please add more participants to schedule the meeting.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof MultipleSchedulersError) {
        toast({
          title: 'Failed to delete meeting',
          description: 'A meeting must have only one scheduler',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof MeetingChangeConflictError) {
        toast({
          title: 'Failed to delete meeting',
          description:
            'Someone else has updated this meeting. Please reload and try again.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof InvalidURL) {
        toast({
          title: 'Failed to delete meeting',
          description: 'Please provide a valid url/link for your meeting.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof Huddle01ServiceUnavailable) {
        toast({
          title: 'Failed to create video meeting',
          description:
            'Huddle01 seems to be offline. Please select a custom meeting link, or try again.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof ZoomServiceUnavailable) {
        toast({
          title: 'Failed to create video meeting',
          description:
            'Zoom seems to be offline. Please select a different meeting location, or try again.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof GoogleServiceUnavailable) {
        toast({
          title: 'Failed to create video meeting',
          description:
            'Google seems to be offline. Please select a different meeting location, or try again.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof UrlCreationError) {
        toast({
          title: 'Failed to delete meeting',
          description:
            'There was an issue generating a meeting url for your meeting. try using a different location',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else {
        handleApiError('Error deleting meeting', e)
      }
    }
  }
  const context = {
    handleDelete,
    handleSchedule: async () => {},
    handleCancel: () => {},
  }
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
            onCancel={(removed: string[], skipToast?: boolean) =>
              afterClose(
                MeetingChangeType.DELETE,
                undefined,
                removed,
                skipToast
              )
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
    meeting?: ExtendedDBSlot,
    removedSlots?: string[],
    skipToast?: boolean
  ) => {
    // not using router API to avoid re-rendering component
    history.pushState(null, '', window.location.pathname)

    if (meeting || removedSlots) {
      let newMeetings: ExtendedDBSlot[] = []

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
      if (skipToast) return

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
      let meeting: ExtendedDBSlot
      let decodedMeeting: MeetingDecrypted | null = null

      if (conferenceId) {
        // For dashboard, getSlotByMeetingId should return the account slot for the current user
        const slot = await getSlotByMeetingId(conferenceId as string)
        if (!slot) {
          toast({
            title: 'Meeting not found',
            status: 'error',
            description: 'The meeting you are trying to access was not found.',
            duration: 5000,
            isClosable: true,
          })
          return
        }
        // For dashboard meetings, we expect account slots
        // Single calendar events: both host and guest share the same meeting_id (conferenceId)
        // but each has their own slot. getSlotByMeetingId should return the slot for the current account
        if (slot.user_type === 'account') {
          meeting = slot as ExtendedDBSlot
          decodedMeeting = await decodeMeeting(meeting, currentAccount!)
        } else {
          // If it's a guest slot, we might need to get the account slot instead
          // For now, show an error as dashboard should only handle account slots
          toast({
            title: 'Invalid meeting',
            status: 'error',
            description:
              'This meeting cannot be managed from the dashboard. Please use the guest cancel link.',
            duration: 5000,
            isClosable: true,
          })
          return
        }
      } else if (slotId) {
        meeting = await getMeeting(slotId as string)
        decodedMeeting = await decodeMeeting(meeting, currentAccount!)
      } else {
        return
      }

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
          decodedMeeting ?? undefined,
          Intl.DateTimeFormat().resolvedOptions().timeZone,
          afterClose
        )
      }
    } catch (e) {
      toast({
        title: 'Error loading meeting',
        status: 'error',
        description: 'Unable to load meeting details. Please try again.',
        duration: 5000,
        isClosable: true,
      })
    }
  }
  useEffect(() => {
    if (!slotId && !conferenceId) return
    if (!intent) return
    fillMeeting()
  }, [slotId, conferenceId, intent])

  return (
    <ActionsContext.Provider value={context}>
      <Flex direction={'column'} maxWidth="100%">
        <HStack justifyContent="center" alignItems="flex-start" mb={4}>
          <Heading flex={1} fontSize="2xl">
            My Meetings
            <Text fontSize="sm" fontWeight={100} mt={1}>
              Timezone: {timezone}
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
    </ActionsContext.Provider>
  )
}

export default Meetings
