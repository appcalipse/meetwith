/* eslint-disable tailwindcss/no-custom-classname */
import {
  Box,
  Flex,
  Grid,
  Heading,
  HStack,
  Icon,
  IconButton,
  SlideFade,
  Text,
  VStack,
} from '@chakra-ui/react'
import * as Tooltip from '@radix-ui/react-tooltip'
import {
  chakraComponents,
  MultiValue,
  Select,
  SingleValue,
} from 'chakra-react-select'
import {
  add,
  addDays,
  endOfMonth,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfMonth,
  sub,
} from 'date-fns'
import { useContext, useEffect, useMemo, useState } from 'react'
import { FaChevronDown, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { SelectComponentsGeneric } from 'react-select/dist/declarations/src/components'

import Loading from '@/components/Loading'
import InfoTooltip from '@/components/profile/components/Tooltip'
import { Page, ScheduleContext } from '@/pages/dashboard/schedule'
import { DayAvailability } from '@/types/Account'
import { CustomTimeRange } from '@/types/common'
import { TimeSlot } from '@/types/Meeting'
import { fetchBusySlotsRawForMultipleAccounts } from '@/utils/api_helper'
import { timezones } from '@/utils/date_helper'
import { handleApiError } from '@/utils/error_helper'

import { MeetingMembers } from '../ScheduleTimeDiscover'
import { ScheduleTimeSlot } from './ScheduleTimeSlot'

const GUIDES = [
  {
    color: 'green.400',
    description: 'Everyone is available',
  },
  {
    color: 'green.200',
    description: 'Some are available',
  },
  {
    color: 'green.300',
    description: 'Most are available',
  },
  {
    color: 'neutral.0',
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
  const [clockValue, setClockValue] = useState<
    SingleValue<{ label: string; value: string }>
  >({
    label: format(pickedTime || new Date(), 'a').toUpperCase(),
    value: format(pickedTime || new Date(), 'a').toUpperCase(),
  })

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
  const getEmptySlots = (date: Date) => {
    const slots = []
    const startRange = clockValue?.value === 'AM' ? 0 : 12
    const endRange = clockValue?.value === 'AM' ? 12 : 24
    for (let i = startRange; i < endRange; i++) {
      const start = new Date(date)
      start.setHours(i)
      start.setMinutes(0)
      start.setSeconds(0)
      const end = new Date(date)
      end.setHours(i + 1)
      end.setMinutes(0)
      end.setSeconds(0)
      slots.push({
        start,
        end,
      })
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

  const _onChangeMonth = (
    newValue:
      | SingleValue<{ label: string; value: string }>
      | MultiValue<{ label: string; value: string }>,
    newMonth?: Date
  ) => {
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

  const _onChangeClock = (
    newValue:
      | SingleValue<{ label: string; value: string }>
      | MultiValue<{ label: string; value: string }>
  ) => {
    if (Array.isArray(newValue)) {
      return
    }
    const clock = newValue as SingleValue<{ label: string; value: string }>
    setClockValue(clock)
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

  const _onChange = (
    newValue:
      | SingleValue<{ label: string; value: string }>
      | MultiValue<{ label: string; value: string }>
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
  }, [groupAvailability, currentMonth])
  useEffect(() => {
    setDates(getDates(accountSlots))
  }, [currentSelectedDate, clockValue])
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
  const SLOTS = useMemo(
    () =>
      getEmptySlots(new Date()).map(val =>
        format(val.start, clockValue?.value === 'AM' ? 'HH:mm a' : 'hh:mm a')
      ),
    [clockValue]
  )

  return (
    <Tooltip.Provider delayDuration={400}>
      <VStack gap={4} w="100%">
        <Flex
          w="100%"
          alignItems={{ md: 'flex-end' }}
          flexDir={{
            base: 'column',
            md: 'row',
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
              components={customComponents}
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
              components={customComponents}
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
                isBefore(currentSelectedDate, new Date()) || isLoading
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
                <Select
                  value={clockValue}
                  colorScheme="primary"
                  onChange={_onChangeClock}
                  className="noLeftBorder date-select"
                  options={CLOCK}
                  components={customComponents}
                />
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
                          {format(date.date, 'dd')}
                        </Text>
                        <Text fontWeight={'500'}>
                          {format(date.date, 'EE')}
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
                              key={format(
                                slot.start,
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
