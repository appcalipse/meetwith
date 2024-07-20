import {
  Box,
  Divider,
  Fade,
  Heading,
  HStack,
  Icon,
  IconButton,
  Slide,
  SlideFade,
  Text,
  useMediaQuery,
  useToast,
  VStack,
} from '@chakra-ui/react'
import {
  chakraComponents,
  MultiValue,
  Select,
  SingleValue,
} from 'chakra-react-select'
import ct from 'countries-and-timezones'
import {
  addDays,
  addMinutes,
  addMonths,
  areIntervalsOverlapping,
  endOfMonth,
  isBefore,
  isSameDay,
  isSameMonth,
  setHours,
  setMinutes,
  setSeconds,
  startOfMonth,
  subDays,
  subMonths,
  subSeconds,
} from 'date-fns'
import React, { useContext, useEffect, useState } from 'react'
import { FaChevronDown, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { FaArrowLeft } from 'react-icons/fa6'
import { SelectComponentsGeneric } from 'react-select/dist/declarations/src/components'
import { ActionMeta } from 'react-select/dist/declarations/src/types'

import Loading from '@/components/Loading'
import ScheduleDay from '@/components/scheduling/ScheduleDay'
import {
  IGroupParticipant,
  Page,
  ScheduleContext,
} from '@/pages/dashboard/schedule'
import { ConditionRelation } from '@/types/common'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import { fetchBusySlotsForMultipleAccounts } from '@/utils/api_helper'
import { isJson } from '@/utils/generic_utils'

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
    currentSelectedDate,
    setCurrentSelectedDate,
    timezone,
    setTimezone,
    participants,
  } = useContext(ScheduleContext)

  const [busySlots, setBusySlots] = useState<Array<Interval>>([])
  const [availableSlots, setAvailableSlots] = useState<Array<Interval>>([])
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToast()
  const [isMobile, isTablet] = useMediaQuery(
    ['(max-width: 800px)', '(max-width: 1024px)'],
    {
      ssr: true,
      fallback: false, // return false on the server, and re-evaluate on the client side
    }
  )
  const tzs = timezones.map(tz => {
    return {
      value: tz.tzCode,
      label: tz.name,
    }
  })

  const [tz, setTz] = useState<SingleValue<{ label: string; value: string }>>(
    tzs.filter(val => val.value === timezone)[0] || tzs[0]
  )
  const startDate = setSeconds(
    setMinutes(setHours(addDays(currentSelectedDate, 0), 0), 0),
    0
  )
  const endDate = setSeconds(
    setMinutes(
      setHours(
        addDays(currentSelectedDate, isMobile ? 0 : isTablet ? 1 : 2),
        24
      ),
      59
    ),
    59
  )
  const days = Array.from(
    { length: isMobile ? 1 : isTablet ? 2 : 3 },
    (v, k) => k
  )
    .map(k => addDays(currentSelectedDate, k))
    .filter(val => isSameMonth(val, currentMonth))
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
      const busySlots = await fetchBusySlotsForMultipleAccounts(
        accounts,
        monthStart,
        monthEnd,
        ConditionRelation.AND
      )
      setBusySlots(busySlots)
    } catch (error: any) {
      const isJsonErr = isJson(error.message)
      const errorMessage = isJsonErr
        ? JSON.parse(error.message)?.error || JSON.parse(error.message)?.name
        : error.message
      toast({
        title: 'Error merging availabilities',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
      })
    }
    setIsLoading(false)
  }

  const handleAvailableSlots = async (
    busySlots: Array<Interval>,
    start?: Date,
    end?: Date
  ) => {
    const availableSlots = []
    let _start = start || startDate
    let _end = subSeconds(addMinutes(_start, duration), 1)
    while (isBefore(_end, end || endDate)) {
      const isNotAvailable =
        busySlots.filter(slot => {
          const isDaySame =
            isSameDay(_start, slot.start) && isSameDay(slot.end, _end)
          if (!isDaySame) {
            return false
          }
          const isBusySlot = areIntervalsOverlapping(
            slot,
            {
              start: _start,
              end: _end,
            },
            { inclusive: true }
          )
          return isBusySlot
        }).length === 0
      if (isNotAvailable) {
        availableSlots.push({ start: _start, end: _end })
      }
      _start = addMinutes(_start, duration)
      _end = subSeconds(addMinutes(_start, duration), 1)
    }
    setAvailableSlots(availableSlots)
  }
  useEffect(() => {
    handleSlotLoad()
  }, [groupAvailability, currentMonth])
  useEffect(() => {
    handleAvailableSlots(busySlots)
  }, [busySlots, isMobile, isTablet])
  const getDayAvailableSlots = (day: Date) => {
    return availableSlots.filter(slot => isSameDay(slot.start, day))
  }
  const handleScheduledTimeNext = () => {
    let newDate = addDays(currentSelectedDate, isMobile ? 1 : isTablet ? 2 : 3)
    const isMonthSame = isSameMonth(newDate, currentMonth)
    if (!isMonthSame) {
      const newMonth = addMonths(currentMonth, 1)
      setCurrentMonth(newMonth)
      newDate = startOfMonth(newMonth)
    }
    const startDate = setSeconds(
      setMinutes(setHours(addDays(newDate, 0), 0), 0),
      0
    )
    const endDate = setSeconds(
      setMinutes(
        setHours(addDays(newDate, isMobile ? 0 : isTablet ? 1 : 2), 24),
        59
      ),
      59
    )
    handleAvailableSlots(busySlots, startDate, endDate)
    setCurrentSelectedDate(newDate)
  }
  const handleScheduledTimeBack = () => {
    const newDate = subDays(
      currentSelectedDate,
      isMobile ? 1 : isTablet ? 2 : 3
    )
    const isMonthSame = isSameMonth(newDate, currentMonth)
    if (!isMonthSame) {
      const newMonth = subMonths(currentMonth, 1)
      setCurrentMonth(newMonth)
    }
    const startDate = setSeconds(
      setMinutes(setHours(addDays(newDate, 0), 0), 0),
      0
    )
    const endDate = setSeconds(
      setMinutes(
        setHours(addDays(newDate, isMobile ? 0 : isTablet ? 1 : 2), 24),
        59
      ),
      59
    )
    handleAvailableSlots(busySlots, startDate, endDate)
    setCurrentSelectedDate(newDate)
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
