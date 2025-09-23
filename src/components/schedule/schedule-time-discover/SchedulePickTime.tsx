/* eslint-disable tailwindcss/no-custom-classname */
import { InfoIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  HStack,
  IconButton,
  Select as ChakraSelect,
  SlideFade,
  Text,
  useBreakpointValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Select, SingleValue } from 'chakra-react-select'
import { addDays, isSameMonth } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { DateTime, Interval } from 'luxon'
import { useRouter } from 'next/router'
import React, { useEffect, useMemo, useState } from 'react'
import {
  FaArrowRight,
  FaChevronLeft,
  FaChevronRight,
  FaShare,
} from 'react-icons/fa'
import { FaAnglesRight } from 'react-icons/fa6'
import { MdShare } from 'react-icons/md'

import Loading from '@/components/Loading'
import InfoTooltip from '@/components/profile/components/Tooltip'
import useAccountContext from '@/hooks/useAccountContext'
import { useDebounceCallback } from '@/hooks/useDebounceCallback'
import useSlotsWithAvailability from '@/hooks/useSlotsWithAvailability'
import {
  Page,
  useScheduleNavigation,
} from '@/providers/schedule/NavigationContext'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'
import { useParticipantPermissions } from '@/providers/schedule/PermissionsContext'
import { useScheduleState } from '@/providers/schedule/ScheduleContext'
import { useScheduleTimeDiscover } from '@/providers/schedule/ScheduleTimeDiscoverContext'
import {
  QuickPollBySlugResponse,
  QuickPollParticipantType,
} from '@/types/QuickPoll'
import {
  fetchBusySlotsRawForMultipleAccounts,
  getExistingAccounts,
} from '@/utils/api_helper'
import { durationToHumanReadable } from '@/utils/calendar_manager'
import { DEFAULT_GROUP_SCHEDULING_DURATION } from '@/utils/constants/schedule'
import { customSelectComponents, Option } from '@/utils/constants/select'
import { parseMonthAvailabilitiesToDate, timezones } from '@/utils/date_helper'
import { handleApiError } from '@/utils/error_helper'
import { deduplicateArray } from '@/utils/generic_utils'
import {
  createMockMeetingMembers,
  generateQuickPollBestSlots,
  processPollParticipantAvailabilities,
} from '@/utils/quickpoll_helper'
import { getMergedParticipants } from '@/utils/schedule.helper'
import { suggestBestSlots } from '@/utils/slots.helper'

import QuickPollTimeSlot from './QuickPollTimeSlot'
import ScheduleTimeSlot from './ScheduleTimeSlot'

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
      return 'yellow.600'
    case State.SOME_AVAILABLE:
      return 'yellow.100'
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

export type Dates = {
  date: Date
  slots: Array<Interval<true>>
}

interface ISchedulePickTimeProps {
  openParticipantModal: () => void
  isQuickPoll?: boolean
  pollData?: QuickPollBySlugResponse
  onSaveAvailability?: () => void
  onSharePoll?: () => void
  onImportCalendar?: () => void
  isEditingAvailability?: boolean
  isSavingAvailability?: boolean
  isRefreshingAvailabilities?: boolean
}
export function SchedulePickTime({
  openParticipantModal,
  isQuickPoll,
  pollData,
  onSaveAvailability,
  onSharePoll,
  onImportCalendar,
  isEditingAvailability,
  isSavingAvailability,
  isRefreshingAvailabilities,
}: ISchedulePickTimeProps) {
  const router = useRouter()
  const {
    timezone,
    setTimezone,
    currentSelectedDate,
    setPickedTime,
    setCurrentSelectedDate,
    pickedTime,
    duration,
    setDuration,
    isScheduling,
  } = useScheduleState()
  const { canEditMeetingDetails, isUpdatingMeeting } =
    useParticipantPermissions()
  const currentAccount = useAccountContext()
  const { currentGuestEmail } = useScheduleTimeDiscover()

  const isHost = useMemo(() => {
    if (!isQuickPoll || !pollData || !currentAccount) return false

    return pollData.poll.participants.some(
      p =>
        p.account_address === currentAccount.address &&
        p.participant_type === QuickPollParticipantType.SCHEDULER
    )
  }, [isQuickPoll, pollData, currentAccount])

  const isSchedulingIntent =
    router.query.intent === 'schedule' ||
    (isQuickPoll && isHost && !router.query.intent)
  const isEditAvailabilityIntent =
    router.query.intent === 'edit_availability' ||
    (isQuickPoll && !isHost && !router.query.intent)

  const [suggestedTimes, setSuggestedTimes] = useState<Interval<true>[]>([])
  const toast = useToast()
  const [isBreakpointResolved, setIsBreakpointResolved] = useState(false)
  const SLOT_LENGTH =
    useBreakpointValue({ base: 3, md: 5, lg: 7 }, { ssr: true }) ?? 3

  useEffect(() => {
    // Only resolve after client-side rendering
    const timer = setTimeout(() => setIsBreakpointResolved(true), 100)
    return () => clearTimeout(timer)
  }, [])
  const {
    groupAvailability,
    meetingMembers,
    setMeetingMembers,
    participants,
    groups,
  } = useParticipants()
  const { handlePageSwitch, inviteModalOpen } = useScheduleNavigation()

  const [isLoading, setIsLoading] = useState(true)

  const isDisplayLoading = isLoading || isRefreshingAvailabilities
  const [availableSlots, setAvailableSlots] = useState<
    Map<string, Interval<true>[]>
  >(new Map())
  const [busySlots, setBusySlots] = useState<Map<string, Interval<true>[]>>(
    new Map()
  )
  const availabilityAddresses = useMemo(() => {
    if (isQuickPoll && pollData) {
      const visibleParticipants = new Set<string>()
      Object.values(groupAvailability)
        .flat()
        .forEach(addr => {
          visibleParticipants.add(addr.toLowerCase())
        })

      return pollData.poll.participants
        .filter(
          p => (p.account_address || p.guest_email) && p.available_slots?.length
        )
        .map(
          p =>
            (p.account_address?.toLowerCase() || p.guest_email?.toLowerCase())!
        )
        .filter(addr => visibleParticipants.has(addr))
    }

    const keys = Object.keys(groupAvailability)
    const participantsSet = new Set<string>()
    for (const key of keys) {
      const allGroupParticipants = groupAvailability[key] || []
      for (const participant of allGroupParticipants) {
        participantsSet.add(participant)
      }
    }
    return Array.from(participantsSet)
  }, [isQuickPoll, pollData, groupAvailability])

  const getEmptySlots = (
    time: Date,
    scheduleDuration = duration
  ): Array<Interval<true>> => {
    const slots: Array<Interval<true>> = []
    const slotsPerHour = 60 / (scheduleDuration || 30)
    const totalSlots = 24 * slotsPerHour

    for (let i = 0; i < totalSlots; i++) {
      const minutesFromStart = i * (scheduleDuration || 30)
      const start = DateTime.fromJSDate(time)
        .setZone(timezone)
        .startOf('day')
        .plus({ minutes: minutesFromStart })
      const slot = Interval.after(start, { minute: scheduleDuration || 30 })
      if (slot.isValid) slots.push(slot)
    }
    return slots
  }
  const months = useMemo(() => {
    const monthsArray = []
    let currentDateInTimezone = DateTime.now().setZone(timezone)
    while (monthsArray.length < 12) {
      monthsArray.push({
        value: String(currentDateInTimezone.month),
        label: currentDateInTimezone.toFormat('MMMM yyyy'),
      })
      currentDateInTimezone = currentDateInTimezone.plus({ months: 1 })
    }
    return monthsArray
  }, [currentSelectedDate.getFullYear(), timezone])
  const [dates, setDates] = useState<Array<Dates>>([])
  const datesSlotsWithAvailability = useSlotsWithAvailability(
    dates,
    busySlots,
    availableSlots,
    meetingMembers,
    availabilityAddresses,
    timezone
  )
  const [monthValue, setMonthValue] = useState<
    SingleValue<{ label: string; value: string }>
  >({
    value: String(DateTime.now().setZone(timezone).month),
    label: DateTime.now().setZone(timezone).toFormat('MMMM yyyy'),
  })

  const _onChangeMonth = (newValue: unknown, newMonth?: Date) => {
    if (Array.isArray(newValue)) {
      return
    }
    const month = newValue as SingleValue<{ label: string; value: string }>
    setMonthValue(month)
    if (!month?.value) return
    if (!newMonth) {
      const year = month.label.split(' ')[1]
      setCurrentSelectedDate(
        DateTime.now()
          .set({ month: Number(month.value), day: 1, year: Number(year) })
          .toJSDate()
      )
    }
  }
  const _onChangeDuration = (newValue: unknown) => {
    if (Array.isArray(newValue)) {
      return
    }
    const duration = newValue as Option<number, string>
    setDuration(duration?.value ? Number(duration.value) : 30)
  }

  const tzOptions = useMemo(
    () =>
      timezones.map(tz => ({
        value: tz.tzCode,
        label: tz.name,
      })),
    []
  )

  const [tz, setTz] = useState<SingleValue<{ label: string; value: string }>>(
    tzOptions.filter(val => val.value === timezone)[0] || tzOptions[0]
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
  const getDates = (scheduleDuration = duration) => {
    const days = Array.from({ length: SLOT_LENGTH }, (v, k) => k)
      .map(k => addDays(currentSelectedDate, k))
      .filter(val =>
        isSameMonth(
          val,
          DateTime.fromJSDate(currentSelectedDate)
            .setZone(timezone)
            .startOf('month')
            .toJSDate()
        )
      )
    return days.map(date => {
      const slots = getEmptySlots(date, scheduleDuration)
      date = DateTime.fromJSDate(date)
        .setZone(timezone)
        .startOf('day')
        .toJSDate()

      return {
        date,
        slots,
      }
    })
  }

  async function handleSlotLoad() {
    if (!isBreakpointResolved) return
    setIsLoading(true)
    try {
      setAvailableSlots(new Map())
      setBusySlots(new Map())
      const monthStart = DateTime.fromJSDate(currentSelectedDate)
        .setZone(timezone)
        .startOf('month')
        .toJSDate()
      const monthEnd = DateTime.fromJSDate(currentSelectedDate)
        .setZone(timezone)
        .endOf('month')
        .toJSDate()

      if (isQuickPoll && pollData) {
        const availableSlotsMap = processPollParticipantAvailabilities(
          pollData,
          groupAvailability,
          monthStart,
          monthEnd,
          timezone,
          currentAccount,
          isHost,
          currentGuestEmail
        )

        const mockMeetingMembers = createMockMeetingMembers(
          pollData,
          currentAccount,
          isHost,
          currentGuestEmail
        )

        const suggestedSlots = generateQuickPollBestSlots(
          monthStart,
          monthEnd,
          duration,
          timezone,
          availableSlotsMap
        )

        setAvailableSlots(availableSlotsMap)
        setBusySlots(new Map())
        setDates(getDates(duration))
        setSuggestedTimes(suggestedSlots)
        setMeetingMembers(mockMeetingMembers)
        setIsLoading(false)
        return
      }

      const accounts = deduplicateArray(Object.values(groupAvailability).flat())
      const allParticipants = getMergedParticipants(
        participants,
        groups,
        groupAvailability,
        undefined
      )
        .map(val => val.account_address)
        .concat([currentAccount?.address]) as string[]
      const [busySlots, meetingMembers] = await Promise.all([
        fetchBusySlotsRawForMultipleAccounts(
          accounts,
          monthStart,
          monthEnd
        ).then(busySlots =>
          busySlots.map(busySlot => ({
            account_address: busySlot.account_address,
            interval: Interval.fromDateTimes(
              new Date(busySlot.start),
              new Date(busySlot.end)
            ),
          }))
        ),
        getExistingAccounts(deduplicateArray(allParticipants)),
      ])
      const accountBusySlots = accounts.map(account => {
        return busySlots.filter(slot => slot.account_address === account)
      })
      const availableSlotsMap: Map<string, Interval[]> = new Map<
        string,
        Interval[]
      >()
      for (const memberAccount of meetingMembers) {
        if (!memberAccount.address) continue
        const availabilities = parseMonthAvailabilitiesToDate(
          memberAccount?.preferences?.availabilities || [],
          monthStart,
          monthEnd,
          memberAccount?.preferences?.timezone || 'UTC'
        )
        availableSlotsMap.set(
          memberAccount.address.toLowerCase(),
          availabilities
        )
      }
      const busySlotsMap: Map<string, Interval[]> = new Map()
      for (const account of accountBusySlots) {
        const busySlots = account.map(slot => {
          return slot.interval
        })
        busySlotsMap.set(
          account?.[0]?.account_address?.toLowerCase(),
          busySlots
        )
      }
      const suggestedSlots = suggestBestSlots(
        monthStart,
        duration,
        monthEnd,
        timezone,
        busySlots.map(slot => slot.interval).filter(slot => slot.isValid),
        meetingMembers
      )

      setBusySlots(busySlotsMap)
      setMeetingMembers(meetingMembers)
      setAvailableSlots(availableSlotsMap)
      setDates(getDates(duration))
      setSuggestedTimes(suggestedSlots)
    } catch (error: unknown) {
      handleApiError('Error merging availabilities', error)
    } finally {
      setIsLoading(false)
    }
  }
  const debouncedHandleSlotLoad = useDebounceCallback(handleSlotLoad, 300)

  useEffect(() => {
    if (inviteModalOpen) return
    debouncedHandleSlotLoad()
  }, [
    groupAvailability,
    currentSelectedDate.getMonth(),
    duration,
    inviteModalOpen,
    isBreakpointResolved,
    isQuickPoll,
    pollData,
    isRefreshingAvailabilities,
  ])
  useEffect(() => {
    handleSlotLoad()
  }, [SLOT_LENGTH])
  useEffect(() => {
    setDates(getDates())
  }, [currentSelectedDate, timezone, SLOT_LENGTH])
  const handleScheduledTimeBack = () => {
    const currentDate = DateTime.fromJSDate(currentSelectedDate)
      .setZone(timezone)
      .startOf('day')
    let newDate = currentDate.minus({ days: SLOT_LENGTH })
    const differenceInDays = currentDate
      .diff(currentDate.startOf('month'), 'days')
      .toObject().days
    if (differenceInDays && differenceInDays < SLOT_LENGTH) {
      newDate = currentDate.startOf('month')
    }
    if (!newDate.hasSame(currentDate, 'month')) {
      newDate = newDate.endOf('month').startOf('week')
      _onChangeMonth(
        {
          label: `${newDate.toFormat('MMMM yyyy')}`,
          value: String(newDate.month),
        },
        newDate.toJSDate()
      )
    }
    setCurrentSelectedDate(newDate.toJSDate())
  }
  const handleScheduledTimeNext = () => {
    const currentDate = DateTime.fromJSDate(currentSelectedDate)
      .setZone(timezone)
      .startOf('day')
    let newDate = currentDate.plus({ days: SLOT_LENGTH })
    if (!newDate.hasSame(currentDate, 'month')) {
      newDate = newDate.startOf('month')
      _onChangeMonth(
        {
          label: `${newDate.toFormat('MMMM yyyy')}`,
          value: String(newDate.month),
        },
        newDate.toJSDate()
      )
    }

    setCurrentSelectedDate(newDate.toJSDate())
  }
  const HOURS_SLOTS = useMemo(() => {
    const slots = getEmptySlots(new Date(), duration >= 45 ? duration : 60)
    return slots.map(val => {
      const zonedTime = val.start.setZone(timezone)
      return zonedTime.toFormat(zonedTime.hour < 12 ? 'HH:mm a' : 'hh:mm a')
    })
  }, [duration, timezone])

  const isBackDisabled = useMemo(() => {
    const selectedDate =
      DateTime.fromJSDate(currentSelectedDate).setZone(timezone)
    const currentDate = DateTime.now().setZone(timezone)
    return selectedDate < currentDate || isLoading
  }, [currentSelectedDate, timezone, isLoading])
  const durationOptions = useMemo(
    () =>
      DEFAULT_GROUP_SCHEDULING_DURATION.map(type => ({
        value: type.duration,
        label: durationToHumanReadable(type.duration),
      })),
    []
  )
  const handleJumpToBestSlot = () => {
    if (suggestedTimes.length === 0) {
      toast({
        title: 'No suggested slots available',
        description:
          'There are no available time slots that fit all participants schedules in the selected month. Please try changing the month or duration.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
        position: 'top',
      })
      return
    }
    const bestSlot = suggestedTimes[0]
    setPickedTime(bestSlot.start.toJSDate())

    if (isQuickPoll && pollData) {
      // For quickpolls, navigate to the scheduling screen with poll details and selected time
      const selectedTimeISO = bestSlot.start.toISO()
      router.push(
        `/dashboard/schedule?pollId=${
          pollData.poll.id
        }&intent=schedule_from_poll&selectedTime=${encodeURIComponent(
          selectedTimeISO
        )}`
      )
    } else {
      handlePageSwitch(Page.SCHEDULE_DETAILS)
    }
  }

  const handleTimeSelection = (time: Date) => {
    React.startTransition(() => {
      setPickedTime(time)
    })

    if (isQuickPoll && isHost && isSchedulingIntent) {
      const selectedTimeISO = DateTime.fromJSDate(time).toISO()
      if (selectedTimeISO && pollData) {
        const url = `/dashboard/schedule?pollId=${
          pollData.poll.id
        }&intent=schedule_from_poll&selectedTime=${encodeURIComponent(
          selectedTimeISO
        )}`
        router.push(url)
      }
    } else if (!isQuickPoll) {
      handlePageSwitch(Page.SCHEDULE_DETAILS)
    }
  }

  return (
    <Tooltip.Provider delayDuration={400}>
      <VStack gap={4} w="100%">
        <Flex
          w="100%"
          alignItems={{ lg: 'flex-end' }}
          flexDir={'row'}
          flexWrap="wrap"
          gap={4}
          zIndex={2}
        >
          {isQuickPoll && onSaveAvailability && isEditAvailabilityIntent && (
            <Button
              variant="outline"
              colorScheme="primary"
              onClick={onSaveAvailability}
              px="16px"
              py="8px"
              fontSize="16px"
              fontWeight="700"
              borderRadius="8px"
              width="230px"
              isLoading={isSavingAvailability}
              loadingText="Saving..."
              isDisabled={isSavingAvailability}
            >
              {isEditingAvailability
                ? 'Save availability'
                : 'Edit availability'}
            </Button>
          )}
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
              options={tzOptions}
              components={customSelectComponents}
              chakraStyles={{
                container: provided => ({
                  ...provided,
                  borderColor: 'input-border',
                  bg: 'select-bg',
                }),
              }}
            />
          </VStack>
          <VStack
            gap={2}
            alignItems={'flex-start'}
            width="fit-content"
            minW={'10px'}
          >
            <Heading fontSize="16px">Month</Heading>

            <Select
              value={monthValue}
              colorScheme="primary"
              onChange={newValue => _onChangeMonth(newValue)}
              className="noLeftBorder timezone-select"
              options={months}
              components={customSelectComponents}
              chakraStyles={{
                container: provided => ({
                  ...provided,
                  borderColor: 'input-border',
                  bg: 'select-bg',
                }),
              }}
            />
          </VStack>
          {!isQuickPoll && (
            <FormControl
              w={'fit-content'}
              isDisabled={!canEditMeetingDetails || isScheduling}
            >
              <FormLabel htmlFor="date">
                Duration
                <Text color="red.500" display="inline">
                  *
                </Text>
              </FormLabel>
              <ChakraSelect
                id="duration"
                placeholder="Duration"
                onChange={e =>
                  Number(e.target.value) && setDuration(Number(e.target.value))
                }
                value={duration}
                borderColor="input-border"
                width={'max-content'}
                maxW="350px"
                errorBorderColor="red.500"
                bg="select-bg"
              >
                {DEFAULT_GROUP_SCHEDULING_DURATION.map(type => (
                  <option key={type.id} value={type.duration}>
                    {durationToHumanReadable(type.duration)}
                  </option>
                ))}
              </ChakraSelect>
            </FormControl>
          )}

          {isQuickPoll && (
            <HStack spacing={3} display={{ base: 'none', lg: 'flex' }}>
              <Button
                variant="outline"
                colorScheme="primary"
                leftIcon={<MdShare color="#F9B19A" size={20} />}
                onClick={onSharePoll}
                px="16px"
                py="8px"
                fontSize="16px"
                fontWeight="700"
                borderRadius="8px"
              >
                Share Poll
              </Button>
            </HStack>
          )}
          {isUpdatingMeeting && (
            <Button
              rightIcon={<FaArrowRight />}
              colorScheme="primary"
              _disabled={{
                bg: 'neutral.400',
              }}
              isDisabled={!pickedTime}
              onClick={() => handlePageSwitch(Page.SCHEDULE_DETAILS)}
            >
              Continue scheduling
            </Button>
          )}
        </Flex>
        <HStack
          color="primary.500"
          alignSelf="flex-start"
          display={{
            lg: 'none',
            base: 'flex',
          }}
          cursor="pointer"
          onClick={() => openParticipantModal()}
        >
          <Text fontWeight={500}>View participants</Text>
          <HStack gap={0}>
            <FaAnglesRight />
            <FaAnglesRight
              style={{
                marginLeft: '-4px',
              }}
            />
          </HStack>
        </HStack>

        {/* Mobile quickpoll buttons */}
        {isQuickPoll && (
          <HStack
            spacing={3}
            alignSelf="flex-start"
            display={{
              lg: 'none',
              base: 'flex',
            }}
          >
            {onSaveAvailability && (
              <Button
                colorScheme="primary"
                size="sm"
                px={4}
                py={2}
                fontSize="14px"
                fontWeight="600"
                borderRadius="8px"
                onClick={onSaveAvailability}
                isLoading={isSavingAvailability}
                loadingText="Saving..."
                isDisabled={isSavingAvailability}
              >
                {isEditingAvailability
                  ? 'Save availability'
                  : 'Edit availability'}
              </Button>
            )}
            {onSharePoll && (
              <Button
                variant="outline"
                colorScheme="primary"
                leftIcon={<MdShare color="#F9B19A" size={20} />}
                onClick={onSharePoll}
                px="16px"
                py="8px"
                fontSize="16px"
                fontWeight="700"
                borderRadius="8px"
              >
                Share Poll
              </Button>
            )}
          </HStack>
        )}

        <VStack
          gap={4}
          w="100%"
          alignItems={{ base: 'flex-start', md: 'center' }}
          display={{ base: 'flex', lg: 'none' }}
        >
          <HStack
            w="100%"
            alignItems="center"
            justifyContent="center"
            spacing={4}
          >
            {isQuickPoll && !currentAccount && onImportCalendar && (
              <Button colorScheme="primary" onClick={onImportCalendar}>
                Import from calendar
              </Button>
            )}
            {isQuickPoll && isHost && isSchedulingIntent && (
              <Button colorScheme="primary" onClick={handleJumpToBestSlot}>
                Jump to Best Slot
              </Button>
            )}
            <Box maxW="350px" textAlign="center">
              <Heading fontSize="20px" fontWeight={700}>
                Select time from available slots
              </Heading>
              <Text fontSize="12px">
                All time slots shown below are the available times between you
                and the required participants.
              </Text>
            </Box>
          </HStack>
          {!isQuickPoll && (
            <Button colorScheme="primary" onClick={handleJumpToBestSlot}>
              Jump to Best Slot
            </Button>
          )}
        </VStack>

        <VStack gap={0} w="100%" rounded={12} bg="bg-surface-secondary">
          <VStack
            pt={4}
            gap={6}
            w="100%"
            py={4}
            rounded={12}
            roundedBottom={0}
            position="sticky"
            top={0}
            zIndex={1}
            bg="bg-surface-secondary"
            borderWidth={1}
            borderColor={'input-border'}
            borderBottomWidth={0}
            px={{ md: 6, base: 2 }}
          >
            <HStack w="100%" justify={'space-between'} position="relative">
              <HStack spacing={4}>
                <IconButton
                  aria-label={'left-icon'}
                  icon={<FaChevronLeft />}
                  onClick={handleScheduledTimeBack}
                  isDisabled={isBackDisabled}
                  gap={0}
                />
                {isQuickPoll && !currentAccount && onImportCalendar && (
                  <Button
                    colorScheme="primary"
                    onClick={onImportCalendar}
                    display={{ lg: 'block', base: 'none' }}
                  >
                    Import from calendar
                  </Button>
                )}
                {isQuickPoll && isHost && isSchedulingIntent && (
                  <Button
                    colorScheme="primary"
                    onClick={handleJumpToBestSlot}
                    display={{ lg: 'block', base: 'none' }}
                  >
                    Jump to Best Slot
                  </Button>
                )}
              </HStack>

              {!isQuickPoll && (
                <Button
                  colorScheme="primary"
                  onClick={handleJumpToBestSlot}
                  display={{ lg: 'block', base: 'none' }}
                >
                  Jump to Best Slot
                </Button>
              )}

              <Box
                maxW="350px"
                textAlign="center"
                display={{ lg: 'block', base: 'none' }}
              >
                <Heading fontSize="20px" fontWeight={700}>
                  Select time from available slots
                </Heading>
                <Text fontSize="12px">
                  All time slots shown below are the available times between you
                  and the required participants.
                </Text>
              </Box>

              <HStack spacing={4}>{/* Placeholder for alignment */}</HStack>

              <HStack gap={0}>
                <Grid
                  gridTemplateColumns={'1fr 1fr'}
                  justifyContent={'space-between'}
                  w="fit-content"
                  gap={2}
                >
                  {GUIDES.map((guide, index) => {
                    return (
                      <HStack key={index} gap={2}>
                        <Box w={5} h={5} bg={guide.color} borderRadius={4} />
                        <Text
                          fontSize={{
                            base: 'small',
                            md: 'medium',
                          }}
                          color="text-primary"
                        >
                          {guide.description.split(' ')[0]}
                        </Text>
                      </HStack>
                    )
                  })}
                </Grid>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <InfoIcon cursor="pointer" />
                  </Tooltip.Trigger>
                  <Tooltip.Content style={{ zIndex: 10 }}>
                    <Box
                      p={2}
                      borderRadius={4}
                      boxShadow="md"
                      py={3}
                      px={4}
                      bg="bg-surface-tertiary-2"
                      rounded={'10px'}
                    >
                      <VStack w="fit-content" gap={1} align={'flex-start'}>
                        {GUIDES.map((guide, index) => {
                          return (
                            <HStack key={index} gap={2}>
                              <Box
                                w={5}
                                h={5}
                                bg={guide.color}
                                borderRadius={4}
                              />
                              <Text
                                fontSize={{
                                  base: 'small',
                                  md: 'medium',
                                }}
                                color="text-primary"
                              >
                                {guide.description}
                              </Text>
                            </HStack>
                          )
                        })}
                      </VStack>
                    </Box>
                    <Tooltip.Arrow color="#323F4B" />
                  </Tooltip.Content>
                </Tooltip.Root>
              </HStack>
              <IconButton
                aria-label={'left-icon'}
                icon={<FaChevronRight />}
                onClick={handleScheduledTimeNext}
                position="sticky"
                top={28}
                bg="bg-surface-secondary"
                zIndex={1}
              />
            </HStack>
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
              </VStack>
              {datesSlotsWithAvailability.map((date, index) => {
                return (
                  <SlideFade
                    in={true}
                    key={'date' + index + date.date.toDateString()}
                    transition={{ exit: { delay: 0 }, enter: { duration: 1 } }}
                    style={{ flex: 1 }}
                  >
                    <VStack flex={1} w="100%" align={'center'} gap={2}>
                      <VStack align={'center'} w="100%" h={12} gap={0}>
                        <Text
                          fontWeight={'700'}
                          fontSize={{
                            base: 'small',
                            md: 'medium',
                          }}
                        >
                          {formatInTimeZone(date.date, timezone, 'dd')}
                        </Text>
                        <Text
                          fontWeight={'500'}
                          fontSize={{
                            base: 'small',
                            md: 'medium',
                          }}
                        >
                          {formatInTimeZone(date.date, timezone, 'EE')}
                        </Text>
                      </VStack>
                    </VStack>
                  </SlideFade>
                )
              })}
            </HStack>
          </VStack>
          {isDisplayLoading ? (
            <VStack
              w="100%"
              borderWidth={1}
              borderColor={'input-border'}
              borderTop={0}
              pb={4}
              rounded={12}
              roundedTop={0}
            >
              <Loading />
            </VStack>
          ) : (
            <HStack
              w="100%"
              justify={{ md: 'space-between' }}
              gap={{ base: 1, md: 6 }}
              px={{ md: 6, base: 2 }}
              borderWidth={1}
              borderColor={'input-border'}
              borderTop={0}
              pb={4}
              rounded={12}
              roundedTop={0}
            >
              <VStack
                align={'flex-start'}
                flex={1}
                justify={'flex-start'}
                gap={2}
              >
                <VStack align={'flex-start'} p={1} gap={0}>
                  {HOURS_SLOTS.map((slot, index) => {
                    return (
                      <HStack
                        key={index}
                        w="100%"
                        justify={'center'}
                        align={'center'}
                        h={12}
                        my={'1px'}
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
              {datesSlotsWithAvailability.map((date, index) => {
                return (
                  <SlideFade
                    in={true}
                    key={index + date.date.toDateString()}
                    transition={{ exit: { delay: 0 }, enter: { duration: 1 } }}
                    style={{ flex: 1 }}
                  >
                    <VStack flex={1} align={'flex-start'} gap={2}>
                      <VStack
                        width="100%"
                        align={'flex-start'}
                        borderWidth={1}
                        borderRadius={5}
                        gap={'-1px'}
                        bg="bg-canvas-subtle"
                        p={1}
                      >
                        {date.slots.map(slotData => {
                          const TimeSlotComponent = isQuickPoll
                            ? QuickPollTimeSlot
                            : ScheduleTimeSlot
                          return (
                            <TimeSlotComponent
                              key={slotData.slotKey}
                              slotData={slotData}
                              pickedTime={pickedTime}
                              duration={duration}
                              handleTimePick={handleTimeSelection}
                              timezone={timezone}
                              isQuickPoll={isQuickPoll}
                              isEditingAvailability={isEditingAvailability}
                              isSchedulingIntent={isSchedulingIntent}
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
