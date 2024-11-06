import { Box, Button, VStack } from '@chakra-ui/react'
import {
  add,
  areIntervalsOverlapping,
  Interval,
  isBefore,
  isSameMinute,
  isWithinInterval,
  sub,
} from 'date-fns'
import React, { use, useEffect } from 'react'

import { TimeRange } from '@/types/Account'
import { TimeSlot } from '@/types/Meeting'

export interface ScheduleTimeSlotProps {
  date: Date
  slot: Interval
  busySlots: Array<Array<TimeSlot>>
  availabilities: Array<Record<string, Array<TimeRange>>>
  pickedTime: Date | number | null
  handleTimePick?: (time: Date | number) => void
}
enum State {
  ALL_AVAILABLE,
  MOST_AVAILABLE,
  SOME_AVAILABLE,
  NONE_AVAILABLE,
}
const convertTimeRangesToDate = (timeRanges: TimeRange[], date: Date) => {
  return timeRanges.map(timeRange => {
    return {
      start: new Date(`${date.toDateString()} ${timeRange.start}`),
      end: new Date(`${date.toDateString()} ${timeRange.end}`),
    }
  })
}
export function ScheduleTimeSlot(props: ScheduleTimeSlotProps) {
  const { date, slot, busySlots, availabilities, pickedTime } = props
  const [states, setState] = React.useState<Array<State>>([
    State.NONE_AVAILABLE,
    State.NONE_AVAILABLE,
  ])
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
    for (const interval of Interval) {
      const isIntervalAvailable = []
      for (const availability of availabilities) {
        const userAvailability = []
        const [[account_address, timeRanges]] = Object.entries(availability)
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
        for (const timeRange of timeRangesAsDates) {
          if (!isWithinInterval(interval.start, timeRange)) {
            userAvailability.push(false)
            break
          }
        }
        isIntervalAvailable.push(userAvailability.length === 0)
      }
      isSlotAvailable.push(isIntervalAvailable)
    }
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
          <Button
            key={index}
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
        )
      })}
    </VStack>
  )
}
