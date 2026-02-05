import {
  Box,
  Button,
  HStack,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { formatWithOrdinal, getMeetingBoundaries } from '@utils/date_helper'
import { DateTime, Interval } from 'luxon'
import React, { FC, useMemo } from 'react'

import { SelectedTimeSlot, useAvailabilityTracker } from './AvailabilityTracker'
import { getBgColor, State } from './SchedulePickTime'

export interface QuickPollTimeSlotProps {
  slotData: {
    slot: Interval<true>
    state: State
    userStates: Array<{ state: boolean; displayName: string }>
    slotKey: string
  }
  pickedTime: Date | null
  handleTimePick: (time: Date) => void
  timezone: string
  duration: number
  isQuickPoll?: boolean
  isEditingAvailability?: boolean
  isSchedulingIntent?: boolean
}

const QuickPollTimeSlot: FC<QuickPollTimeSlotProps> = ({
  slotData,
  pickedTime,
  handleTimePick: pickTime,
  timezone,
  duration,
  isQuickPoll = false,
  isEditingAvailability = false,
  isSchedulingIntent = false,
}) => {
  const itemsBgColor = useColorModeValue('white', 'gray.600')
  const { slot, state, userStates } = slotData
  const { addSlot, removeSlot, isSlotSelected } = useAvailabilityTracker()

  const selectedTimeSlot: SelectedTimeSlot = useMemo(
    () => ({
      start: slot.start,
      end: slot.end,
      date: slot.start.toFormat('yyyy-MM-dd'),
    }),
    [slot]
  )

  const isSelected = isSlotSelected(selectedTimeSlot)

  const handleSlotClick = () => {
    if (isQuickPoll) {
      if (isSchedulingIntent) {
        if (pickTime) {
          if (slot.start < DateTime.now().setZone(timezone)) {
            return
          }
          pickTime(slot.start.toJSDate())
        }
      } else if (isEditingAvailability) {
        if (isSelected) {
          removeSlot(selectedTimeSlot)
        } else {
          addSlot(selectedTimeSlot)
        }
      } else {
      }
    } else {
      if (pickTime) {
        if (slot.start < DateTime.now().setZone(timezone)) {
          return
        }
        pickTime(slot.start.toJSDate())
      }
    }
  }

  const isActive = isQuickPoll
    ? isSelected
    : pickedTime
    ? slot.start.hasSame(DateTime.fromJSDate(pickedTime), 'minute')
    : false

  const { isTopElement, isBottomElement } = getMeetingBoundaries(slot, duration)

  // Custom styling for selected availability slots
  const getButtonProps = () => {
    const isInteractive = !isQuickPoll || isEditingAvailability

    if (isQuickPoll && isEditingAvailability && isSelected) {
      return {
        bg: 'primary.400',
        color: 'white',
        borderColor: 'primary.500',
        cursor: isInteractive ? 'pointer' : 'default',
        _hover: isInteractive
          ? {
              bg: 'primary.500',
              border: '2px solid #F35826',
            }
          : {},
        _active: isInteractive
          ? {
              bg: 'primary.600',
            }
          : {},
      }
    }

    if (isQuickPoll && isEditingAvailability && !isSelected) {
      return {
        bg: 'white',
        color: 'text-primary',
        cursor: isInteractive ? 'pointer' : 'default',
        _active: isInteractive
          ? {
              cursor: 'pointer',
              color: 'white',
              bgColor: 'primary.400',
              borderColor: 'primary.500',
            }
          : {},
        _hover: isInteractive
          ? {
              border: '2px solid #F35826',
            }
          : {},
      }
    }

    return {
      bg: getBgColor(state),
      cursor: isInteractive ? 'pointer' : 'default',
      _active: isInteractive
        ? {
            cursor: 'pointer',
            color: 'white',
            bgColor: 'primary.400',
            borderColor: 'primary.500',
          }
        : {},
      _hover: isInteractive
        ? {
            border: '2px solid #F35826',
          }
        : {},
    }
  }

  return (
    <Tooltip.Root key={slot.start.toISOTime()}>
      <Tooltip.Trigger asChild>
        <Button
          {...getButtonProps()}
          w="100%"
          h={`${(duration >= 45 ? 12 : 12 / (60 / (duration || 30))) * 4}px`}
          m={0}
          mb={isBottomElement ? '1px' : 0}
          mt={isTopElement ? '1px' : 0}
          borderTopRadius={isTopElement ? 4 : 0}
          borderBottomRadius={isBottomElement ? 4 : 0}
          cursor="pointer"
          onClick={handleSlotClick}
          isActive={isActive}
          borderColor="gray.700"
          borderTopWidth={isTopElement ? 1 : 0}
          borderBottomWidth={isBottomElement ? 1 : 0}
          data-state={state}
          data-selected={isQuickPoll ? isSelected : undefined}
        />
      </Tooltip.Trigger>
      <Tooltip.Content style={{ zIndex: 10 }} side="right">
        <Box
          p={2}
          bg={itemsBgColor}
          borderRadius={4}
          boxShadow="md"
          py={3}
          px={4}
        >
          {isEditingAvailability && (
            <Text mb="7px">
              {isSelected
                ? 'Click to make unavailable'
                : 'Click to make available'}
            </Text>
          )}
          <Text mb="7px">
            {formatWithOrdinal(slot)} ({timezone})
          </Text>
          {!isEditingAvailability && (
            <VStack w="fit-content" gap={1} align="flex-start">
              {userStates?.map((userState, index) => (
                <HStack key={index}>
                  <Box
                    w={4}
                    h={4}
                    rounded={999}
                    bg={userState.state ? 'green.400' : 'neutral.0'}
                  />
                  <Text>{userState.displayName}</Text>
                </HStack>
              ))}
            </VStack>
          )}
        </Box>
        <Tooltip.Arrow />
      </Tooltip.Content>
    </Tooltip.Root>
  )
}

export default React.memo(QuickPollTimeSlot)
