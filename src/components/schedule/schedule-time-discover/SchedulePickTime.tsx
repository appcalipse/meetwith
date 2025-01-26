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
  addHours,
  endOfMonth,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  setHours,
  setMinutes,
  setSeconds,
  startOfMonth,
  sub,
} from 'date-fns'
import { formatInTimeZone, utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'
import { DateTime } from 'luxon'
import { useContext, useEffect, useMemo, useState } from 'react'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'

import Loading from '@/components/Loading'
import InfoTooltip from '@/components/profile/components/Tooltip'
import { Page, ScheduleContext } from '@/pages/dashboard/schedule'
import { DayAvailability } from '@/types/Account'
import { CustomTimeRange } from '@/types/common'
import { TimeSlot } from '@/types/Meeting'
import { fetchBusySlotsRawForMultipleAccounts } from '@/utils/api_helper'
import { customSelectComponents } from '@/utils/constants/select'
import { timezones } from '@/utils/date_helper'
import { handleApiError } from '@/utils/error_helper'

import { MeetingMembers } from '../ScheduleTimeDiscover'
import { ScheduleTimeSlot } from './ScheduleTimeSlot'

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

const CLOCK = [
  {
    label: 'AM',
    value: 'AM',
  },
  {
    label: 'PM',
    value: 'PM',
  },
]

type Dates = {
  date: Date
  slots: Array<{
    start: Date
    end: Date
  }>
  busySlots: Array<Array<TimeSlot>>
  availabilities: Array<Record<string, Array<CustomTimeRange>>>
}
interface SchedulePickTimeProps {
  accountAvailabilities: Record<string, Array<DayAvailability>>
  meetingMembers: MeetingMembers[]
}
export function SchedulePickTime({
  accountAvailabilities,
  meetingMembers,
}: SchedulePickTimeProps) {
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
  } = useContext(ScheduleContext)

  const [accountSlots, setAccountSlots] = useState<Array<TimeSlot[]>>([])
  const [isLoading, setIsLoading] = useState(false)

  const getMonthsForYear = () => {
    const year = currentMonth.getFullYear()
    const months = []
    for (let month = 0; month < 12; month++) {
      if (month < new Date().getMonth() && year === new Date().getFullYear()) {
        continue
      }
      const date = new Date(year, month, 1)
      months.push({
        value: String(month),
        label: `${new Intl.DateTimeFormat('en-US', { month: 'long' }).format(
          date
        )} ${year}`,
      })
    }
    return months
  }
  const getEmptySlots = (time: Date) => {
    const slots = []

    for (let i = 0; i < 24; i++) {
      const start = DateTime.fromJSDate(time)
        .setZone(timezone)
        .set({
          hour: i,
          minute: 0,
          second: 0,
        })
        .toJSDate()
      const end = zonedTimeToUtc(addHours(start, 1), timezone)
      const slot = {
        start,
        end,
      }
      slots.push(slot)
    }
    return slots
  }
  const months = useMemo(() => getMonthsForYear(), [currentMonth])
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

  const tzs = timezones.map(tz => {
    return {
      value: String(tz.tzCode),
      label: tz.name,
    }
  })

  const [tz, setTz] = useState<SingleValue<{ label: string; value: string }>>(
    tzs.filter(val => val.value === timezone)[0] || tzs[0]
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

  const getDates = (accountSlots: Array<TimeSlot[]>) => {
    const days = Array.from({ length: 7 }, (v, k) => k)
      .map(k => addDays(currentSelectedDate, k))
      .filter(val => isSameMonth(val, currentMonth))
    return days.map(date => {
      const slots = getEmptySlots(date)
      const busySlots = accountSlots.map(val => {
        return val.filter(slot => {
          return isSameDay(slot.start, date)
        })
      })
      const availabilities: Array<Record<string, Array<CustomTimeRange>>> = []
      const accounts = Object.values(groupAvailability).flat()
      for (const [key, entry] of Object.entries(accountAvailabilities)) {
        const ranges = []
        for (const availability of entry) {
          ranges.push(...(availability.ranges as Array<CustomTimeRange>))
        }

        if (accounts.includes(key)) {
          availabilities.push({
            [key]: ranges,
          })
        }
      }

      return {
        date,
        slots,
        busySlots,
        availabilities,
      }
    })
  }
  async function handleSlotLoad() {
    setIsLoading(true)
    try {
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
      setAccountSlots(accountSlots)
      setDates(getDates(accountSlots))
    } catch (error: unknown) {
      handleApiError('Error merging availabilities', error as Error)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    handleSlotLoad()
  }, [groupAvailability, currentMonth, timezone])
  useEffect(() => {
    setDates(getDates(accountSlots))
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
  const isAm = (val: Date) => {
    return formatInTimeZone(val, timezone, 'a').toLowerCase() === 'am'
  }
  const SLOTS = useMemo(
    () =>
      getEmptySlots(new Date()).map(val =>
        formatInTimeZone(
          val.start,
          timezone,
          isAm(val.start) ? 'HH:mm a' : 'hh:mm a'
        )
      ),
    []
  )

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
              options={tzs}
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
          borderColor={'neutral.400'}
          px={{ md: 6, base: 2 }}
          py={4}
          rounded={12}
        >
          <HStack w="100%" justify={'space-between'}>
            <IconButton
              aria-label={'left-icon'}
              icon={<FaChevronLeft />}
              onClick={handleScheduledTimeBack}
              isDisabled={
                isBefore(
                  currentSelectedDate,
                  utcToZonedTime(new Date(), timezone)
                ) || isLoading
              }
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
                <VStack align={'flex-start'} p={1}>
                  {SLOTS.map((slot, index) => {
                    return (
                      <HStack
                        key={index}
                        w="100%"
                        justify={'center'}
                        align={'center'}
                        h={12}
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
                        p={1}
                        borderWidth={1}
                        borderColor={'neutral.400'}
                        borderRadius={5}
                      >
                        {date.slots.map(slot => {
                          return (
                            <ScheduleTimeSlot
                              key={formatInTimeZone(
                                slot.start,
                                timezone,
                                'DDDD,MMMM,yyyy, hh:mm,a'
                              )}
                              slot={slot}
                              date={date.date}
                              busySlots={date.busySlots}
                              availabilities={date.availabilities}
                              pickedTime={pickedTime}
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
