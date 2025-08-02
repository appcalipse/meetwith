import {
  Box,
  Flex,
  Heading,
  HStack,
  Icon,
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import * as Sentry from '@sentry/nextjs'
import { chakraComponents, Props, Select } from 'chakra-react-select' // TODO: Move all date logic to luxon
import {
  addMinutes,
  areIntervalsOverlapping,
  eachMinuteOfInterval,
  isSameDay,
  isSameMonth,
} from 'date-fns'
import { DateTime } from 'luxon'
import React, { useContext, useEffect } from 'react'
import {
  FaArrowLeft,
  FaCalendar,
  FaChevronDown,
  FaClock,
  FaGlobe,
} from 'react-icons/fa'

import Loading from '@/components/Loading' // TODO: create helper function to merge availabilities from availability block
import Calendar from '@/components/MeetSlotPicker/calendar/index'
import TimeSlots from '@/components/MeetSlotPicker/TimeSlots'
import {
  PublicScheduleContext,
  ScheduleStateContext,
} from '@/components/public-meeting'
import { ScheduleForm } from '@/components/schedule/schedule-form'
import useAccountContext from '@/hooks/useAccountContext'
import { logEvent } from '@/utils/analytics'
import { doesContactExist } from '@/utils/api_helper'
import { Option } from '@/utils/constants/select'
import { timezones } from '@/utils/date_helper'

const tzs = timezones.map(tz => {
  return {
    value: String(tz.tzCode),
    label: tz.name,
  }
})
const SchedulerPicker = () => {
  const { tx, account, selectedType, notificationsSubs, setIsContact } =
    useContext(PublicScheduleContext)
  const {
    currentMonth,
    setCurrentMonth,
    availableSlots,
    selfAvailableSlots,
    checkingSlots,
    checkedSelfSlots,
    isScheduling,
    pickedDay,
    setPickedDay,
    pickedTime,
    setPickedTime,
    showConfirm,
    setShowConfirm,
    selectedMonth,
    setSelectedMonth,
    busySlots,
    selfBusySlots,
    timezone,
    setTimezone,
    getAvailableSlots,
    confirmSchedule,
  } = useContext(ScheduleStateContext)
  const color = useColorModeValue('primary.500', 'white')
  const currentAccount = useAccountContext()
  const slotDurationInMinutes = selectedType?.duration_minutes || 0

  useEffect(() => {
    if (account?.preferences?.availabilities) {
      getAvailableSlots()
    }
  }, [account?.preferences?.availabilities, currentMonth])
  const handleContactCheck = async () => {
    try {
      if (!account?.address) return
      const contactExists = await doesContactExist(account?.address)
      setIsContact(contactExists)
    } catch (e) {
      Sentry.captureException(e)
      console.error('Error checking contact existence:', e)
    }
  }
  useEffect(() => {
    if (!currentAccount?.address || !account?.address) return
    void handleContactCheck()
  }, [currentAccount, account])
  const isFutureInTimezone = (date: Date, timezoneValue: string) => {
    const dateInTimezone = DateTime.fromObject(
      {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
      },
      { zone: timezoneValue }
    )

    const nowInTimezone = DateTime.now().setZone(timezoneValue).startOf('day')

    return dateInTimezone > nowInTimezone
  }

  const isTodayInTimezone = (date: Date, timezoneValue: string) => {
    const dateInTimezone = DateTime.fromObject(
      {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
      },
      { zone: timezoneValue }
    )

    const nowInTimezone = DateTime.now().setZone(timezoneValue)

    return (
      dateInTimezone.year === nowInTimezone.year &&
      dateInTimezone.month === nowInTimezone.month &&
      dateInTimezone.day === nowInTimezone.day
    )
  }
  const validator = (date: Date) => {
    if (!slotDurationInMinutes) return
    const dayInTimezone = DateTime.fromObject(
      {
        year: date.getFullYear(),
        month: date.getMonth() + 1, // JS months are 0-indexed
        day: date.getDate(),
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
      },
      {
        zone:
          timezone.value || Intl.DateTimeFormat().resolvedOptions().timeZone,
      }
    )
    const startLocalDate = dayInTimezone.startOf('day').toJSDate()
    const endLocalDate = dayInTimezone.endOf('day').toJSDate()
    const slots = eachMinuteOfInterval(
      { start: startLocalDate, end: endLocalDate },
      { step: slotDurationInMinutes }
    ).map(s => ({
      start: s,
      end: addMinutes(s, slotDurationInMinutes),
    }))

    const intervals = availableSlots.filter(
      slot => isSameMonth(slot.start, date) && isSameDay(slot.start, date)
    )

    return (
      (isFutureInTimezone(date, timezone.value) ||
        isTodayInTimezone(date, timezone.value)) &&
      (intervals?.length === 0 ||
        slots.some(
          slot =>
            !intervals.some(interval => areIntervalsOverlapping(slot, interval))
        ))
    )
  }
  const _onChange = (newValue: unknown) => {
    const timezone = newValue as Option<string>
    if (timezone) setTimezone(timezone)
  }
  const customComponents: Props['components'] = {
    Control: props => (
      <chakraComponents.Control {...props}>
        <FaGlobe size={24} /> {props.children}
      </chakraComponents.Control>
    ),
    ClearIndicator: props => (
      <chakraComponents.ClearIndicator className="noBg" {...props}>
        <Icon as={FaChevronDown} w={4} h={4} />
      </chakraComponents.ClearIndicator>
    ),
    DropdownIndicator: props => (
      <chakraComponents.DropdownIndicator className="noBg" {...props}>
        <Icon as={FaChevronDown} />
      </chakraComponents.DropdownIndicator>
    ),
  }

  const handlePickTime = (time: Date) => {
    logEvent('Selected time')
    setPickedTime(time)
    setShowConfirm(true)
  }

  const startTime = pickedTime || new Date()

  // Use Luxon for duration calculation and timezone handling
  const startTimeInTimezone = DateTime.fromJSDate(startTime, {
    zone: timezone.value || Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
  const endTimeInTimezone = startTimeInTimezone.plus({
    minutes: selectedType?.duration_minutes || 0,
  })

  const formattedStartTime = startTimeInTimezone.toFormat('h:mm a')
  const formattedEndTime = endTimeInTimezone.toFormat('h:mm a')
  const formattedDate = DateTime.fromJSDate(startTime)
    .setZone(timezone.value || Intl.DateTimeFormat().resolvedOptions().timeZone)
    .toFormat('cccc, LLLL d, yyyy')
  const timeDuration = `${formattedStartTime} - ${formattedEndTime}`
  return (
    <Box
      width="100%"
      maxWidth="1200px"
      mx="auto"
      pos="relative"
      textAlign="center"
    >
      <HStack
        width="100%"
        justifyContent="space-between"
        alignItems="flex-start"
        gap={16}
        flexWrap="wrap"
        display={showConfirm ? 'none' : 'flex'}
      >
        <Box
          flex={1.5}
          minW="300px"
          display={{ base: !pickedDay ? 'block' : 'none', md: 'block' }}
        >
          <Calendar
            loading={checkingSlots}
            validator={validator}
            monthChanged={setCurrentMonth}
            pickDay={(day: Date) => setPickedDay(day)}
            pickedDay={pickedDay || new Date()}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            timezone={timezone.value}
          />
        </Box>
        <VStack
          alignItems={{ md: 'flex-start', base: 'center' }}
          display={{ base: pickedDay ? 'flex' : 'none', md: 'flex' }}
          w={{ base: '100%', md: 'auto' }}
        >
          <VStack alignItems={'flex-start'} w="100%">
            <HStack mb={0}>
              <Icon
                as={FaArrowLeft}
                onClick={() => setPickedDay(null)}
                size="1.5em"
                color={color}
                cursor="pointer"
                display={{ base: 'block', md: 'none' }}
              />
              <Heading size="md">Select Time</Heading>
            </HStack>
            <Select
              value={timezone}
              onChange={_onChange}
              colorScheme="primary"
              className="hideBorder"
              options={tzs}
              components={customComponents}
            />
          </VStack>
          {checkingSlots ? (
            <Flex m={8} justifyContent="center">
              <Loading label="Checking availability" />
            </Flex>
          ) : (
            <TimeSlots
              pickedDay={pickedDay || new Date()}
              slotSizeMinutes={slotDurationInMinutes}
              availableSlots={availableSlots}
              selfAvailableSlots={selfAvailableSlots}
              busySlots={busySlots}
              selfBusySlots={selfBusySlots}
              pickTime={handlePickTime}
              showSelfAvailability={checkedSelfSlots}
              timezone={timezone.value}
              selectedType={selectedType}
            />
          )}
        </VStack>
      </HStack>
      <HStack
        width="100%"
        justifyContent="space-between"
        alignItems="flex-start"
        flexWrap="wrap"
        display={showConfirm ? 'flex' : 'none'}
      >
        <VStack
          gap={{ md: 8, base: 6 }}
          w="100%"
          alignItems="flex-start"
          mt={{ base: -6, md: 0 }}
          flexBasis={{ base: '100%', '2xl': '40%' }}
          mb={{ md: 0, base: 4 }}
        >
          <Heading size={'lg'}>{selectedType?.title}</Heading>
          <HStack>
            <FaCalendar size={24} />
            <Text textAlign="left">{`${formattedDate}, ${timeDuration}`}</Text>
          </HStack>
          <HStack>
            <FaClock size={24} />
            <Text>{selectedType?.duration_minutes} minutes</Text>
          </HStack>
          <HStack>
            <FaGlobe size={24} />
            <Text align="center" fontSize="base" fontWeight="500">
              {timezone.label}
            </Text>
          </HStack>
        </VStack>
        <VStack align="flex-start" flexBasis={{ base: '100%', '2xl': '50%' }}>
          <HStack mb={0} cursor="pointer" onClick={() => setShowConfirm(false)}>
            <Icon as={FaArrowLeft} size="1.5em" color={color} />
            <Heading size="md" color={color}>
              Meeting Information
            </Heading>
          </HStack>
          <ScheduleForm
            pickedTime={pickedTime!}
            isSchedulingExternal={isScheduling}
            notificationsSubs={notificationsSubs}
            preferences={account?.preferences}
            meetingProviders={account?.preferences?.meetingProviders}
            selectedType={selectedType}
          />
        </VStack>
      </HStack>
    </Box>
  )
}
export default SchedulerPicker
