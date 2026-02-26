import {
  Box,
  Button,
  Text,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { formatWithOrdinal, getMeetingBoundaries } from '@utils/date_helper'
import { DateTime, Interval } from 'luxon'
import { FC, memo, useState } from 'react'

import { TimeSlot } from '@/types/Meeting'
import { ActiveAvailabilityBlock } from '@/types/schedule'

import { getBgColor, State } from './SchedulePickTime'
import TimeSlotTooltipBody from './TimeSlotTooltipBody'

export interface ScheduleTimeSlotProps {
  slotData: {
    slot: Interval<true>
    state: State
    userStates: Array<{ state: boolean; displayName: string }>
    slotKey: string
    currentUserEvent?: TimeSlot | null
    eventUrl?: string | null
  }
  pickedTime: Date | null
  handleTimePick: (time: Date) => void
  timezone: string
  duration: number
  currentAccountAddress?: string
  displayNameToAddress: Map<string, string>
  activeAvailabilityBlocks?: ActiveAvailabilityBlock[]
}

const ScheduleTimeSlot: FC<ScheduleTimeSlotProps> = ({
  slotData,
  pickedTime,
  handleTimePick: pickTime,
  timezone,
  duration,
  currentAccountAddress,
  displayNameToAddress,
  activeAvailabilityBlocks,
}) => {
  const itemsBgColor = useColorModeValue('white', 'gray.600')
  const { slot, state, userStates } = slotData
  const toast = useToast()
  const handleTimePick = () => {
    if (pickTime) {
      if (slot.start < DateTime.now().setZone(timezone)) {
        toast({
          title: 'Invalid time selection',
          description: 'You cannot select a time in the past.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        })
        return
      }
      pickTime(slot.start.toJSDate())
    }
  }
  const isActive = pickedTime
    ? slot.start.hasSame(DateTime.fromJSDate(pickedTime), 'minute')
    : false

  const slotDurationMinutes = slot.toDuration('minutes').minutes
  const { isTopElement, isBottomElement } = getMeetingBoundaries(
    slot,
    slotDurationMinutes
  )
  const [isTooltipOpen, setIsTooltipOpen] = useState(false)

  const slotHeight =
    (slotDurationMinutes >= 45 ? 12 : 12 / (60 / (slotDurationMinutes || 30))) *
    4

  // Get current user event and URL from slotData
  const currentUserEvent = slotData.currentUserEvent
  const eventUrl = slotData.eventUrl

  return (
    <Tooltip.Root
      data-testid={`schedule-time-slot-${slot.start.toISOTime()}`}
      key={slot.start.toISOTime()}
      onOpenChange={setIsTooltipOpen}
    >
      <Tooltip.Trigger asChild>
        <Button
          bg={getBgColor(state)}
          w="100%"
          h={`${slotHeight}px`}
          m={0}
          mb={isBottomElement ? '1px' : 0}
          mt={isTopElement ? '1px' : 0}
          borderTopRadius={isTopElement ? 4 : 0}
          borderBottomRadius={isBottomElement ? 4 : 0}
          cursor={'pointer'}
          onClick={() => handleTimePick()}
          isActive={isActive}
          borderColor={'gray.700'}
          borderTopWidth={isTopElement ? 1 : 0}
          borderBottomWidth={isBottomElement ? 1 : 0}
          data-state={state}
          _active={{
            cursor: 'pointer',
            color: 'white',
            bgColor: 'primary.400',
            borderColor: 'primary.500',
          }}
          _hover={{
            border: '2px solid #F35826',
          }}
        />
      </Tooltip.Trigger>
      {isTooltipOpen && (
        <Tooltip.Content style={{ zIndex: 10 }} side="right">
          <Box
            p={2}
            bg={itemsBgColor}
            borderRadius={10}
            boxShadow="md"
            py={3}
            px={4}
          >
            <Text mb={'7px'}>
              {formatWithOrdinal(slot)} ({timezone})
            </Text>

            <TimeSlotTooltipBody
              userStates={userStates}
              displayNameToAddress={displayNameToAddress}
              currentAccountAddress={currentAccountAddress}
              currentUserEvent={currentUserEvent}
              eventUrl={eventUrl}
              activeAvailabilityBlocks={activeAvailabilityBlocks}
              slot={slot}
            />
          </Box>
          <Tooltip.Arrow />
        </Tooltip.Content>
      )}
    </Tooltip.Root>
  )
}
export default memo(ScheduleTimeSlot)
