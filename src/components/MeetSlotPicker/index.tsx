import {
  Box,
  Flex,
  Heading,
  HStack,
  Icon,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { chakraComponents, Props, Select } from 'chakra-react-select'
import {
  addDays,
  addMinutes,
  areIntervalsOverlapping,
  eachMinuteOfInterval,
  isSameDay,
  isSameMonth,
} from 'date-fns'
import { DateTime } from 'luxon'
import React, { useEffect, useState } from 'react'
import { FaChevronDown, FaGlobe } from 'react-icons/fa'
import { FaArrowLeft } from 'react-icons/fa6'

import { AccountPreferences, MeetingType } from '@/types/Account'
import { MeetingReminders } from '@/types/common'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import { Option } from '@/utils/constants/select'
import { timezones } from '@/utils/date_helper'
const tzs = timezones.map(tz => {
  return {
    value: String(tz.tzCode),
    label: tz.name,
  }
})
import { captureException } from '@sentry/nextjs'

import { MeetingProvider, MeetingRepeat, SchedulingType } from '@/types/Meeting'
import { logEvent } from '@/utils/analytics'

import Loading from '../Loading'
import { ScheduleForm } from '../schedule/schedule-form'
import Calendar from './calendar'
import { Popup, PopupHeader, PopupWrapper } from './Popup'
import TimeSlots from './time-slots'

interface MeetSlotPickerProps {
  availabilityInterval?: Interval
  checkingSlots: boolean
  isGateValid: boolean
  isSchedulingExternal: boolean
  notificationsSubs?: number
  selectedType?: MeetingType
  onDayChange?: (day?: Date) => void
  onMonthChange?: (day: Date) => void
  onTimeChange?: (time?: Date) => void
  onSchedule: (
    scheduleType: SchedulingType,
    startTime: Date,
    guestEmail?: string,
    name?: string,
    content?: string,
    meetingUrl?: string,
    emailToSendReminders?: string,
    title?: string,
    participants?: Array<ParticipantInfo>,
    meetingProvider?: MeetingProvider,
    meetingReminders?: Array<MeetingReminders>,
    meetingRepeat?: MeetingRepeat
  ) => Promise<boolean>
  preferences?: AccountPreferences
  reset: boolean
  showSelfAvailability: boolean
  slotDurationInMinutes: number
  willStartScheduling: (isScheduling: boolean) => void
  isMobile: boolean
  timezone: Option<string>
  setTimezone: (timezone: Option<string>) => void
  availableSlots: Interval[]
  selfAvailableSlots: Interval[]
  busySlots: Interval[]
  selfBusySlots: Interval[]
}

const MeetSlotPicker: React.FC<MeetSlotPickerProps> = ({
  checkingSlots,
  isGateValid,
  isSchedulingExternal,
  notificationsSubs,
  onDayChange,
  onTimeChange,
  onMonthChange,
  onSchedule,
  preferences,
  reset,
  showSelfAvailability,
  slotDurationInMinutes,
  selectedType,
  willStartScheduling,
  isMobile,
  timezone,
  setTimezone,
  availableSlots,
  selfAvailableSlots,
  busySlots,
  selfBusySlots,
}) => {
  const _onChange = (newValue: unknown) => {
    if (Array.isArray(newValue)) {
      return
    }
    const timezone = newValue as Option<string>
    setTimezone(timezone)
  }

  const [pickedDay, setPickedDay] = useState<Date | null>(null)
  const [pickedTime, setPickedTime] = useState<Date | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())

  useEffect(() => {
    if (reset) {
      setPickedDay(null)
      setPickedTime(null)
      setShowConfirm(false)
    }
  }, [reset])

  const handlePickDay = (day: Date) => {
    if (pickedDay !== day) {
      onDayChange && onDayChange(day)
    }
    logEvent('Selected day')
    setPickedDay(day)
  }
  const handlePickTime = (time: Date) => {
    logEvent('Selected time')
    setPickedTime(time)
    onTimeChange?.(time)
    setShowConfirm(true)
    willStartScheduling(true)
  }

  const handleClosePickDay = () => {
    setPickedDay(null)
    onDayChange && onDayChange(undefined)
  }

  const handleCloseConfirm = () => {
    willStartScheduling(false)
    onTimeChange?.(undefined)
    setShowConfirm(false)
  }

  function findNextDay(currentDay: Date, next: number) {
    const nextDay = {
      start: new Date(addDays(currentDay, next).setHours(0, 0, 0)),
      end: new Date(addDays(currentDay, next).setHours(23, 59, 59)),
    }
    detectNextMonth(nextDay.start)
    return nextDay
  }

  function detectNextMonth(day: Date) {
    if (!isSameMonth(day, selectedMonth)) {
      setSelectedMonth(day)
      onMonthChange?.(day)
    }
  }

  const color = useColorModeValue('primary.500', 'white')

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

    try {
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
              !intervals.some(interval =>
                areIntervalsOverlapping(slot, interval)
              )
          ))
      )
    } catch (error) {
      captureException(error, {
        extra: {
          date,
          timezone: timezone.value,
          slotDurationInMinutes,
        },
      })
      return false
    }

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
  return (
    <PopupWrapper>
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
            monthChanged={onMonthChange}
            pickDay={handlePickDay}
            pickedDay={pickedDay || new Date()}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            timezone={timezone.value}
          />
        </Box>
        {/* isSmallerThan800 isSmallerThan800
        /* true and true == true
        /* true and false == false
        /* false and true == true
        /* false and false = true


        */}
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
              showSelfAvailability={showSelfAvailability}
              timezone={timezone.value}
            />
          )}
        </VStack>
        {showConfirm && (
          <Popup>
            <PopupHeader>
              <HStack mb={0} cursor="pointer" onClick={handleCloseConfirm}>
                <Icon as={FaArrowLeft} size="1.5em" color={color} />
                <Heading size="md" color={color}>
                  Meeting Information
                </Heading>
              </HStack>
            </PopupHeader>

            <ScheduleForm
              onConfirm={onSchedule}
              willStartScheduling={willStartScheduling}
              pickedTime={pickedTime!}
              isSchedulingExternal={isSchedulingExternal}
              isGateValid={isGateValid}
              notificationsSubs={notificationsSubs}
              preferences={preferences}
              meetingProviders={preferences?.meetingProviders}
              selectedType={selectedType}
            />
          </Popup>
        )}
      </HStack>
    </PopupWrapper>
  )
}

export default MeetSlotPicker
