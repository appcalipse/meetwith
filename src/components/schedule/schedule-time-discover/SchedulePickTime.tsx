/* eslint-disable tailwindcss/no-custom-classname */
import {
  Box,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  HStack,
  IconButton,
  Select as ChakraSelect,
  SlideFade,
  Text,
  VStack,
} from '@chakra-ui/react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Select, SingleValue } from 'chakra-react-select'
import { addDays, isSameMonth } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { DateTime, Interval } from 'luxon'
import { useContext, useEffect, useMemo, useState } from 'react'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'

import Loading from '@/components/Loading'
import InfoTooltip from '@/components/profile/components/Tooltip'
import { Page, ScheduleContext } from '@/pages/dashboard/schedule'
import { fetchBusySlotsRawForMultipleAccounts } from '@/utils/api_helper'
import { durationToHumanReadable } from '@/utils/calendar_manager'
import { DEFAULT_GROUP_SCHEDULING_DURATION } from '@/utils/constants/schedule'
import { customSelectComponents } from '@/utils/constants/select'
import { parseMonthAvailabilitiesToDate, timezones } from '@/utils/date_helper'
import { handleApiError } from '@/utils/error_helper'

import ScheduleTimeSlot from './ScheduleTimeSlot'

export enum State {
  ALL_AVAILABLE,
  MOST_AVAILABLE,
  SOME_AVAILABLE,
  NONE_AVAILABLE,
}

export const getBgColor = (state: State) => {
  switch (state) {
    case State.ALL_AVAILABLE:
      return 'green.400'
    case State.MOST_AVAILABLE:
      return 'yellow.600'
    case State.SOME_AVAILABLE:
      return 'yellow.100'
    case State.NONE_AVAILABLE:
      return 'neutral.0'
  }
}
const GUIDES = [
  {
    color: getBgColor(State.ALL_AVAILABLE),
    description: 'Everyone is available',
  },
  {
    color: getBgColor(State.SOME_AVAILABLE),
    description: 'Some are available',
  },
  {
    color: getBgColor(State.MOST_AVAILABLE),
    description: 'Most are available',
  },
  {
    color: getBgColor(State.NONE_AVAILABLE),
    description: 'No one is available',
  },
]

type Dates = {
  date: Date
  slots: Array<Interval<true>>
}

export function SchedulePickTime() {
  const {
    groupAvailability,
    timezone,
    setTimezone,
    currentSelectedDate,
    handleTimePick,
    setCurrentSelectedDate,
    handlePageSwitch,
    pickedTime,
    duration,
    handleDurationChange,
    meetingMembers,
    canEditMeetingDetails,
    isScheduling,
  } = useContext(ScheduleContext)

  const [isLoading, setIsLoading] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<
    Map<string, Interval<true>[]>
  >(new Map())
  const [busySlots, setBusySlots] = useState<Map<string, Interval<true>[]>>(
    new Map()
  )
  const getEmptySlots = (
    time: Date,
    scheduleDuration = duration
  ): Array<Interval<true>> => {
    const slots: Array<Interval<true>> = []
    const slotsPerHour = 60 / (scheduleDuration || 30)
    const totalSlots = 24 * slotsPerHour

    for (let i = 0; i < totalSlots; i++) {
      const minutesFromStart = i * (scheduleDuration || 30)
      const start = DateTime.fromJSDate(time)
        .setZone(timezone)
        .startOf('day')
        .plus({ minutes: minutesFromStart })
      const slot = Interval.after(start, { minute: scheduleDuration || 30 })
      if (slot.isValid) slots.push(slot)
    }
    return slots
  }
  const months = useMemo(() => {
    const year = currentSelectedDate.getFullYear()
    const monthsArray = []
    const formatter = new Intl.DateTimeFormat('en-US', { month: 'long' })
    const currentDateInTimezone = DateTime.now().setZone(timezone)
    for (let month = 0; month < 12; month++) {
      if (
        month < currentDateInTimezone.month &&
        year === currentDateInTimezone.year
      ) {
        continue
      }
      const monthDateTime = DateTime.fromObject({
        year,
        month: month + 1,
        day: 1,
      }).setZone(timezone)
      monthsArray.push({
        value: String(month),
        label: `${formatter.format(monthDateTime.toJSDate())} ${year}`,
      })
    }
    return monthsArray
  }, [currentSelectedDate.getFullYear()])
  const [dates, setDates] = useState<Array<Dates>>([])
  const [monthValue, setMonthValue] = useState<
    SingleValue<{ label: string; value: string }>
  >({
    label: `${new Intl.DateTimeFormat('en-US', { month: 'long' }).format(
      currentSelectedDate
    )} ${currentSelectedDate.getFullYear()}`,
    value: String(currentSelectedDate.getMonth()),
  })

  const _onChangeMonth = (newValue: unknown, newMonth?: Date) => {
    if (Array.isArray(newValue)) {
      return
    }
    const month = newValue as SingleValue<{ label: string; value: string }>
    setMonthValue(month)
    if (!month?.value) return
    if (!newMonth) {
      setCurrentSelectedDate(
        DateTime.now()
          .set({ month: Number(month.value), day: 1 })
          .toJSDate()
      )
    }
  }

  const tzOptions = useMemo(
    () =>
      timezones.map(tz => ({
        value: tz.tzCode,
        label: tz.name,
      })),
    []
  )

  const [tz, setTz] = useState<SingleValue<{ label: string; value: string }>>(
    tzOptions.filter(val => val.value === timezone)[0] || tzOptions[0]
  )

  const _onChange = (newValue: unknown) => {
    if (Array.isArray(newValue)) {
      return
    }
    const timezone = newValue as SingleValue<{ label: string; value: string }>
    setTz(timezone)
    setTimezone(
      timezone?.value || Intl.DateTimeFormat().resolvedOptions().timeZone
    )
  }

  const getDates = (scheduleDuration = duration) => {
    const days = Array.from({ length: 7 }, (v, k) => k)
      .map(k => addDays(currentSelectedDate, k))
      .filter(val =>
        isSameMonth(
          val,
          DateTime.fromJSDate(currentSelectedDate)
            .setZone(timezone)
            .startOf('month')
            .toJSDate()
        )
      )
    return days.map(date => {
      const slots = getEmptySlots(date, scheduleDuration)
      date = DateTime.fromJSDate(date)
        .setZone(timezone)
        .startOf('day')
        .toJSDate()

      return {
        date,
        slots,
      }
    })
  }

  async function handleSlotLoad() {
    setIsLoading(true)
    try {
      setAvailableSlots(new Map())
      setBusySlots(new Map())
      const monthStart = DateTime.fromJSDate(currentSelectedDate)
        .setZone(timezone)
        .startOf('month')
        .toJSDate()
      const monthEnd = DateTime.fromJSDate(currentSelectedDate)
        .setZone(timezone)
        .endOf('month')
        .toJSDate()
      const accounts = [...new Set(Object.values(groupAvailability).flat())]
      const availableSlots = await fetchBusySlotsRawForMultipleAccounts(
        accounts,
        monthStart,
        monthEnd
      )
      const accountSlots = accounts.map(account => {
        return availableSlots.filter(slot => slot.account_address === account)
      })
      const map: Map<string, Interval[]> = new Map<string, Interval[]>()
      for (const memberAccount of meetingMembers) {
        if (!memberAccount.address) continue
        const availabilities = parseMonthAvailabilitiesToDate(
          memberAccount?.preferences?.availabilities || [],
          monthStart,
          monthEnd,
          memberAccount?.preferences?.timezone || 'UTC'
        )
        map.set(memberAccount.address.toLowerCase(), availabilities)
      }
      setAvailableSlots(map)
      const busySlotsMap: Map<string, Interval[]> = new Map()
      for (const account of accountSlots) {
        const busySlots = account.map(slot => {
          return Interval.fromDateTimes(
            new Date(slot.start),
            new Date(slot.end)
          )
        })
        busySlotsMap.set(
          account?.[0]?.account_address?.toLowerCase(),
          busySlots
        )
      }
      setBusySlots(busySlotsMap)
      setDates(getDates(duration))
    } catch (error: unknown) {
      handleApiError('Error merging availabilities', error)
    }
    setIsLoading(false)
  }
  useEffect(() => {
    handleSlotLoad()
  }, [
    groupAvailability,
    currentSelectedDate.getMonth(),
    duration,
    meetingMembers,
  ])
  useEffect(() => {
    setDates(getDates())
  }, [currentSelectedDate, timezone])
  const handleScheduledTimeBack = () => {
    const currentDate = DateTime.fromJSDate(currentSelectedDate)
      .setZone(timezone)
      .startOf('day')
    let newDate = currentDate.minus({ days: 7 })
    const differenceInDays = currentDate
      .diff(currentDate.startOf('month'), 'days')
      .toObject().days
    if (differenceInDays && differenceInDays < 7) {
      newDate = currentDate.startOf('month')
    }
    if (!newDate.hasSame(currentDate, 'month')) {
      newDate = newDate.endOf('month').startOf('week')
      _onChangeMonth(
        {
          label: `${newDate.toFormat('MMMM yyyy')}`,
          value: String(newDate.month - 1),
        },
        newDate.toJSDate()
      )
    }
    setCurrentSelectedDate(newDate.toJSDate())
  }
  const handleScheduledTimeNext = () => {
    const currentDate = DateTime.fromJSDate(currentSelectedDate)
      .setZone(timezone)
      .startOf('day')
    let newDate = currentDate.plus({ days: 7 })
    if (!newDate.hasSame(currentDate, 'month')) {
      newDate = newDate.startOf('month')
      _onChangeMonth(
        {
          label: `${newDate.toFormat('MMMM yyyy')}`,
          value: String(newDate.month - 1),
        },
        newDate.toJSDate()
      )
    }
    setCurrentSelectedDate(newDate.toJSDate())
  }
  const HOURS_SLOTS = useMemo(() => {
    const slots = getEmptySlots(new Date(), duration >= 45 ? duration : 60)
    return slots.map(val => {
      const zonedTime = val.start.setZone(timezone)
      return zonedTime.toFormat(zonedTime.hour < 12 ? 'HH:mm a' : 'hh:mm a')
    })
  }, [duration, timezone])

  const isBackDisabled = useMemo(() => {
    const selectedDate =
      DateTime.fromJSDate(currentSelectedDate).setZone(timezone)
    const currentDate = DateTime.now().setZone(timezone)
    return selectedDate < currentDate || isLoading
  }, [currentSelectedDate, timezone, isLoading])
  const availabilityAddresses = useMemo(() => {
    const keys = Object.keys(groupAvailability)
    const participantsSet = new Set<string>()
    for (const key of keys) {
      const allGroupParticipants = groupAvailability[key] || []
      for (const participant of allGroupParticipants) {
        participantsSet.add(participant)
      }
    }
    return Array.from(participantsSet)
  }, [groupAvailability])
  return (
    <Tooltip.Provider delayDuration={400}>
      <VStack gap={4} w="100%">
        <Flex
          w="100%"
          alignItems={{ lg: 'flex-end' }}
          flexDir={{
            base: 'column',
            lg: 'row',
          }}
          gap={4}
        >
          <VStack
            gap={2}
            alignItems={'flex-start'}
            width="fit-content"
            minW={'300px'}
          >
            <HStack width="fit-content" gap={0}>
              <Heading fontSize="16px">Show times in</Heading>
              <InfoTooltip text="the default timezone is based on your availability settings" />
            </HStack>
            <Select
              value={tz}
              colorScheme="primary"
              onChange={_onChange}
              className="noLeftBorder timezone-select"
              options={tzOptions}
              components={customSelectComponents}
            />
          </VStack>
          <VStack
            gap={2}
            alignItems={'flex-start'}
            width="fit-content"
            minW={'300px'}
          >
            <Heading fontSize="16px">Month</Heading>

            <Select
              value={monthValue}
              colorScheme="primary"
              onChange={newValue => _onChangeMonth(newValue)}
              className="noLeftBorder timezone-select"
              options={months}
              components={customSelectComponents}
            />
          </VStack>
          <FormControl
            w={'max-content'}
            isDisabled={!canEditMeetingDetails || isScheduling}
          >
            <FormLabel htmlFor="date">
              Duration
              <Text color="red.500" display="inline">
                *
              </Text>
            </FormLabel>
            <ChakraSelect
              id="duration"
              placeholder="Duration"
              onChange={e => handleDurationChange(Number(e.target.value))}
              value={duration}
              borderColor="neutral.400"
              width={'max-content'}
              maxW="350px"
              errorBorderColor="red.500"
            >
              {DEFAULT_GROUP_SCHEDULING_DURATION.map(type => (
                <option key={type.id} value={type.duration}>
                  {durationToHumanReadable(type.duration)}
                </option>
              ))}
            </ChakraSelect>
          </FormControl>
          <Grid
            gridTemplateColumns={'1fr 1fr'}
            justifyContent={'space-between'}
            w="100%"
            gap={2}
          >
            {GUIDES.map((guide, index) => {
              return (
                <HStack key={index} gap={2}>
                  <Box w={5} h={5} bg={guide.color} borderRadius={4} />
                  <Text>{guide.description.split(' ')[0]}</Text>
                </HStack>
              )
            })}
          </Grid>
        </Flex>

        <VStack
          gap={6}
          w="100%"
          borderWidth={1}
          px={{ md: 6, base: 2 }}
          py={4}
          rounded={12}
        >
          <HStack w="100%" justify={'space-between'}>
            <IconButton
              aria-label={'left-icon'}
              icon={<FaChevronLeft />}
              onClick={handleScheduledTimeBack}
              isDisabled={isBackDisabled}
            />
            <Box maxW="350px" textAlign="center">
              <Heading fontSize="16px">Available times</Heading>
              <Text fontSize="12px">
                All time slots shown below are the available times between you
                and the required participants.
              </Text>
            </Box>
            <IconButton
              aria-label={'left-icon'}
              icon={<FaChevronRight />}
              onClick={handleScheduledTimeNext}
            />
          </HStack>
          {isLoading ? (
            <HStack>
              <Loading />
            </HStack>
          ) : (
            <HStack
              w="100%"
              justify={{ md: 'space-between' }}
              gap={{ base: 1, md: 6 }}
            >
              <VStack
                align={'flex-start'}
                flex={1}
                justify={'flex-start'}
                gap={2}
              >
                <Box h={'48px'} width={'100%'} />
                <VStack align={'flex-start'} p={1} gap={0}>
                  {HOURS_SLOTS.map((slot, index) => {
                    return (
                      <HStack
                        key={index}
                        w="100%"
                        justify={'center'}
                        align={'center'}
                        h={12}
                        my={'1px'}
                      >
                        <Text
                          fontWeight={'500'}
                          fontSize={{
                            base: 'small',
                            md: 'medium',
                          }}
                        >
                          {slot}
                        </Text>
                      </HStack>
                    )
                  })}
                </VStack>
              </VStack>
              {dates.map((date, index) => {
                return (
                  <SlideFade
                    in={true}
                    key={index + date.date.toDateString()}
                    transition={{ exit: { delay: 0 }, enter: { duration: 1 } }}
                    style={{ flex: 1 }}
                  >
                    <VStack flex={1} align={'flex-start'} gap={2}>
                      <VStack align={'center'} w="100%" h={12} gap={0}>
                        <Text fontWeight={'700'}>
                          {formatInTimeZone(date.date, timezone, 'dd')}
                        </Text>
                        <Text fontWeight={'500'}>
                          {formatInTimeZone(date.date, timezone, 'EE')}
                        </Text>
                      </VStack>
                      <VStack
                        width="100%"
                        align={'flex-start'}
                        borderWidth={1}
                        borderRadius={5}
                        gap={'-1px'}
                        p={1}
                      >
                        {date.slots.map(slot => {
                          return (
                            <ScheduleTimeSlot
                              key={`${slot.start.toISO()}-${index}-${duration}`}
                              slot={slot}
                              busySlots={busySlots}
                              availableSlots={availableSlots}
                              pickedTime={pickedTime}
                              duration={duration}
                              meetingMembers={meetingMembers}
                              participantAvailabilities={availabilityAddresses}
                              handleTimePick={time => {
                                handleTimePick(time)
                                handlePageSwitch(Page.SCHEDULE_DETAILS)
                              }}
                              timezone={timezone}
                            />
                          )
                        })}
                      </VStack>
                    </VStack>
                  </SlideFade>
                )
              })}
            </HStack>
          )}
        </VStack>
      </VStack>
    </Tooltip.Provider>
  )
}
