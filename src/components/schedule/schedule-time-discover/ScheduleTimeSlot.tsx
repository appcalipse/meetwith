import {
  Box,
  Button,
  HStack,
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { formatWithOrdinal, getMeetingBoundaries } from '@utils/date_helper'
import { DateTime, Interval } from 'luxon'
import React, { FC } from 'react'

import { getBgColor, State } from './SchedulePickTime'

export interface ScheduleTimeSlotProps {
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
}

const ScheduleTimeSlot: FC<ScheduleTimeSlotProps> = ({
  slotData,
  pickedTime,
  handleTimePick: pickTime,
  timezone,
  duration,
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

  const { isTopElement, isBottomElement } = getMeetingBoundaries(slot, duration)
  return (
    <Tooltip.Root key={slot.start.toISOTime()}>
      <Tooltip.Trigger asChild>
        <Button
          bg={getBgColor(state)}
          w="100%"
          h={`${(duration >= 45 ? 12 : 12 / (60 / (duration || 30))) * 4}px`}
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
      <Tooltip.Content style={{ zIndex: 10 }} side="right">
        <Box
          p={2}
          bg={itemsBgColor}
          borderRadius={4}
          boxShadow="md"
          py={3}
          px={4}
        >
          <Text mb={'7px'}>
            {formatWithOrdinal(slot)} ({timezone})
          </Text>
          <VStack w="fit-content" gap={1} align={'flex-start'}>
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
        </Box>
        <Tooltip.Arrow />
      </Tooltip.Content>
    </Tooltip.Root>
  )
}
export default React.memo(ScheduleTimeSlot)
