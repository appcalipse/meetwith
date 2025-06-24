import {
  Box,
  Flex,
  Heading,
  HStack,
  Icon,
  useColorModeValue,
  useMediaQuery,
  useToast,
  VStack,
} from '@chakra-ui/react'
import * as Sentry from '@sentry/nextjs'
import {
  ActionMeta,
  chakraComponents,
  Props,
  Select,
  SingleValue,
} from 'chakra-react-select'
import {
  addDays,
  addMinutes,
  addMonths,
  areIntervalsOverlapping,
  eachMinuteOfInterval,
  endOfMonth,
  getDay,
  isAfter,
  isBefore,
  isEqual,
  isFuture,
  isSameDay,
  isSameMonth,
  isToday,
  nextDay,
  setHours,
  setMinutes,
  setSeconds,
  startOfMonth,
  subMonths,
  subSeconds,
} from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'
import React, { useContext, useEffect, useState } from 'react'
import { FaArrowLeft, FaChevronDown, FaGlobe } from 'react-icons/fa'

import Loading from '@/components/Loading'
// TODO: create helper function to merge availabilities from availability block
import MeetingScheduledDialog from '@/components/meeting/MeetingScheduledDialog'
import Calendar from '@/components/MeetSlotPicker/calendar/index'
import { Popup, PopupHeader } from '@/components/MeetSlotPicker/Popup'
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
import { timezones } from '@/utils/date_helper'
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
import {
  getAvailabilitiesForWeekDay,
  getBlockedAvailabilities,
  isSlotAvailable,
} from '@/utils/slots.helper'
import { saveMeetingsScheduled } from '@/utils/storage'
import { getAccountDisplayName } from '@/utils/user_manager'
const SchedulerPicker = () => {
  const [isMobile] = useMediaQuery(['(max-width: 800px)'], {
    ssr: true,
    fallback: false, // return false on the server, and re-evaluate on the client side
  })

  const {
    account,
    selectedType,
    tx,
    schedulingType,
    setSchedulingType,
    lastScheduledMeeting,
    setLastScheduledMeeting,
    hasConnectedCalendar,
    setHasConnectedCalendar,
    notificationsSubs,
    setNotificationSubs,
    isContact,
    setIsContact,
  } = useContext(PublicScheduleContext)
  const currentAccount = useAccountContext()
  const tzs = timezones.map(tz => {
    return {
      value: String(tz.tzCode),
      label: tz.name,
    }
  })
  const slotDurationInMinutes = selectedType?.duration_minutes || 0

  const [timezone, setTimezone] = useState<string>(
    account?.preferences?.timezone ??
      Intl.DateTimeFormat().resolvedOptions().timeZone
  )
  const [blockedDates, setBlockedDates] = useState<Date[]>([])
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
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const [checkingSlots, setCheckingSlots] = useState(false)
  const [checkedSelfSlots, setCheckedSelfSlots] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [busySlots, setBusyslots] = useState([] as Interval[])
  const [selfBusySlots, setSelfBusyslots] = useState([] as Interval[])

  const [isScheduling, setIsScheduling] = useState(false)
  const toast = useToast()

  useEffect(() => {
    const blockedAvailabilities = getBlockedAvailabilities(
      account?.preferences?.availabilities
    )
    // We need to take into consideration 1 month before the beginning of the month
    // and 1 month after the end of the month in the calculation due to Timezone
    // spans be able to be inside one month for one user and in another for other
    // user when we consider first and last days of the month.
    let startDate = subMonths(startOfMonth(currentMonth), 1)
    const endDate = addMonths(endOfMonth(currentMonth), 1)

    const unavailableDate = blockedAvailabilities.reduce((acc, curr) => {
      if (getDay(startDate) === curr.weekday) acc.push(startDate)
      let _nextDay = nextDay(startDate, curr.weekday as Day)
      while (isBefore(_nextDay, endDate)) {
        acc.push(_nextDay)
        _nextDay = nextDay(_nextDay, curr.weekday as Day)
      }
      return acc
    }, [] as Date[])

    if (isBefore(endDate, new Date())) {
      setBlockedDates(unavailableDate)
      return
    }

    if (isAfter(new Date(), startDate) && isBefore(new Date(), endDate)) {
      startDate = new Date()
    }

    let day = startDate
    while (!isAfter(day, endDate)) {
      const _availability = getAvailabilitiesForWeekDay(
        account?.preferences?.availabilities,
        day
      )
      if (_availability.length > 0 && selectedType) {
        const _availableSlots = _availability.reduce((acc, curr) => {
          const gap = selectedType.duration_minutes
          const startDate = setHours(
            setMinutes(setSeconds(day, 0), parseInt(curr.start.split(':')[1])),
            parseInt(curr.start.split(':')[0])
          )
          const endDate = setHours(
            setMinutes(setSeconds(day, 0), parseInt(curr.end.split(':')[1])),
            parseInt(curr.end.split(':')[0])
          )

          let _start = startDate
          let _end = subSeconds(addMinutes(_start, gap), 1)

          while (isBefore(_end, endDate)) {
            if (
              !busySlots.some(
                slot =>
                  !isEqual(slot.start, slot.end) &&
                  areIntervalsOverlapping(
                    {
                      start: _start,
                      end: _end,
                    },
                    {
                      start: slot.start,
                      end: subSeconds(slot.end, 1),
                    }
                  )
              )
            )
              acc.push({
                start: _start,
                end: _end,
              })

            _start = _end
            _end = addMinutes(_start, gap)
          }
          return acc
        }, [] as Interval[])
        if (_availableSlots.length === 0) unavailableDate.push(day)
      }
      day = addDays(day, 1)
    }
    setBlockedDates(unavailableDate)
  }, [currentMonth, selectedType, busySlots, account])

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
  const reset = () => {
    setPickedDay(null)
    setPickedTime(null)
    setShowConfirm(false)
  }
  const updateSelfSlots = async () => {
    if (currentAccount) {
      const monthStart = startOfMonth(currentMonth)
      const monthEnd = endOfMonth(currentMonth)

      try {
        const busySlots = await getBusySlots(
          currentAccount?.address,
          monthStart,
          monthEnd
        )
        setSelfBusyslots(busySlots)
        setCheckedSelfSlots(true)
      } catch (e) {}
    }
  }
  const updateSlots = async () => {
    updateSelfSlots()
    setCheckingSlots(true)
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)

    try {
      const busySlots = await getBusySlots(
        account?.address,
        monthStart,
        monthEnd
      )
      setBusyslots(busySlots)
    } catch (e) {
      Sentry.captureException(e)
      toast({
        title: 'Ops!',
        description: 'Something went wrong :(',
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
      return
    }

    setCheckingSlots(false)
  }

  useEffect(() => {
    updateSlots()
  }, [currentMonth])

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
      Intl.DateTimeFormat().resolvedOptions().timeZone
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
      await updateSlots()
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

  const handlePickDay = (day: Date) => {
    logEvent('Selected day')
    setPickedDay(day)
  }
  const handlePickTime = (time: Date) => {
    logEvent('Selected time')
    setPickedTime(time)
    setShowConfirm(true)
  }

  const handleClosePickDay = () => {
    setPickedDay(null)
  }

  const handleCloseConfirm = () => {
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
      setCurrentMonth(day)
    }
  }

  const color = useColorModeValue('primary.500', 'white')

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
                start: zonedTimeToUtc(date.setHours(0, 0, 0, 0), timezone),
                end: zonedTimeToUtc(date.setHours(23, 59, 59, 59), timezone),
              },
            ]
          } else {
            if (isSameDay(date, addDays(array[index - 1], 1))) {
              return [
                ...acc.slice(0, -1),
                {
                  start: acc[acc.length - 1].start,
                  end: zonedTimeToUtc(date.setHours(23, 59, 59, 59), timezone),
                },
              ]
            } else {
              return [
                ...acc,
                {
                  start: zonedTimeToUtc(date.setHours(0, 0, 0, 0), timezone),
                  end: zonedTimeToUtc(date.setHours(23, 59, 59, 59), timezone),
                },
              ]
            }
          }
        },
        []
      ) ?? []

  const validator = (date: Date) => {
    if (!slotDurationInMinutes) return
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
            !intervals.some(interval => areIntervalsOverlapping(slot, interval))
        ))
    )
  }
  const selfAvailabilityCheck = (slot: Date): boolean => {
    if (!selectedType) return false
    const duration = selectedType?.duration_minutes
    const minAdvanceTime = selectedType?.min_notice_minutes

    return isSlotAvailable(
      duration,
      minAdvanceTime,
      slot,
      selfBusySlots,
      currentAccount?.preferences?.availabilities || [],
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      currentAccount?.preferences?.timezone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone
    )
  }
  const validateSlot = (slot: Date): boolean => {
    if (!selectedType) return false
    return isSlotAvailable(
      selectedType.duration_minutes,
      selectedType.min_notice_minutes,
      slot,
      busySlots,
      account?.preferences?.availabilities || [],
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      account?.preferences?.timezone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone
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
  const _onClose = () => {
    reset()
    setLastScheduledMeeting(undefined)
  }
  return lastScheduledMeeting ? (
    <Flex justify="center">
      <MeetingScheduledDialog
        participants={lastScheduledMeeting!.participants}
        hostAccount={account!}
        scheduleType={schedulingType}
        meeting={lastScheduledMeeting}
        accountNotificationSubs={notificationsSubs}
        hasConnectedCalendar={hasConnectedCalendar}
        isContact={isContact}
        setIsContact={setIsContact}
        reset={_onClose}
      />
    </Flex>
  ) : (
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
      >
        {!showConfirm && (!isMobile || !pickedDay) && (
          <Calendar
            loading={checkingSlots}
            validator={validator}
            monthChanged={setCurrentMonth}
            pickDay={handlePickDay}
            pickedDay={pickedDay || new Date()}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
          />
        )}
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
                validator={validateSlot}
                selfAvailabilityCheck={selfAvailabilityCheck}
                pickTime={handlePickTime}
                showSelfAvailability={checkedSelfSlots}
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
              onConfirm={confirmSchedule}
              pickedTime={pickedTime!}
              isSchedulingExternal={isScheduling}
              notificationsSubs={notificationsSubs}
              preferences={account?.preferences}
              meetingProviders={account?.preferences?.meetingProviders}
              selectedType={selectedType}
            />
          </Popup>
        )}
      </HStack>
    </Box>
  )
}

export default SchedulerPicker
