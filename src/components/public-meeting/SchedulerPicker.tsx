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
import { chakraComponents, Props, Select } from 'chakra-react-select'
// TODO: Move all date logic to luxon
import {
  addMinutes,
  addMonths,
  areIntervalsOverlapping,
  eachMinuteOfInterval,
  endOfMonth,
  Interval,
  isAfter,
  isSameDay,
  isSameMonth,
  startOfMonth,
} from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'
import { DateTime } from 'luxon'
import React, { useContext, useEffect, useState } from 'react'
import {
  FaArrowLeft,
  FaCalendar,
  FaChevronDown,
  FaClock,
  FaGlobe,
} from 'react-icons/fa'

import Loading from '@/components/Loading'
// TODO: create helper function to merge availabilities from availability block
import Calendar from '@/components/MeetSlotPicker/calendar/index'
import TimeSlots from '@/components/MeetSlotPicker/TimeSlots'
import { PublicScheduleContext } from '@/components/public-meeting'
import { ScheduleForm } from '@/components/schedule/schedule-form'
import useAccountContext from '@/hooks/useAccountContext'
import { AccountNotifications } from '@/types/AccountNotifications'
import { ConnectedCalendarCore } from '@/types/CalendarConnections'
import { MeetingReminders } from '@/types/common'
import {
  MeetingProvider,
  MeetingRepeat,
  SchedulingType,
  TimeSlotSource,
} from '@/types/Meeting'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import { logEvent } from '@/utils/analytics'
import {
  doesContactExist,
  getBusySlots,
  getNotificationSubscriptions,
  listConnectedCalendars,
} from '@/utils/api_helper'
import { scheduleMeeting } from '@/utils/calendar_manager'
import { Option } from '@/utils/constants/select'
import { parseMonthAvailabilitiesToDate, timezones } from '@/utils/date_helper'
import {
  AllMeetingSlotsUsedError,
  GateConditionNotValidError,
  GoogleServiceUnavailable,
  Huddle01ServiceUnavailable,
  InvalidURL,
  MeetingCreationError,
  MeetingWithYourselfError,
  MultipleSchedulersError,
  TimeNotAvailableError,
  TransactionIsRequired,
  UrlCreationError,
  ZoomServiceUnavailable,
} from '@/utils/errors'
import { saveMeetingsScheduled } from '@/utils/storage'
import { getAccountDisplayName } from '@/utils/user_manager'
const tzs = timezones.map(tz => {
  return {
    value: String(tz.tzCode),
    label: tz.name,
  }
})
const SchedulerPicker = () => {
  const {
    account,
    selectedType,
    tx,
    setSchedulingType,
    setLastScheduledMeeting,
    setHasConnectedCalendar,
    notificationsSubs,
    setNotificationSubs,
    setIsContact,
  } = useContext(PublicScheduleContext)

  const currentAccount = useAccountContext()
  const slotDurationInMinutes = selectedType?.duration_minutes || 0
  const [timezone, setTimezone] = useState<Option<string>>(
    tzs.find(
      val =>
        val.value ===
        (currentAccount?.preferences?.timezone ||
          Intl.DateTimeFormat().resolvedOptions().timeZone)
    ) || tzs[0]
  )
  const toast = useToast()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [availableSlots, setAvailableSlots] = useState<Interval[]>([])
  const [selfAvailableSlots, setSelfAvailableSlots] = useState<Interval[]>([])
  const [checkingSlots, setCheckingSlots] = useState(false)
  const [checkedSelfSlots, setCheckedSelfSlots] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)
  const [pickedDay, setPickedDay] = useState<Date | null>(null)
  const [pickedTime, setPickedTime] = useState<Date | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const color = useColorModeValue('primary.500', 'white')
  const [busySlots, setBusySlots] = useState<Interval[]>([])
  const [selfBusySlots, setSelfBusySlots] = useState<Interval[]>([])

  const [cachedRange, setCachedRange] = useState<{
    startDate: Date
    endDate: Date
  } | null>(null)
  const getSelfAvailableSlots = async () => {
    if (currentAccount) {
      const startDate = startOfMonth(currentMonth)
      const endDate = addMonths(endOfMonth(currentMonth), 2)
      let busySlots: Interval[] = []
      try {
        busySlots = await getBusySlots(
          currentAccount?.address,
          startDate,
          endDate
        )
      } catch (error) {}
      const availabilities = parseMonthAvailabilitiesToDate(
        currentAccount?.preferences?.availabilities || [],
        startDate,
        endDate,
        currentAccount?.preferences?.timezone || 'UTC'
      )
      setSelfAvailableSlots(availabilities)
      setSelfBusySlots(busySlots)
      setCheckedSelfSlots(true)
    }
  }
  const getAvailableSlots = async (skipCache = false) => {
    if (
      !skipCache &&
      cachedRange &&
      currentMonth >= cachedRange.startDate &&
      currentMonth <= cachedRange.endDate
    ) {
      return
    }
    getSelfAvailableSlots()
    setCheckingSlots(true)
    const startDate = startOfMonth(currentMonth)
    const endDate = addMonths(endOfMonth(currentMonth), 2)
    let busySlots: Interval[] = []

    try {
      busySlots = await getBusySlots(account?.address, startDate, endDate)
    } catch (error) {}
    const availabilities =
      selectedType?.availabilities?.flatMap(availability =>
        parseMonthAvailabilitiesToDate(
          availability.weekly_availability || [],
          startDate,
          endDate,
          availability.timezone || account?.preferences?.timezone || 'UTC'
        )
      ) || []

    // Deduplicate overlapping time slots
    const deduplicatedAvailabilities = availabilities.reduce<Interval[]>(
      (acc, current) => {
        const hasOverlap = acc.some(existing =>
          areIntervalsOverlapping(current, existing, { inclusive: true })
        )
        if (!hasOverlap) {
          acc.push(current)
        }
        return acc
      },
      []
    )

    setBusySlots(busySlots)
    setAvailableSlots(deduplicatedAvailabilities)
    setCachedRange({ startDate, endDate })
    setCheckingSlots(false)
  }
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
    handleContactCheck()
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
  const minTime = selectedType?.min_notice_minutes || 0
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
    const minScheduleTime = DateTime.now()
      .setZone(timezone.value)
      .plus({ minutes: minTime })
      .toJSDate()
    const slots = eachMinuteOfInterval(
      { start: startLocalDate, end: endLocalDate },
      { step: slotDurationInMinutes }
    ).map(s => ({
      start: s,
      end: addMinutes(s, slotDurationInMinutes),
    }))

    const intervals = availableSlots.filter(
      slot =>
        isSameMonth(slot.start, date) &&
        isSameDay(slot.start, date) &&
        isAfter(minScheduleTime, slot.start)
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
  // TODO: Move this check to the backend
  const fetchNotificationSubscriptions = async () => {
    let subs: AccountNotifications | null = null
    let connectedCalendars: ConnectedCalendarCore[] = []
    subs = (await getNotificationSubscriptions()) || {}
    connectedCalendars = (await listConnectedCalendars()) || []

    const validCals = connectedCalendars
      .filter(cal => cal.provider !== TimeSlotSource.MWW)
      .some(cal => cal.calendars.some(_cal => _cal.enabled))

    setNotificationSubs(subs.notification_types?.length)
    setHasConnectedCalendar(validCals)
  }

  const confirmSchedule = async (
    scheduleType: SchedulingType,
    startTime: Date,
    guestEmail?: string,
    name?: string,
    content?: string,
    meetingUrl?: string,
    emailToSendReminders?: string,
    title?: string,
    otherParticipants?: Array<ParticipantInfo>,
    meetingProvider?: MeetingProvider,
    meetingReminders?: Array<MeetingReminders>,
    meetingRepeat?: MeetingRepeat
  ): Promise<boolean> => {
    if (!selectedType) return false
    setIsScheduling(true)

    const start = zonedTimeToUtc(
      startTime,
      timezone.value || Intl.DateTimeFormat().resolvedOptions().timeZone
    )
    const end = addMinutes(new Date(start), selectedType.duration_minutes)

    if (scheduleType !== SchedulingType.GUEST && !name) {
      name = getAccountDisplayName(currentAccount!)
    }

    const participants: ParticipantInfo[] = [...(otherParticipants || [])]

    participants.push({
      account_address: account!.address,
      name: '',
      type: ParticipantType.Owner,
      status: ParticipationStatus.Accepted,
      slot_id: '',
      meeting_id: '',
    })

    setSchedulingType(scheduleType)

    participants.push({
      account_address: currentAccount?.address,
      ...(scheduleType === SchedulingType.GUEST && {
        guest_email: guestEmail!,
      }),
      name,
      type: ParticipantType.Scheduler,
      status: ParticipationStatus.Accepted,
      slot_id: '',
      meeting_id: '',
    })

    try {
      const meeting = await scheduleMeeting(
        false,
        scheduleType,
        selectedType?.id,
        start,
        end,
        participants,
        meetingProvider || MeetingProvider.HUDDLE,
        currentAccount,
        content,
        meetingUrl,
        emailToSendReminders,
        title,
        meetingReminders,
        meetingRepeat,
        undefined,
        tx
      )
      await getAvailableSlots(true)
      currentAccount && saveMeetingsScheduled(currentAccount!.address)
      currentAccount && (await fetchNotificationSubscriptions())

      setLastScheduledMeeting(meeting)
      logEvent('Scheduled a meeting', {
        fromPublicCalendar: true,
        participantsSize: meeting.participants.length,
      })
      setIsScheduling(false)
      return true
    } catch (e) {
      if (e instanceof MeetingWithYourselfError) {
        toast({
          title: "Ops! Can't do that",
          description: e.message,
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof TimeNotAvailableError) {
        toast({
          title: 'Failed to schedule meeting',
          description: 'The selected time is not available anymore',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof GateConditionNotValidError) {
        toast({
          title: 'Failed to schedule meeting',
          description: e.message,
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof MeetingCreationError) {
        toast({
          title: 'Failed to schedule meeting',
          description:
            'There was an issue scheduling your meeting. Please get in touch with us through support@meetwithwallet.xyz',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof MultipleSchedulersError) {
        toast({
          title: 'Failed to schedule meeting',
          description: 'A meeting must have only one scheduler',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof InvalidURL) {
        toast({
          title: 'Failed to schedule meeting',
          description: 'Please provide a valid url/link for your meeting.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof Huddle01ServiceUnavailable) {
        toast({
          title: 'Failed to create video meeting',
          description:
            'Huddle01 seems to be offline. Please select a custom meeting link, or try again.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof ZoomServiceUnavailable) {
        toast({
          title: 'Failed to create video meeting',
          description:
            'Zoom seems to be offline. Please select a different meeting location, or try again.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof GoogleServiceUnavailable) {
        toast({
          title: 'Failed to create video meeting',
          description:
            'Google seems to be offline. Please select a different meeting location, or try again.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof UrlCreationError) {
        toast({
          title: 'Failed to schedule meeting',
          description:
            'There was an issue generating a meeting url for your meeting. try using a different location',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof AllMeetingSlotsUsedError) {
        toast({
          title: 'Failed to schedule meeting',
          description:
            'You’ve used all your available meeting slots. Please purchase a new slot to schedule a meeting.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof TransactionIsRequired) {
        toast({
          title: 'Failed to schedule meeting',
          description:
            'This meeting type requires payment before scheduling. Please purchase a slot to continue.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      }
    }
    setIsScheduling(false)
    return false
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
            <Text>{`${formattedDate}, ${timeDuration}`}</Text>
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
            onConfirm={confirmSchedule}
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
