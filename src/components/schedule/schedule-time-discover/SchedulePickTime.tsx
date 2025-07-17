/* eslint-disable tailwindcss/no-custom-classname */
import {
  Box,
  Flex,
  Grid,
  Heading,
  HStack,
  IconButton,
  SlideFade,
  Text,
  VStack,
} from '@chakra-ui/react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Select, SingleValue } from 'chakra-react-select'
import {
  add,
  addDays,
  endOfMonth,
  isBefore,
  isSameMonth,
  startOfMonth,
  sub,
} from 'date-fns'
import { formatInTimeZone, utcToZonedTime } from 'date-fns-tz'
import debounce from 'lodash.debounce'
import { DateTime, Interval } from 'luxon'
import { useContext, useEffect, useMemo, useState } from 'react'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'

import Loading from '@/components/Loading'
import InfoTooltip from '@/components/profile/components/Tooltip'
import { Page, ScheduleContext } from '@/pages/dashboard/schedule'
import { fetchBusySlotsRawForMultipleAccounts } from '@/utils/api_helper'
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
      return 'green.300'
    case State.SOME_AVAILABLE:
      return 'green.200'
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
    currentMonth,
    setCurrentMonth,
    timezone,
    setTimezone,
    currentSelectedDate,
    handleTimePick,
    setCurrentSelectedDate,
    handlePageSwitch,
    pickedTime,
    duration,
    meetingMembers,
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
        .set({
          hour: Math.floor(minutesFromStart / 60),
          minute: minutesFromStart % 60,
          second: 0,
        })
      const slot = Interval.after(start, { minute: scheduleDuration || 30 })
      if (slot.isValid) slots.push(slot)
    }
    return slots
  }
  const months = useMemo(() => {
    const year = currentMonth.getFullYear()
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
  }, [currentMonth.getFullYear()])
  const [dates, setDates] = useState<Array<Dates>>([])
  const [monthValue, setMonthValue] = useState<
    SingleValue<{ label: string; value: string }>
  >({
    label: `${new Intl.DateTimeFormat('en-US', { month: 'long' }).format(
      currentMonth
    )} ${currentMonth.getFullYear()}`,
    value: String(currentMonth.getMonth()),
  })

  const _onChangeMonth = (newValue: unknown, newMonth?: Date) => {
    if (Array.isArray(newValue)) {
      return
    }
    const month = newValue as SingleValue<{ label: string; value: string }>
    setMonthValue(month)
    if (!month?.value) return
    const year = newMonth ? newMonth?.getFullYear() : currentMonth.getFullYear()
    setCurrentMonth(new Date(year, Number(month.value), 1))
    if (!newMonth) {
      setCurrentSelectedDate(new Date(year, Number(month.value), 1))
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
      .filter(val => isSameMonth(val, currentMonth))
    return days.map(date => {
      const slots = getEmptySlots(date, scheduleDuration)
      date = DateTime.fromJSDate(date)
        .setZone(timezone)
        .set({
          hour: 0,
          minute: 0,
          second: 0,
        })
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
      const monthStart = startOfMonth(currentMonth)
      const monthEnd = endOfMonth(currentMonth)
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
        ).map(({ start, end }) => Interval.fromDateTimes(start, end))
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
        busySlotsMap.set(account[0].account_address.toLowerCase(), busySlots)
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
  }, [groupAvailability, currentMonth, duration, meetingMembers])
  useEffect(() => {
    setDates(getDates())
  }, [currentSelectedDate, timezone])
  const handleScheduledTimeBack = () => {
    const currentDay = currentSelectedDate.getDate()
    if (currentDay === 1) {
      const newMonth = startOfMonth(sub(currentSelectedDate, { months: 1 }))

      setCurrentSelectedDate(addDays(endOfMonth(newMonth), -6))
      _onChangeMonth(
        {
          label: `${new Intl.DateTimeFormat('en-US', { month: 'long' }).format(
            newMonth
          )} ${newMonth.getFullYear()}`,
          value: String(newMonth.getMonth()),
        },
        newMonth
      )
    } else if (currentDay - 7 < 1) {
      setCurrentSelectedDate(startOfMonth(currentSelectedDate))
    } else {
      setCurrentSelectedDate(addDays(currentSelectedDate, -7))
    }
  }
  const handleScheduledTimeNext = () => {
    const currentDay = currentSelectedDate.getDate()
    const lastDateOfMonth = endOfMonth(currentSelectedDate).getDate()
    if (currentDay === lastDateOfMonth - 6) {
      const newMonth = startOfMonth(add(currentSelectedDate, { months: 1 }))
      setCurrentSelectedDate(newMonth)
      _onChangeMonth(
        {
          label: `${new Intl.DateTimeFormat('en-US', { month: 'long' }).format(
            newMonth
          )} ${newMonth.getFullYear()}`,
          value: String(newMonth.getMonth()),
        },
        newMonth
      )
    } else if (currentDay + 7 > lastDateOfMonth - 7) {
      setCurrentSelectedDate(addDays(endOfMonth(currentSelectedDate), -6))
    } else {
      setCurrentSelectedDate(addDays(currentSelectedDate, 7))
    }
  }
  const HOURS_SLOTS = useMemo(() => {
    const slots = getEmptySlots(new Date(), duration >= 45 ? duration : 60)
    return slots.map(val => {
      const zonedTime = val.start.setZone(timezone)
      return zonedTime.toFormat(zonedTime.hour < 12 ? 'HH:mm a' : 'hh:mm a')
    })
  }, [duration, timezone])
  const debouncedTimezoneChange = useMemo(
    () =>
      debounce((newTimezone: string) => {
        setTimezone(newTimezone)
      }, 300),
    []
  )
  const isBackDisabled = useMemo(() => {
    const selectedDate =
      DateTime.fromJSDate(currentSelectedDate).setZone(timezone)
    const currentDate = DateTime.now().setZone(timezone)
    return selectedDate < currentDate || isLoading
  }, [currentSelectedDate, timezone, isLoading])

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
                  <Text>{guide.description}</Text>
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
                              key={`${date.date.toDateString()}-${index}-${duration}`}
                              slot={slot}
                              busySlots={busySlots}
                              availableSlots={availableSlots}
                              pickedTime={pickedTime}
                              duration={duration}
                              meetingMembers={meetingMembers}
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
