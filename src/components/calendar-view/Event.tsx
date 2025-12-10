import { GridItem, Text, VStack } from '@chakra-ui/layout'
import {
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverTrigger,
  useDisclosure,
} from '@chakra-ui/react'
import { DateTime } from 'luxon'
import * as React from 'react'
import { FaExpand } from 'react-icons/fa6'

import useAccountContext from '@/hooks/useAccountContext'
import {
  AttendeeStatus,
  isCalendarEvent,
  UnifiedEvent,
  WithInterval,
} from '@/types/Calendar'
import { MeetingDecrypted } from '@/types/Meeting'
import { ParticipationStatus } from '@/types/ParticipantInfo'
import {
  generateBorderColor,
  getDesignSystemTextColor,
} from '@/utils/color-utils'

import EventDetailsPopOver from './EventDetailsPopOver'

interface EventProps {
  slot: WithInterval<UnifiedEvent<DateTime> | MeetingDecrypted<DateTime>>
  bg: string
  allSlotsForDay: Array<
    WithInterval<UnifiedEvent<DateTime> | MeetingDecrypted<DateTime>>
  >
  timeSlot: DateTime
}

const Event: React.FC<EventProps> = ({
  slot,
  bg,
  allSlotsForDay,
  timeSlot,
}) => {
  const duration = slot.interval.toDuration('minutes').toObject().minutes || 0
  const { isOpen, onOpen, onClose } = useDisclosure()
  const height = (duration / 60) * 36
  const currentAccount = useAccountContext()
  const top =
    ((slot.start.diff(timeSlot, 'minutes').toObject().minutes || 0) / 60) * 36
  const isStartInsideOtherEvent = React.useMemo(() => {
    return allSlotsForDay.filter(otherEvent => {
      if (otherEvent.id === slot.id) return false
      return slot.start > otherEvent.start && slot.start < otherEvent.end
    })
  }, [allSlotsForDay, slot])
  const margin = isStartInsideOtherEvent.length * 3
  const actor = React.useMemo(() => {
    if (isCalendarEvent(slot)) {
      return slot.attendees?.find(
        attendee => attendee.email === slot.accountEmail
      )
    } else {
      return slot.participants.find(
        participant => participant.account_address === currentAccount?.address
      )
    }
  }, [])
  const isDeclined =
    actor?.status &&
    [ParticipationStatus.Rejected, AttendeeStatus.DECLINED].includes(
      actor?.status
    )
  const isPendingAction =
    actor?.status &&
    [
      ParticipationStatus.Pending,
      AttendeeStatus.TENTATIVE,
      AttendeeStatus.NEEDS_ACTION,
      AttendeeStatus.DELEGATED,
    ].includes(actor?.status)
  const isAccepted =
    actor?.status &&
    [
      ParticipationStatus.Accepted,
      AttendeeStatus.ACCEPTED,
      AttendeeStatus.COMPLETED,
    ].includes(actor?.status)
  return (
    <Popover isOpen={isOpen} onOpen={onOpen} onClose={onClose}>
      <PopoverTrigger>
        <GridItem
          bg={bg}
          borderWidth={1}
          borderLeftWidth={5}
          rounded={'3px'}
          px={1.5}
          borderColor={generateBorderColor(bg)}
          color={getDesignSystemTextColor(bg)}
          w="100%"
          minW={0}
          height={`${Math.max(height, 18)}px`}
          marginTop={margin}
          marginLeft={margin}
          top={top}
          zIndex={2}
          py={0}
          overflowY="hidden"
          _hover={{
            borderWidth: '2px',
            borderLeftWidth: 5,
          }}
        >
          <VStack gap={0}>
            <Text
              w="100%"
              whiteSpace="nowrap"
              overflow="hidden"
              textOverflow="ellipsis"
              fontSize="xs"
            >
              {slot.title}
            </Text>
            <Text fontSize="10px">{slot.interval.toFormat('t')}</Text>
          </VStack>
        </GridItem>
      </PopoverTrigger>
      <PopoverContent zIndex={10} width="600px">
        <PopoverArrow />
        <PopoverCloseButton
          onClick={() => {
            onClose()
          }}
          as={FaExpand}
          size={'24'}
          top={4}
          right={4}
        />

        <PopoverBody>
          <EventDetailsPopOver slot={slot} />
        </PopoverBody>
      </PopoverContent>
    </Popover>
  )
}

export default Event
