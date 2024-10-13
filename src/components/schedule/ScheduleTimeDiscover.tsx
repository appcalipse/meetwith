import {
  Box,
  Divider,
  Heading,
  HStack,
  Icon,
  IconButton,
  SlideFade,
  Text,
  useMediaQuery,
  VStack,
} from '@chakra-ui/react'
import {
  chakraComponents,
  MultiValue,
  Select,
  SingleValue,
} from 'chakra-react-select'
import * as ct from 'countries-and-timezones'
import {
  addMonths,
  endOfMonth,
  isSameDay,
  startOfMonth,
  subMonths,
} from 'date-fns'
import React, { useContext, useEffect, useState } from 'react'
import { FaChevronDown, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { FaArrowLeft } from 'react-icons/fa6'
import { SelectComponentsGeneric } from 'react-select/dist/declarations/src/components'
import { ActionMeta } from 'react-select/dist/declarations/src/types'

import Loading from '@/components/Loading'
import ScheduleDay from '@/components/schedule/ScheduleDay'
import {
  IGroupParticipant,
  Page,
  ScheduleContext,
} from '@/pages/dashboard/schedule'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import { getSuggestedSlots } from '@/utils/api_helper'
import { handleApiError } from '@/utils/error_helper'

const timezonesObj = ct.getAllTimezones()
const timezonesKeys = Object.keys(timezonesObj) as Array<
  keyof typeof timezonesObj
>
const _timezones = timezonesKeys
  .map(key => {
    return {
      name: `${key} (GMT${timezonesObj[key].dstOffsetStr})`,
      tzCode: key,
      offset: timezonesObj[key].utcOffset,
    }
  })
  .sort((a, b) => a.offset - b.offset)
const timezones = [..._timezones, { tzCode: 'UTC', name: '(UTC+00:00) UTC' }]
const ScheduleTimeDiscover = () => {
  const {
    groupAvailability,
    handlePageSwitch,
    duration,
    pickedTime,
    handleTimePick,
    currentMonth,
    setCurrentMonth,
    timezone,
    setTimezone,
    participants,
  } = useContext(ScheduleContext)

  const [availableSlots, setAvailableSlots] = useState<Array<Interval>>([])
  const [days, setDays] = useState<Date[]>([])
  const [availableDays, setAvailableDays] = useState<Date[]>([])

  const [isLoading, setIsLoading] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [isMobile, isTablet] = useMediaQuery(
    ['(max-width: 800px)', '(max-width: 1024px)'],
    {
      ssr: true,
      fallback: false, // return false on the server, and re-evaluate on the client side
    }
  )
  const SCREEN_ITEM_COUNT = isMobile ? 1 : isTablet ? 2 : 3
  const tzs = timezones.map(tz => {
    return {
      value: String(tz.tzCode),
      label: tz.name,
    }
  })

  const [tz, setTz] = useState<SingleValue<{ label: string; value: string }>>(
    tzs.filter(val => val.value === timezone)[0] || tzs[0]
  )

  const _onChange = (
    newValue:
      | SingleValue<{ label: string; value: string }>
      | MultiValue<{ label: string; value: string }>,
    actionMeta: ActionMeta<any>
  ) => {
    if (Array.isArray(newValue)) {
      return
    }
    const timezone = newValue as SingleValue<{ label: string; value: string }>
    setTz(timezone)
    setTimezone(
      timezone?.value || Intl.DateTimeFormat().resolvedOptions().timeZone
    )
  }
  const customComponents: Partial<SelectComponentsGeneric> = {
    ClearIndicator: props => (
      <chakraComponents.ClearIndicator className="noBg" {...props}>
        <Icon as={FaChevronDown} w={4} h={4} />
      </chakraComponents.ClearIndicator>
    ),
    DropdownIndicator: props => (
      <chakraComponents.DropdownIndicator className="noBg" {...props}>
        <Icon as={FaChevronDown} w={4} h={4} />
      </chakraComponents.DropdownIndicator>
    ),
  }
  const handleClose = () => {
    handlePageSwitch(Page.SCHEDULE)
  }

  async function handleSlotLoad() {
    setIsLoading(true)
    try {
      const monthStart = startOfMonth(currentMonth)
      const monthEnd = endOfMonth(currentMonth)
      const currentParticipant = participants
        .filter(val => {
          const groupData = val as IGroupParticipant
          const isGroup = groupData.isGroup
          return !isGroup
        })
        .filter(val => {
          const groupData = val as ParticipantInfo
          return !!groupData.account_address
        })
        .map(val => {
          const groupData = val as ParticipantInfo
          return groupData.account_address as string
        })
      const accounts = [
        ...new Set([
          ...Object.values(groupAvailability).flat(),
          ...currentParticipant,
        ]),
      ]
      const availableSlots = await getSuggestedSlots(
        accounts,
        monthStart,
        monthEnd,
        duration,
        true
      )

      setAvailableSlots(availableSlots)
      const days: Array<Date> = []
      for (const slot of availableSlots) {
        if (!days.some(day => isSameDay(day, slot.start))) {
          days.push(new Date(slot.start))
        }
      }
      setAvailableDays(days)
      const indexOfCurrentDate = days.findIndex(day =>
        isSameDay(day, new Date())
      )
      const offset = indexOfCurrentDate > 0 ? indexOfCurrentDate : 0
      setDays(
        days.slice(
          direction === 'backward' ? days.length - SCREEN_ITEM_COUNT : offset,
          direction === 'backward' ? days.length : SCREEN_ITEM_COUNT + offset
        )
      )
    } catch (error: any) {
      handleApiError('Error merging availabilities', error)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    handleSlotLoad()
  }, [groupAvailability, currentMonth])

  const getDayAvailableSlots = (day: Date) => {
    return availableSlots.filter(slot => isSameDay(slot.start, day))
  }
  const handleScheduledTimeNext = () => {
    const indexOfDay = availableDays.findIndex(day =>
      isSameDay(day, days.at(-1)!)
    )
    if (indexOfDay === -1 || indexOfDay === availableDays.length - 1) {
      const newMonth = addMonths(currentMonth, 1)
      setCurrentMonth(newMonth)
    }
    setDays(
      availableDays.slice(indexOfDay + 1, indexOfDay + 1 + SCREEN_ITEM_COUNT)
    )
    setDirection('forward')
  }
  const handleScheduledTimeBack = () => {
    const indexOfDay = availableDays.findIndex(day => isSameDay(day, days[0]))
    if (indexOfDay === 0) {
      const newMonth = subMonths(currentMonth, 1)
      setCurrentMonth(newMonth)
    }
    setDays(
      availableDays.slice(
        indexOfDay - SCREEN_ITEM_COUNT < 0 ? 0 : indexOfDay - SCREEN_ITEM_COUNT,
        indexOfDay
      )
    )
    setDirection('backward')
  }
  return (
    <VStack
      width="fit-content"
      minW={{
        md: '800px',
        sm: 'auto',
      }}
      m="auto"
      alignItems="stretch"
      gap={3}
    >
      <HStack mb={0} cursor="pointer" onClick={handleClose}>
        <Icon as={FaArrowLeft} size="1.5em" color={'primary.500'} />
        <Heading size="md" color="primary.500">
          Back
        </Heading>
      </HStack>
      <VStack gap={10} w="100%">
        <VStack gap={2}>
          <Heading fontSize="16px">Show times in</Heading>
          <Select
            value={tz}
            colorScheme="primary"
            onChange={_onChange}
            className="noLeftBorder timezone-select"
            options={tzs}
            components={customComponents}
          />
        </VStack>
        <VStack gap={6} w="100%">
          <Box maxW="350px" textAlign="center">
            <Heading fontSize="16px">Available times</Heading>
            <Text fontSize="12px">
              All time slots shown below are the available times between you and
              the required participants.
            </Text>
          </Box>
          <Divider />
          {isLoading ? (
            <Loading />
          ) : availableSlots.length === 0 ? (
            <p>No available time for everyone</p>
          ) : (
            <HStack w="100%" justifyContent="space-between" alignItems="start">
              <IconButton
                aria-label={'left-icon'}
                icon={<FaChevronLeft />}
                onClick={handleScheduledTimeBack}
              />
              {days.map(day => (
                <SlideFade
                  in={true}
                  key={day.toString()}
                  transition={{ exit: { delay: 0 }, enter: { duration: 1 } }}
                >
                  <ScheduleDay
                    day={day}
                    schedule={getDayAvailableSlots(day)}
                    pickedTime={pickedTime}
                    pickTime={time => {
                      handleTimePick(time)
                      handlePageSwitch(Page.SCHEDULE_DETAILS)
                    }}
                    duration={duration}
                  />
                </SlideFade>
              ))}
              <IconButton
                aria-label={'left-icon'}
                icon={<FaChevronRight />}
                onClick={handleScheduledTimeNext}
              />
            </HStack>
          )}
        </VStack>
      </VStack>
    </VStack>
  )
}

export default ScheduleTimeDiscover
