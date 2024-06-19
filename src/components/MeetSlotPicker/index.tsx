import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import {
  addDays,
  addMinutes,
  areIntervalsOverlapping,
  differenceInDays,
  eachMinuteOfInterval,
  format,
  isBefore,
  isFuture,
  isSameDay,
  isSameMonth,
  isToday,
  isWithinInterval,
  startOfDay,
} from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'
import React, { useEffect, useState } from 'react'
import { FaArrowRight, FaCalendar, FaClock, FaGlobe } from 'react-icons/fa'
import { FaArrowLeft } from 'react-icons/fa6'

import { AccountPreferences } from '@/types/Account'

import { SchedulingType } from '../../types/Meeting'
import { logEvent } from '../../utils/analytics'
import Loading from '../Loading'
import { ScheduleForm } from '../schedule/schedule-form'
import Calendar from './calendar'
import { Popup, PopupHeader, PopupWrapper } from './Popup'
import TimeSlots from './time-slots'

interface MeetSlotPickerProps {
  availabilityInterval?: Interval
  blockedDates?: Date[]
  checkingSlots: boolean
  isGateValid: boolean
  isSchedulingExternal: boolean
  notificationsSubs?: number
  onDayChange?: (day: Date) => void
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
    title?: string
  ) => Promise<boolean>
  preferences?: AccountPreferences
  reset: boolean
  selfAvailabilityCheck: (slot: Date) => boolean
  showSelfAvailability: boolean
  slotDurationInMinutes: number
  timeSlotAvailability: (slot: Date) => boolean
  willStartScheduling: (isScheduling: boolean) => void
}

const MeetSlotPicker: React.FC<MeetSlotPickerProps> = ({
  availabilityInterval,
  blockedDates,
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
  selfAvailabilityCheck,
  showSelfAvailability,
  slotDurationInMinutes,
  timeSlotAvailability,
  willStartScheduling,
}) => {
  const [pickedDay, setPickedDay] = useState(new Date() as Date | null)
  const [pickedTime, setPickedTime] = useState(null as Date | null)
  const [showPickTime, setShowPickTime] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [disablePrev, setDisablePrev] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date())

  useEffect(() => {
    if (reset) {
      setPickedDay(null)
      setPickedTime(null)
      setShowPickTime(false)
      setShowConfirm(false)
      setDisablePrev(false)
    }
  }, [reset])

  useEffect(() => {
    if (
      pickedDay &&
      differenceInDays(pickedDay, startOfDay(new Date())) === 0
    ) {
      setDisablePrev(true)
    } else {
      setDisablePrev(false)
    }
  }, [pickedDay])

  const handlePickDay = (day: Date) => {
    if (pickedDay !== day) {
      onDayChange && onDayChange(day)
    }
    logEvent('Selected day')
    setPickedDay(day)
    setShowPickTime(true)
  }
  const handlePickTime = (time: Date) => {
    logEvent('Selected time')
    setPickedTime(time)
    onTimeChange?.(time)
    setShowPickTime(false)
    setShowConfirm(true)
    willStartScheduling(true)
  }

  const handleClosePickTime = () => {
    setShowPickTime(false)
  }

  const handleCloseConfirm = () => {
    willStartScheduling(false)
    onTimeChange?.(undefined)
    setShowConfirm(false)
    setShowPickTime(true)
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

  function onPreviousDay() {
    let nextDay: Date | undefined = undefined
    let possibleDay = findNextDay(pickedDay!, -1)
    let i = 1
    while (!nextDay) {
      if (
        blockedIntervals?.some(
          blockedInterval =>
            isWithinInterval(possibleDay.start, blockedInterval) &&
            isWithinInterval(possibleDay.end, blockedInterval)
        )
      ) {
        i++
        possibleDay = findNextDay(pickedDay!, -i)
      } else {
        nextDay = new Date(possibleDay.start)
      }
    }

    if (isBefore(nextDay, startOfDay(new Date()))) return

    handlePickDay(nextDay)
  }

  function onNextDay() {
    setDisablePrev(false)
    let nextDay: Date | undefined = undefined
    let possibleDay = findNextDay(pickedDay!, 1)
    let i = 1
    while (!nextDay) {
      if (
        blockedIntervals?.some(
          blockedInterval =>
            isWithinInterval(possibleDay.start, blockedInterval) &&
            isWithinInterval(possibleDay.end, blockedInterval)
        )
      ) {
        i++
        possibleDay = findNextDay(pickedDay!, i)
      } else {
        nextDay = new Date(possibleDay.start)
      }
    }

    handlePickDay(nextDay)
  }

  const color = useColorModeValue('primary.500', 'white')

  const timeZone =
    preferences?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone

  const blockedIntervals =
    blockedDates
      ?.sort((a, b) => a.getTime() - b.getTime())
      ?.reduce(
        (
          acc: {
            start: Date
            end: Date
          }[],
          date,
          index,
          array
        ) => {
          if (acc.length === 0) {
            return [
              {
                start: zonedTimeToUtc(date.setHours(0, 0, 0, 0), timeZone),
                end: zonedTimeToUtc(date.setHours(23, 59, 59, 59), timeZone),
              },
            ]
          } else {
            if (isSameDay(date, addDays(array[index - 1], 1))) {
              return [
                ...acc.slice(0, -1),
                {
                  start: acc[acc.length - 1].start,
                  end: zonedTimeToUtc(date.setHours(23, 59, 59, 59), timeZone),
                },
              ]
            } else {
              return [
                ...acc,
                {
                  start: zonedTimeToUtc(date.setHours(0, 0, 0, 0), timeZone),
                  end: zonedTimeToUtc(date.setHours(23, 59, 59, 59), timeZone),
                },
              ]
            }
          }
        },
        []
      ) ?? []

  let validator: (date: Date) => boolean
  if (availabilityInterval) {
    validator = (date: Date) => {
      const startLocalDate = new Date(date)
      startLocalDate.setHours(0, 0, 0, 0)

      const endLocalDate = new Date(date)
      endLocalDate.setHours(23, 59, 59, 59)

      const slots = eachMinuteOfInterval(
        { start: startLocalDate, end: endLocalDate },
        { step: slotDurationInMinutes }
      ).map(s => ({
        start: s,
        end: addMinutes(s, slotDurationInMinutes),
      }))

      const intervals = blockedIntervals?.filter(interval =>
        slots.some(slot => areIntervalsOverlapping(slot, interval))
      )

      return (
        (isFuture(date) || isToday(date)) &&
        (isWithinInterval(date, availabilityInterval) ||
          isSameDay(date, availabilityInterval.start) ||
          isSameDay(date, availabilityInterval.end)) &&
        (intervals?.length === 0 ||
          slots.some(
            slot =>
              !intervals.some(interval =>
                areIntervalsOverlapping(slot, interval)
              )
          ))
      )
    }
  } else {
    validator = (date: Date) => {
      const startLocalDate = new Date(date)
      startLocalDate.setHours(0, 0, 0, 0)

      const endLocalDate = new Date(date)
      endLocalDate.setHours(23, 59, 59, 59)

      const slots = eachMinuteOfInterval(
        { start: startLocalDate, end: endLocalDate },
        { step: slotDurationInMinutes }
      ).map(s => ({
        start: s,
        end: addMinutes(s, slotDurationInMinutes),
      }))

      const intervals = blockedIntervals?.filter(interval =>
        slots.some(slot => areIntervalsOverlapping(slot, interval))
      )

      return (
        (isFuture(date) || isToday(date)) &&
        (intervals?.length === 0 ||
          slots.some(
            slot =>
              !intervals.some(interval =>
                areIntervalsOverlapping(slot, interval)
              )
          ))
      )
    }
  }

  return (
    <PopupWrapper>
      <HStack
        width="100%"
        justifyContent="space-between"
        alignItems="flex-start"
        gap={120}
        flexWrap="wrap"
      >
        {!showConfirm && (
          <Calendar
            loading={checkingSlots}
            validator={validator}
            monthChanged={onMonthChange}
            pickDay={handlePickDay}
            pickedDay={pickedDay}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
          />
        )}
        {!showConfirm && (
          <VStack flex={1} alignItems="flex-start">
            <VStack alignItems="start">
              <Heading size="md">Select Time</Heading>
              <HStack alignItems="center" mt={10} mb={3}>
                <FaGlobe size={24} />
                <Text align="center" fontSize="base" fontWeight="500">
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </Text>
              </HStack>
            </VStack>
            {checkingSlots ? (
              <Flex m={8} justifyContent="center">
                <Loading label="Checking availability" />
              </Flex>
            ) : (
              <TimeSlots
                pickedDay={pickedDay}
                slotSizeMinutes={slotDurationInMinutes}
                validator={timeSlotAvailability}
                selfAvailabilityCheck={selfAvailabilityCheck}
                pickTime={handlePickTime}
                showSelfAvailability={showSelfAvailability}
              />
            )}
          </VStack>
        )}

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
            />
          </Popup>
        )}
      </HStack>
    </PopupWrapper>
  )
}

export default MeetSlotPicker
