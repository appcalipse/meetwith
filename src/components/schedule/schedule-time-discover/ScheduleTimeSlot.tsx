import {
  Box,
  Button,
  HStack,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import * as Tooltip from '@radix-ui/react-tooltip'
import {
  add,
  format,
  Interval,
  isBefore,
  isSameMinute,
  isWithinInterval,
} from 'date-fns'
import React, { useEffect } from 'react'

import { CustomTimeRange } from '@/types/common'
import { TimeSlot } from '@/types/Meeting'
import { convertTimeRangesToDate } from '@/utils/date_helper'

import { MeetingMembers } from '../ScheduleTimeDiscover'

export interface ScheduleTimeSlotProps {
  date: Date
  slot: Interval
  busySlots: Array<Array<TimeSlot>>
  availabilities: Array<Record<string, Array<CustomTimeRange>>>
  pickedTime: Date | number | null
  handleTimePick?: (time: Date | number) => void
  meetingMembers: MeetingMembers[]
}
enum State {
  ALL_AVAILABLE,
  MOST_AVAILABLE,
  SOME_AVAILABLE,
  NONE_AVAILABLE,
}

type UserState = {
  state: boolean
  displayName?: string
}
export function ScheduleTimeSlot(props: ScheduleTimeSlotProps) {
  const { date, slot, busySlots, availabilities, pickedTime } = props
  const itemsBgColor = useColorModeValue('white', 'gray.600')
  const [states, setState] = React.useState<Array<State>>([
    State.NONE_AVAILABLE,
    State.NONE_AVAILABLE,
  ])
  const [userStates, setUserStates] = React.useState<Array<Array<UserState>>>(
    []
  )
  useEffect(() => {
    if (!date || !slot || !busySlots || !availabilities) return

    const Interval = [
      {
        start: slot.start,
        end: add(slot.start, { minutes: 30 }),
      },
      {
        start: add(slot.start, { minutes: 30 }),
        end: slot.end,
      },
    ]
    const isSlotAvailable = []
    const states = []
    for (const interval of Interval) {
      const isIntervalAvailable = []
      const userStates = []
      for (const availability of availabilities) {
        const userAvailability = []
        const [[account_address, timeRanges]] = Object.entries(availability)
        const user = props.meetingMembers.find(
          member => member.account_address === account_address
        )
        const userBusySlots = busySlots
          .map(busySlot =>
            busySlot.filter(
              busySlot => busySlot.account_address === account_address
            )
          )
          .flat()

        for (const busySlot of userBusySlots) {
          if (isWithinInterval(interval.start, busySlot)) {
            userAvailability.push(false)
            break
          }
        }
        if (isBefore(interval.start, new Date())) {
          userAvailability.push(false)
        }

        const timeRangesAsDates = convertTimeRangesToDate(timeRanges, date)

        if (timeRangesAsDates.length === 0) {
          userAvailability.push(false)
        }
        const isInRange = []
        for (const timeRange of timeRangesAsDates) {
          if (!isWithinInterval(interval.start, timeRange)) {
            isInRange.push(false)
          } else {
            isInRange.push(true)
          }
        }
        if (isInRange.every(val => val === false)) {
          userAvailability.push(false)
        }
        isIntervalAvailable.push(userAvailability.length === 0)
        if (user) {
          userStates.push({
            state: userAvailability.length === 0,
            displayName: user.name,
          })
        }
      }
      isSlotAvailable.push(isIntervalAvailable)
      states.push(userStates)
    }
    setUserStates(states)
    const newStates = []
    for (const isAvailable of isSlotAvailable) {
      const numberOfAvailable = isAvailable.filter(val => val).length
      if (numberOfAvailable === 0) {
        newStates.push(State.NONE_AVAILABLE)
      } else if (numberOfAvailable === isAvailable.length) {
        newStates.push(State.ALL_AVAILABLE)
      } else if (numberOfAvailable >= isAvailable.length / 2) {
        newStates.push(State.MOST_AVAILABLE)
      } else {
        newStates.push(State.SOME_AVAILABLE)
      }
    }
    setState(newStates)
  }, [date, slot, busySlots, availabilities])
  const getBgColor = (state: State) => {
    switch (state) {
      case State.ALL_AVAILABLE:
        return 'green.400'
      case State.MOST_AVAILABLE:
        return 'green.300'
      case State.SOME_AVAILABLE:
        return 'green.200'
      case State.NONE_AVAILABLE:
        return 'neutral.0'
    }
  }
  const handleTimePick = (index: number) => {
    if (props.handleTimePick) {
      const time = index === 0 ? slot.start : add(slot.start, { minutes: 30 })
      if (isBefore(time, new Date())) return
      props.handleTimePick(time)
    }
  }
  const isSecondActive = pickedTime
    ? isSameMinute(pickedTime, add(slot.start, { minutes: 30 }))
    : false
  return (
    <VStack
      w="100%"
      gap={0}
      bg={isSecondActive ? 'primary.500' : getBgColor(states[1])}
      borderRadius={4}
    >
      {states.map((state, index) => {
        const isActive = pickedTime
          ? isSameMinute(
              pickedTime,
              index === 0 ? slot.start : add(slot.start, { minutes: 30 })
            )
          : false
        return (
          <Tooltip.Root key={index}>
            <Tooltip.Trigger asChild>
              <Button
                bg={getBgColor(state)}
                w="100%"
                h={6}
                m={0}
                borderTopRadius={index === 0 ? 4 : 0}
                borderBottomRadius={4}
                cursor={'pointer'}
                onClick={() => handleTimePick(index)}
                isActive={isActive}
                borderColor={'gray.700'}
                borderTopWidth={index === 0 ? 1 : 0}
                borderBottomWidth={index === 0 ? 0 : 1}
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
                  {format(
                    index === 0 ? slot.start : add(slot.start, { minutes: 30 }),
                    'E, do MMMM - h:mm a'
                  )}
                </Text>
                <VStack w="fit-content" gap={1} align={'flex-start'}>
                  {userStates?.[index]?.map((userState, index) => (
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
      })}
    </VStack>
  )
}
