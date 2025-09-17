import { Heading, HStack, Icon, useToast, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { useMemo, useState } from 'react'
import { FaArrowLeft } from 'react-icons/fa6'

import { EditMode } from '@/types/Dashboard'
import { ParticipantInfo } from '@/types/ParticipantInfo'

import { Grid4 } from '../icons/Grid4'
import MobileScheduleParticipantModal from './schedule-time-discover/MobileScheduleParticipant'
import { ScheduleParticipants } from './schedule-time-discover/ScheduleParticipants'
import { SchedulePickTime } from './schedule-time-discover/SchedulePickTime'

export type MeetingMembers = ParticipantInfo & { isCalendarConnected?: boolean }

interface ScheduleTimeDiscoverProps {
  // Optional props for quickpoll mode
  isQuickPoll?: boolean
  pollId?: string
}

const ScheduleTimeDiscover = ({
  isQuickPoll: propIsQuickPoll,
  pollId,
}: ScheduleTimeDiscoverProps = {}) => {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const toast = useToast()

  // Detect quickpoll mode from props or router query
  const isQuickPoll = useMemo(() => {
    return (
      propIsQuickPoll ||
      router.query.ref === 'quickpoll' ||
      !!router.query.pollId
    )
  }, [propIsQuickPoll, router.query.ref, router.query.pollId])

  // Get poll info from props or router query
  const currentPollId = pollId || (router.query.pollId as string)
  // TODO: Fetch poll title from backend using pollId
  const currentPollTitle = 'Poll' // This will be fetched from backend later

  const handleClose = () => {
    if (isQuickPoll || router.query.ref === 'quickpoll') {
      // For quickpoll, go back to quickpoll dashboard
      router.push(`/dashboard/${EditMode.QUICKPOLL}`)
    } else {
      // Original group scheduling logic
      let url = `/dashboard/${EditMode.MEETINGS}`
      if (router.query.ref === 'group') {
        url = `/dashboard/${EditMode.GROUPS}`
      }
      router.push(url)
    }
  }

  const handleSaveAvailability = () => {
    // TODO: Implement save availability logic for quickpoll
    toast({
      title: 'Availability Saved',
      description: 'Your availability has been saved successfully.',
      status: 'success',
      duration: 3000,
      isClosable: true,
      position: 'top',
    })
    // This will be connected to backend API later
  }

  const handleSharePoll = () => {
    // TODO: Implement share poll logic - fetch slug from backend using pollId
    // For now, using pollId as placeholder until we implement the API call to get the slug
    const pollSlug = currentPollId // This should be replaced with actual slug from API
    const pollUrl = `${window.location.origin}/poll/${pollSlug}`
    navigator.clipboard.writeText(pollUrl)
    toast({
      title: 'Link Copied!',
      description: 'Poll link has been copied to clipboard.',
      status: 'success',
      duration: 3000,
      isClosable: true,
      position: 'top',
    })
  }

  return (
    <VStack
      width="100%"
      m="auto"
      alignItems="stretch"
      gap={3}
      p={{ base: 4, md: 0 }}
    >
      {/* Header with dynamic title for quickpoll */}
      {isQuickPoll && (
        <VStack align="flex-start" spacing={1} mb={2}>
          <Heading fontSize="24px" fontWeight="700" color="neutral.0">
            Add/Edit Availability
          </Heading>
          <Heading fontSize="16px" fontWeight="500" color="neutral.400">
            {currentPollTitle}
          </Heading>
        </VStack>
      )}

      <HStack justifyContent={'space-between'}>
        <HStack mb={0} cursor="pointer" onClick={handleClose}>
          <Icon as={FaArrowLeft} size="1.5em" color={'primary.500'} />
          <Heading fontSize={16} color="primary.500">
            Back
          </Heading>
        </HStack>

        <Grid4
          w={8}
          h={8}
          onClick={() => setIsOpen(!isOpen)}
          cursor={'pointer'}
          display={{ base: 'block', lg: 'none' }}
        />
      </HStack>

      <HStack
        width="100%"
        justifyContent={'flex-start'}
        align={'flex-start'}
        height={'fit-content'}
        gap={'14px'}
      >
        <MobileScheduleParticipantModal
          onClose={() => setIsOpen(false)}
          isOpen={isOpen}
        />
        <ScheduleParticipants isQuickPoll={isQuickPoll} />
        <SchedulePickTime
          openParticipantModal={() => setIsOpen(true)}
          isQuickPoll={isQuickPoll}
          onSaveAvailability={isQuickPoll ? handleSaveAvailability : undefined}
          onSharePoll={isQuickPoll ? handleSharePoll : undefined}
        />
      </HStack>
    </VStack>
  )
}

export default ScheduleTimeDiscover
