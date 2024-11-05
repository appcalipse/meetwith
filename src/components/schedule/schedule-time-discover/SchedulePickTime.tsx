/* eslint-disable tailwindcss/no-custom-classname */
import {
  Box,
  Heading,
  HStack,
  Icon,
  IconButton,
  Text,
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
  addDays,
  endOfMonth,
  isSameDay,
  isSameMonth,
  startOfMonth,
} from 'date-fns'
import React, { useContext, useEffect, useMemo, useState } from 'react'
import { FaChevronDown, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { SelectComponentsGeneric } from 'react-select/dist/declarations/src/components'
import { ActionMeta } from 'react-select/dist/declarations/src/types'

import InfoTooltip from '@/components/profile/components/Tooltip'
import { IGroupParticipant, ScheduleContext } from '@/pages/dashboard/schedule'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import { fetchBusySlotsRawForMultipleAccounts } from '@/utils/api_helper'
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
const getEmptySlots = (date: Date) => {
  const slots = []
  for (let i = 0; i < 12; i++) {
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
export function SchedulePickTime() {
  const {
    groupAvailability,
    currentMonth,
    setCurrentMonth,
    timezone,
    setTimezone,
    participants,
    currentSelectedDate,
    setCurrentSelectedDate,
  } = useContext(ScheduleContext)

  const [accountSlots, setAccountSlots] = useState<Array<Interval[]>>([])
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
        label: new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date),
      })
    }
    return months
  }

  const months = useMemo(() => getMonthsForYear(), [currentMonth])
  const getDates = () => {
    const days = Array.from({ length: 7 }, (v, k) => k)
      .map(k => addDays(currentSelectedDate, k))
      .filter(val => isSameMonth(val, currentMonth))
    return days.map((date, index) => {
      const slots = getEmptySlots(date)
      const busySlots = accountSlots.map(val => {
        return val.filter(slot => {
          return (
            isSameDay(slot.start, date) &&
            new Date(slot.start).getHours() === index
          )
        })
      })
      return {
        date,
        slots,
        busySlots,
      }
    })
  }
  const [dates, setDates] = useState(getDates())
  console.log({ dates })
  const [monthValue, setMonthValue] = useState<
    SingleValue<{ label: string; value: string }>
  >({
    label: new Intl.DateTimeFormat('en-US', { month: 'long' }).format(
      new Date()
    ),
    value: String(new Date().getMonth()),
  })
  const _onChangeMonth = (
    newValue:
      | SingleValue<{ label: string; value: string }>
      | MultiValue<{ label: string; value: string }>,
    actionMeta: ActionMeta<any>
  ) => {
    if (Array.isArray(newValue)) {
      return
    }
    const month = newValue as SingleValue<{ label: string; value: string }>
    setMonthValue(month)
    if (!month?.value) return
    setCurrentMonth(new Date(year, Number(month.value), 1))
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
      const availableSlots = await fetchBusySlotsRawForMultipleAccounts(
        accounts,
        monthStart,
        monthEnd
      )
      const accountSlots = accounts.map(account => {
        return availableSlots.filter(slot => slot.account_address === account)
      })
      setAccountSlots(accountSlots)
    } catch (error: any) {
      handleApiError('Error merging availabilities', error)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    handleSlotLoad()
  }, [groupAvailability, currentMonth])
  const handleScheduledTimeBack = () => {}
  const handleScheduledTimeNext = () => {}
  return (
    <VStack gap={10} w="100%">
      <HStack w="100%">
        <VStack gap={2} alignItems={'flex-start'}>
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
        <VStack gap={2} alignItems={'flex-start'}>
          <Heading fontSize="16px">Month</Heading>

          <Select
            value={monthValue}
            colorScheme="primary"
            onChange={_onChangeMonth}
            className="noLeftBorder timezone-select"
            options={months}
            components={customComponents}
          />
        </VStack>
      </HStack>

      <VStack
        gap={6}
        w="100%"
        borderWidth={1}
        borderColor={'neutral.400'}
        px={6}
        py={4}
        rounded={12}
      >
        <HStack w="100%" justify={'space-between'}>
          <IconButton
            aria-label={'left-icon'}
            icon={<FaChevronLeft />}
            onClick={handleScheduledTimeBack}
          />
          <Box maxW="350px" textAlign="center">
            <Heading fontSize="16px">Available times</Heading>
            <Text fontSize="12px">
              All time slots shown below are the available times between you and
              the required participants.
            </Text>
          </Box>
          <IconButton
            aria-label={'left-icon'}
            icon={<FaChevronRight />}
            onClick={handleScheduledTimeNext}
          />
        </HStack>
        <HStack>
          <VStack>
            <Select
              value={monthValue}
              colorScheme="primary"
              onChange={_onChangeMonth}
              className="noLeftBorder timezone-select"
              options={CLOCK}
              components={customComponents}
            />
          </VStack>
        </HStack>
      </VStack>
    </VStack>
  )
}
