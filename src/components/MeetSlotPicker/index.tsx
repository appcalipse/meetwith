import {
  Flex,
  Heading,
  HStack,
  Icon,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import {
  chakraComponents,
  Props,
  Select,
  SingleValue,
} from 'chakra-react-select'
import * as ct from 'countries-and-timezones'
import {
  addDays,
  addMinutes,
  areIntervalsOverlapping,
  differenceInDays,
  eachMinuteOfInterval,
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
import { FaChevronDown, FaGlobe } from 'react-icons/fa'
import { FaArrowLeft } from 'react-icons/fa6'
import { ActionMeta } from 'react-select/dist/declarations/src/types'

import { AccountPreferences } from '@/types/Account'
import { MeetingReminders } from '@/types/common'
import { ParticipantInfo } from '@/types/ParticipantInfo'

import {
  MeetingProvider,
  MeetingRepeat,
  SchedulingType,
} from '../../types/Meeting'
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
  selfAvailabilityCheck: (slot: Date) => boolean
  showSelfAvailability: boolean
  slotDurationInMinutes: number
  timeSlotAvailability: (slot: Date) => boolean
  willStartScheduling: (isScheduling: boolean) => void
  isMobile: boolean
}

const timezonesObj = ct.getAllTimezones()
const timezonesKeys = Object.keys(timezonesObj) as Array<
  keyof typeof timezonesObj
>
const _timezones = timezonesKeys
  .map(key => {
    return {
      name: `${String(key)} (GMT${timezonesObj[key].dstOffsetStr})`,
      tzCode: key,
      offset: timezonesObj[key].utcOffset,
    }
  })
  .sort((a, b) => a.offset - b.offset)
const timezones = [..._timezones, { tzCode: 'UTC', name: '(UTC+00:00) UTC' }]
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
  isMobile,
}) => {
  const tzs = timezones.map(tz => {
    return {
      value: String(tz.tzCode),
      label: tz.name,
    }
  })
  const [timezone, setTimezone] = useState<string | null>(
    preferences?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  )
  const [tz, setTz] = useState<SingleValue<{ label: string; value: string }>>(
    tzs.filter(
      val => val.value === Intl.DateTimeFormat().resolvedOptions().timeZone
    )[0] || tzs[0]
  )

  const _onChange = (newValue: unknown, actionMeta: ActionMeta<unknown>) => {
    if (Array.isArray(newValue)) {
      return
    }
    const timezone = newValue as SingleValue<{ label: string; value: string }>
    setTz(timezone)
    setTimezone(
      timezone?.value || Intl.DateTimeFormat().resolvedOptions().timeZone
    )
  }

  const [pickedDay, setPickedDay] = useState<Date | null>(null)
  const [pickedTime, setPickedTime] = useState<Date | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [disablePrev, setDisablePrev] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())

  useEffect(() => {
    if (reset) {
      setPickedDay(null)
      setPickedTime(null)
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
        gap={120}
        flexWrap="wrap"
      >
        {!showConfirm && (!isMobile || !pickedDay) && (
          <Calendar
            loading={checkingSlots}
            validator={validator}
            monthChanged={onMonthChange}
            pickDay={handlePickDay}
            pickedDay={pickedDay || new Date()}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
          />
        )}
        {/* isSmallerThan800 isSmallerThan800
        /* true and true == true
        /* true and false == false
        /* false and true == true
        /* false and false = true


        */}
        {!showConfirm && (!isMobile || pickedDay) && (
          <VStack flex={1} alignItems={{ md: 'flex-start', base: 'center' }}>
            <VStack
              alignItems={{ md: 'flex-start', base: 'center' }}
              width={'100%'}
            >
              <HStack mb={0}>
                {isMobile && !!pickedDay && (
                  <Icon
                    as={FaArrowLeft}
                    onClick={handleClosePickDay}
                    size="1.5em"
                    color={color}
                    cursor="pointer"
                  />
                )}
                <Heading size="md">Select Time</Heading>
              </HStack>
              <Select
                value={tz}
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
              preferences={preferences}
              meetingProviders={preferences?.meetingProviders}
            />
          </Popup>
        )}
      </HStack>
    </PopupWrapper>
  )
}

export default MeetSlotPicker
