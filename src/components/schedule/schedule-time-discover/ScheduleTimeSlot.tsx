import {
  Box,
  Button,
  HStack,
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { Account } from '@meta/Account'
import * as Tooltip from '@radix-ui/react-tooltip'
import { formatWithOrdinal, getMeetingBoundaries } from '@utils/date_helper'
import { getAccountDisplayName } from '@utils/user_manager'
import { DateTime, Interval } from 'luxon'
import React, { useEffect, useMemo } from 'react'

import { getBgColor, State } from './SchedulePickTime'

export interface ScheduleTimeSlotProps {
  slot: Interval<true>
  busySlots: Map<string, Interval<true>[]>
  availableSlots: Map<string, Interval<true>[]>
  pickedTime: Date | null
  handleTimePick?: (time: Date) => void
  meetingMembers: Account[]
  timezone: string
  duration: number
}

type UserState = {
  state: boolean
  displayName?: string
}

const ScheduleTimeSlot = (props: ScheduleTimeSlotProps) => {
  const {
    slot,
    busySlots,
    availableSlots,
    meetingMembers,
    timezone,
    pickedTime,
    duration,
  } = props
  const itemsBgColor = useColorModeValue('white', 'gray.600')
  const [state, setState] = React.useState<State>(State.NONE_AVAILABLE)
  const [userState, setUserState] = React.useState<Array<UserState>>([])
  const toast = useToast()
  const slotKey = useMemo(() => {
    return `${slot.start.toMillis()}-${slot.end.toMillis()}-${duration}-${timezone}-${
      availableSlots.size
    }-${busySlots.size}`
  }, [slot, duration, timezone, availableSlots.size, busySlots.size])

  useEffect(() => {
    const isSlotAvailable = []
    const userStates: Array<UserState> = []
    const accounts = Array.from(availableSlots.keys())
    for (const account of accounts) {
      const slots = availableSlots.get(account) || []
      const busySlotsForAccount = busySlots.get(account) || []
      const userAccount = meetingMembers.find(
        member => member.address === account
      )
      let isUserAvailable = true

      for (const busySlots of busySlotsForAccount) {
        if (busySlots.overlaps(slot)) {
          isUserAvailable = false
          break
        }
      }
      if (slot.start < DateTime.now().setZone(timezone)) {
        isUserAvailable = false
      }
      const hasOverlap = slots.some(availableSlot =>
        availableSlot.overlaps(slot)
      )
      if (!hasOverlap) {
        isUserAvailable = false
      }
      isSlotAvailable.push(isUserAvailable)
      userStates.push({
        state: isUserAvailable,
        displayName: userAccount ? getAccountDisplayName(userAccount) : '',
      })
    }
    setUserState(userStates)
    let newStates
    const numberOfAvailable = isSlotAvailable.filter(val => val).length
    if (numberOfAvailable === 0) {
      newStates = State.NONE_AVAILABLE
    } else if (numberOfAvailable === isSlotAvailable.length) {
      newStates = State.ALL_AVAILABLE
    } else if (numberOfAvailable >= isSlotAvailable.length / 2) {
      newStates = State.MOST_AVAILABLE
    } else {
      newStates = State.SOME_AVAILABLE
    }

    setState(newStates)
  }, [busySlots, availableSlots, meetingMembers, slotKey])
  const handleTimePick = () => {
    if (props.handleTimePick) {
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
      props.handleTimePick(slot.start.toJSDate())
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
      <Tooltip.Content style={{ zIndex: 10 }}>
        <Box
          p={2}
          bg={itemsBgColor}
          borderRadius={4}
          boxShadow="md"
          py={3}
          px={4}
        >
          <Text mb={'7px'}>
            {formatWithOrdinal(slot)} ({props.timezone})
          </Text>
          <VStack w="fit-content" gap={1} align={'flex-start'}>
            {userState?.map((userState, index) => (
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
export default ScheduleTimeSlot
