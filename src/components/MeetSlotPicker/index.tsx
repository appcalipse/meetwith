import {
  Box,
  Flex,
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
  eachMinuteOfInterval,
  format,
  isFuture,
  isSameDay,
  isToday,
  isWithinInterval,
} from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'
import React, { useState } from 'react'
import { FaArrowLeft, FaCalendar, FaClock } from 'react-icons/fa'

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
  onSchedule: (
    scheduleType: SchedulingType,
    startTime: Date,
    guestEmail?: string,
    name?: string,
    content?: string,
    meetingUrl?: string,
    emailToSendReminders?: string
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
  const [pickedDay, setPickedDay] = useState(null as Date | null)
  const [pickedTime, setPickedTime] = useState(null as Date | null)
  const [showPickTime, setShowPickTime] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date())

  React.useEffect(() => {
    if (reset) {
      setPickedDay(null)
      setPickedTime(null)
      setShowPickTime(false)
      setShowConfirm(false)
    }
  }, [reset])

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
    setShowPickTime(false)
    setShowConfirm(true)
    willStartScheduling(true)
  }

  const handleClosePickTime = () => {
    setShowPickTime(false)
  }

  const handleCloseConfirm = () => {
    willStartScheduling(false)
    setShowConfirm(false)
    setShowPickTime(true)
  }

  const color = useColorModeValue('primary.500', 'primary.400')

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
      const startLocalDate = date.setHours(0, 0, 0, 0)
      const endLocalDate = date.setHours(23, 59, 59, 59)
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
      const startLocalDate = date.setHours(0, 0, 0, 0)
      const endLocalDate = date.setHours(23, 59, 59, 59)
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
      {!showPickTime && !showConfirm && (
        <Calendar
          loading={checkingSlots}
          validator={validator}
          monthChanged={onMonthChange}
          pickDay={handlePickDay}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
        />
      )}

      {showPickTime && (
        <Popup>
          <PopupHeader>
            <HStack mb={4} cursor="pointer" onClick={handleClosePickTime}>
              <Icon as={FaArrowLeft} size="1.5em" color={color} />
              <Text ml={3} color={color}>
                Back
              </Text>
            </HStack>
            <HStack alignItems="flex-start">
              <Box mt="4px">
                <FaCalendar />
              </Box>
              <VStack alignItems="flex-start">
                <Text>{format(pickedDay!, 'PPPP')}</Text>
                <Text fontSize="sm">
                  Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </Text>
              </VStack>
            </HStack>
          </PopupHeader>

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
        </Popup>
      )}

      {showConfirm && (
        <Popup>
          <PopupHeader>
            <HStack mb={4} cursor="pointer" onClick={handleCloseConfirm}>
              <Icon as={FaArrowLeft} size="1.5em" color={color} />
              <Text ml={3} color={color}>
                Back
              </Text>
            </HStack>
            <HStack>
              <FaCalendar />
              <Text>{format(pickedDay!, 'PPPP')}</Text>
            </HStack>

            <HStack>
              <FaClock />
              <Text>{format(pickedTime!, 'p')}</Text>
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
    </PopupWrapper>
  )
}

export default MeetSlotPicker
