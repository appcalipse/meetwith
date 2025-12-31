import { Heading, HStack, Icon, useMediaQuery, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { FC, useCallback, useState } from 'react'
import { FaArrowLeft } from 'react-icons/fa6'

import {
  Page,
  useScheduleNavigation,
} from '@/providers/schedule/NavigationContext'
import { EditMode } from '@/types/Dashboard'
import { ParticipantInfo } from '@/types/ParticipantInfo'

import { Grid4 } from '../icons/Grid4'
import MobileScheduleParticipantModal from './schedule-time-discover/MobileScheduleParticipant'
import { ScheduleParticipants } from './schedule-time-discover/ScheduleParticipants'
import { SchedulePickTime } from './schedule-time-discover/SchedulePickTime'

export type MeetingMembers = ParticipantInfo & { isCalendarConnected?: boolean }
interface ScheduleTimeDiscoverProps {
  onClose?: () => void
}
const ScheduleTimeDiscover: FC<ScheduleTimeDiscoverProps> = ({ onClose }) => {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const { handlePageSwitch } = useScheduleNavigation()
  const [isLargeScreen] = useMediaQuery('(min-width: 992px)', {
    ssr: true,
    fallback: true,
  })
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose()
    } else {
      if (router.query.intent) {
        handlePageSwitch(Page.SCHEDULE_DETAILS)
      } else {
        let url = `/dashboard/${EditMode.MEETINGS}`
        if (router.query.ref === 'group') {
          url = `/dashboard/${EditMode.GROUPS}`
        }
        router.push(url)
      }
    }
  }, [onClose, router.query])
  const handleOpenParticipantModal = useCallback(() => setIsOpen(true), [])
  return (
    <VStack
      width="100%"
      m="auto"
      alignItems="stretch"
      gap={3}
      p={{ base: 4, md: 0 }}
    >
      <HStack justifyContent={'space-between'}>
        <HStack mb={0} cursor="pointer" onClick={handleClose}>
          <Icon as={FaArrowLeft} size="1.5em" color={'primary.500'} />
          <Heading fontSize={16} color="primary.500">
            Back
          </Heading>
        </HStack>
        {!isLargeScreen && (
          <Grid4
            w={8}
            h={8}
            onClick={() => setIsOpen(!isOpen)}
            cursor={'pointer'}
          />
        )}
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
        <ScheduleParticipants />
        <SchedulePickTime
          openParticipantModal={handleOpenParticipantModal}
          onClose={onClose}
        />
      </HStack>
    </VStack>
  )
}

export default ScheduleTimeDiscover
