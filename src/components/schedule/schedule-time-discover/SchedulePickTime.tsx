import { InfoIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  HStack,
  IconButton,
  SlideFade,
  Text,
  useBreakpointValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Select, SingleValue } from 'chakra-react-select'
import { DateTime, Interval } from 'luxon'
import { useEffect, useMemo, useState } from 'react'
import { FaArrowRight, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { FaAnglesRight } from 'react-icons/fa6'

import Loading from '@/components/Loading'
import InfoTooltip from '@/components/profile/components/Tooltip'
import useAccountContext from '@/hooks/useAccountContext'
import useSlotsWithAvailability from '@/hooks/useSlotsWithAvailability'
import {
  Page,
  useScheduleNavigation,
} from '@/providers/schedule/NavigationContext'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'
import { useParticipantPermissions } from '@/providers/schedule/PermissionsContext'
import { useScheduleState } from '@/providers/schedule/ScheduleContext'
import { TimeSlot } from '@/types/Meeting'
import {
  fetchBusySlotsRawForMultipleAccounts,
  getExistingAccounts,
  getSuggestedSlots,
} from '@/utils/api_helper'
import { NO_GROUP_KEY } from '@/utils/constants/group'
import { DEFAULT_GROUP_SCHEDULING_DURATION } from '@/utils/constants/schedule'
import {
  customSelectComponents,
  getCustomSelectComponents,
  TimeZoneOption,
  timeZoneFilter,
} from '@/utils/constants/select'
import {
  getTimezones,
  parseMonthAvailabilitiesToDate,
} from '@/utils/date_helper'
import {
  buildHourlyTimeRangeLabelRows,
  calculateEffectiveDuration,
  getLabelRowHeightPx,
} from '@/utils/duration.helper'
import { deduplicateArray } from '@/utils/generic_utils'
import { mergeAvailabilityBlocks } from '@/utils/schedule.helper'
import { getEmptySlots } from '@/utils/slots.helper'
import { getAccountDisplayName } from '@/utils/user_manager'
export interface AccountAddressRecord extends ParticipantInfo {
  account_address: string
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import useSlotCache from '@/hooks/useSlotCache'
import useTimeRangeSlotCache from '@/hooks/useTimeRangeSlotCache'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import { ActiveAvailabilityBlock } from '@/types/schedule'
import { Option } from '@/utils/constants/select'
import { DurationSelector } from './DurationSelector'
import ScheduleDateSection from './ScheduleDateSection'

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
      return '#2F89F8'
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
    color: getBgColor(State.MOST_AVAILABLE),
    description: 'Most are available',
  },
  {
    color: getBgColor(State.SOME_AVAILABLE),
    description: 'Some are available',
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
  onClose?: () => void
}

export function SchedulePickTime({
  openParticipantModal,
}: ISchedulePickTimeProps) {
  const {
    timezone,
    setTimezone,
    setPickedTime,
    pickedTime,
    duration,
    setDuration,
    durationMode,
    setDurationMode,
    timeRange,
    setTimeRange,
    isScheduling,
    currentSelectedDate,
    setCurrentSelectedDate,
  } = useScheduleState()
  const { groupId } = useRouter().query
  const { canEditMeetingDetails, isUpdatingMeeting } =
    useParticipantPermissions()
  const { allAvailaibility, groupAvailability, groupMembersAvailabilities } =
    useParticipants()
  const currentAccount = useAccountContext()
  const toast = useToast()

  const SLOT_LENGTH_RAW = useBreakpointValue(
    { base: 3, md: 5, lg: 7 },
    { ssr: true, fallback: '3' }
  )

  const [SLOT_LENGTH, setSlotLength] = useState(Number(SLOT_LENGTH_RAW) || 7)

  useEffect(() => {
    setSlotLength(Number(SLOT_LENGTH_RAW) || 7)
  }, [SLOT_LENGTH_RAW])

  const queryClient = useQueryClient()

  const addresses = useMemo(
    () =>
      allAvailaibility
        .filter((val): val is AccountAddressRecord => !!val.account_address)
        .map(val => val.account_address)
        .sort(),
    [allAvailaibility]
  )

  const { monthStart, monthEnd } = useMemo(() => {
    const start = currentSelectedDate
      .setZone(timezone)
      .startOf('month')
      .toJSDate()
    const end = currentSelectedDate.setZone(timezone).endOf('month').toJSDate()
    return { monthStart: start, monthEnd: end }
  }, [currentSelectedDate.year, currentSelectedDate.month, timezone])

  const { data: busySlotsRaw, isLoading: isBusySlotsLoading } = useQuery({
    queryKey: ['busySlots', addresses, monthStart, monthEnd],
    queryFn: ({ signal }) =>
      fetchBusySlotsRawForMultipleAccounts(
        addresses,
        monthStart,
        monthEnd,
        undefined,
        undefined,
        signal
      ),
  })
  // Calculate effective duration based on mode
  const effectiveDuration = useMemo(
    () => calculateEffectiveDuration(durationMode, duration, timeRange),
    [durationMode, duration, timeRange]
  )

  const { mutateAsync: fetchBestSlot, isLoading: isBestSlotLoading } =
    useMutation({
      mutationKey: ['busySlots', addresses.join(','), effectiveDuration],
      mutationFn: ({
        endDate,
        startDate,
      }: {
        startDate: Date
        endDate: Date
      }) =>
        getSuggestedSlots(
          addresses,
          startDate,
          endDate,
          effectiveDuration,
          groupId as string
        ),
      onError: () =>
        toast({
          title: 'Error fetching suggested slots',
          description: `There was an error fetching suggested slots`,
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        }),
    })

  const { data: meetingMembers, isLoading: isMeetingMembersLoading } = useQuery(
    {
      queryKey: ['meetingMembers', addresses],
      queryFn: ({ signal }) =>
        getExistingAccounts(deduplicateArray(addresses), true, { signal }),
    }
  )

  const busySlots = useMemo(() => {
    if (!busySlotsRaw) return new Map()
    const busySlotsMap = new Map<string, Interval[]>()

    for (const busySlot of busySlotsRaw) {
      const address = busySlot.account_address?.toLowerCase()
      if (!address) continue

      const interval = Interval.fromDateTimes(
        new Date(busySlot.start),
        new Date(busySlot.end)
      )

      const existing = busySlotsMap.get(address)
      if (existing) {
        existing.push(interval)
      } else {
        busySlotsMap.set(address, [interval])
      }
    }

    return busySlotsMap
  }, [busySlotsRaw])
  const busySlotsWithDetails = useMemo(() => {
    if (!busySlotsRaw) return new Map()
    const busySlotsWithDetailsMap = new Map<string, TimeSlot[]>()

    for (const slot of busySlotsRaw) {
      const address = slot.account_address?.toLowerCase()
      if (!address) continue

      const timeSlot = {
        ...slot,
        start: new Date(slot.start),
        end: new Date(slot.end),
      }

      const existing = busySlotsWithDetailsMap.get(address)
      if (existing) {
        existing.push(timeSlot)
      } else {
        busySlotsWithDetailsMap.set(address, [timeSlot])
      }
    }

    return busySlotsWithDetailsMap
  }, [busySlotsRaw])
  const availableSlots = useMemo(() => {
    if (!meetingMembers) return new Map()
    const availableSlotsMap: Map<string, Interval[]> = new Map<
      string,
      Interval[]
    >()

    // Check if we're scheduling for a group
    const groupAvailabilityKeys = Object.keys(groupAvailability || {}).filter(
      key => key !== NO_GROUP_KEY
    )
    const isGroupScheduling = groupAvailabilityKeys.length > 0

    // Use group-specific availabilities from context (prefetched in ScheduleMain)
    const groupMemberAvailabilities: Record<string, Interval[]> = {}

    if (isGroupScheduling) {
      // Get the single group ID
      const groupId = groupAvailabilityKeys[0]

      // Get group members availabilities from context
      const groupBlocksData = groupMembersAvailabilities?.[groupId]

      if (groupBlocksData) {
        // Convert availability blocks to intervals for each member
        for (const [memberAddress, blocks] of Object.entries(groupBlocksData)) {
          if (blocks && blocks.length > 0) {
            groupMemberAvailabilities[memberAddress.toLowerCase()] =
              mergeAvailabilityBlocks(blocks, monthStart, monthEnd)
          }
        }
      }
    }

    for (const memberAccount of meetingMembers) {
      if (!memberAccount.address) continue
      try {
        const memberAddressLower = memberAccount.address.toLowerCase()

        // Use group-specific availability if available, otherwise fallback to default
        const groupSpecificAvailability =
          groupMemberAvailabilities[memberAddressLower]

        const availabilities =
          groupSpecificAvailability && groupSpecificAvailability.length > 0
            ? groupSpecificAvailability
            : parseMonthAvailabilitiesToDate(
                memberAccount?.preferences?.availabilities || [],
                monthStart,
                monthEnd,
                memberAccount?.preferences?.timezone || 'UTC'
              )

        availableSlotsMap.set(memberAddressLower, availabilities)
      } catch (error) {
        console.warn(
          'Failed to parse availability for member:',
          memberAccount.address,
          error
        )
      }
    }
    return availableSlotsMap
  }, [
    meetingMembers,
    monthStart,
    monthEnd,
    groupAvailability,
    groupMembersAvailabilities,
  ])

  const isLoading = isBusySlotsLoading || isMeetingMembersLoading

  useEffect(() => {
    if (isLoading) return

    // Debounce prefetch to avoid blocking on rapid navigation
    const timeoutId = setTimeout(() => {
      const nextMonth = currentSelectedDate.plus({
        months: 1,
      })
      const nextMonthStart = nextMonth.startOf('month').toJSDate()
      const nextMonthEnd = nextMonth.endOf('month').toJSDate()

      const queryKey = ['busySlots', addresses, nextMonthStart, nextMonthEnd]

      // Skip if already cached
      if (queryClient.getQueryData(queryKey)) return

      void queryClient.prefetchQuery({
        queryKey,
        queryFn: ({ signal }) =>
          fetchBusySlotsRawForMultipleAccounts(
            addresses,
            nextMonthStart,
            nextMonthEnd,
            undefined,
            undefined,
            signal
          ),
      })
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [
    currentSelectedDate.month,
    currentSelectedDate.year,
    addresses,
    isLoading,
    queryClient,
  ])

  const { handlePageSwitch } = useScheduleNavigation()

  const gridSlotDuration =
    durationMode === 'timeRange' ? effectiveDuration : duration
  const timeRangeSlotTemplate = useTimeRangeSlotCache(
    timeRange?.startTime ?? '09:00',
    timeRange?.endTime ?? '10:00',
    timezone
  )
  const regularSlotTemplate = useSlotCache(gridSlotDuration, timezone)
  const slotTemplate =
    durationMode === 'timeRange' ? timeRangeSlotTemplate : regularSlotTemplate

  const dates = useMemo(() => {
    const baseDate = currentSelectedDate.setZone(timezone).startOf('day')
    const monthStart = baseDate.startOf('month')

    const days = []
    for (let k = 0; k < (SLOT_LENGTH || 3); k++) {
      const day = baseDate.plus({ days: k })
      if (day.hasSame(monthStart, 'month')) {
        days.push(day)
      }
    }

    if (slotTemplate.length === 0) return []

    return days.map(date => {
      const dateStart = date.startOf('day')
      const templateStart = slotTemplate[0].start.startOf('day')
      const offsetMillis = dateStart.toMillis() - templateStart.toMillis()

      // Shift template slots to actual date
      const slots = slotTemplate
        .map(slot =>
          Interval.fromDateTimes(
            slot.start.plus({ milliseconds: offsetMillis }),
            slot.end.plus({ milliseconds: offsetMillis })
          )
        )
        .filter((slot): slot is Interval<true> => slot.isValid)

      return {
        date: date.toJSDate(),
        slots,
      }
    })
  }, [currentSelectedDate, timezone, SLOT_LENGTH, slotTemplate])

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
  }, [currentSelectedDate.year, timezone])
  const datesSlotsWithAvailability = useSlotsWithAvailability(
    dates,
    busySlots,
    availableSlots,
    meetingMembers || [],
    addresses,
    timezone,
    busySlotsWithDetails,
    currentAccount?.address
  )

  // Create a mapping from displayName to account address to identify current user
  const displayNameToAddress = useMemo(() => {
    if (!meetingMembers) return new Map<string, string>()
    const map = new Map<string, string>()
    meetingMembers.forEach(member => {
      if (member.address) {
        const displayName = getAccountDisplayName(member)
        map.set(displayName, member.address.toLowerCase())
      }
    })
    return map
  }, [meetingMembers])

  const currentUserActiveBlocks = useMemo((): ActiveAvailabilityBlock[] => {
    if (!currentAccount?.address) return []

    const currentUserAddressLower = currentAccount.address.toLowerCase()

    // Check if we're scheduling for a group
    const groupAvailabilityKeys = Object.keys(groupAvailability || {}).filter(
      key => key !== NO_GROUP_KEY
    )
    const isGroupScheduling = groupAvailabilityKeys.length > 0

    if (isGroupScheduling) {
      const activeGroupId = groupAvailabilityKeys[0]
      // Get group members availabilities from context
      const groupBlocksData = groupMembersAvailabilities?.[activeGroupId]

      if (groupBlocksData) {
        const userBlocks = groupBlocksData[currentUserAddressLower]
        if (userBlocks && userBlocks.length > 0) {
          return userBlocks.map(block => ({
            id: block.id,
            title: block.title,
          }))
        }
      }
    }

    // Fall back to default availability block
    if (
      currentAccount?.preferences?.availaibility_id &&
      currentAccount?.preferences?.availabilities
    ) {
      const defaultTitle =
        currentAccount.preferences.availabilities.length > 0
          ? 'default'
          : 'default'
      return [
        {
          id: currentAccount.preferences.availaibility_id,
          title: defaultTitle,
        },
      ]
    }

    return []
  }, [
    currentAccount?.address,
    currentAccount?.preferences?.availaibility_id,
    currentAccount?.preferences?.availabilities,
    groupAvailability,
    groupMembersAvailabilities,
  ])
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
        DateTime.now().set({
          month: Number(month.value),
          day: 1,
          year: Number(year),
        })
      )
    }
  }

  const tzOptions = useMemo(
    () =>
      getTimezones().map(tz => ({
        value: tz.tzCode,
        label: tz.name,
        searchKeys: tz.countries,
      })),
    []
  )

  const [tz, setTz] = useState<TimeZoneOption>(
    tzOptions.filter(val => val.value === timezone)[0] || tzOptions[0]
  )

  const _onChange = (newValue: unknown) => {
    if (Array.isArray(newValue)) {
      return
    }
    const timezone = newValue as TimeZoneOption
    setTz(timezone)
    setTimezone(
      timezone?.value || Intl.DateTimeFormat().resolvedOptions().timeZone
    )
  }
  const handleScheduledTimeBack = () => {
    const currentDate = currentSelectedDate.setZone(timezone).startOf('day')
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
    setCurrentSelectedDate(newDate)
  }
  const handleScheduledTimeNext = () => {
    const currentDate = currentSelectedDate.setZone(timezone).startOf('day')
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

    setCurrentSelectedDate(newDate)
  }
  const HOURS_SLOTS = useMemo(() => {
    if (durationMode === 'timeRange' && timeRange && slotTemplate.length > 0) {
      if (effectiveDuration < 45) {
        return buildHourlyTimeRangeLabelRows(slotTemplate, timezone)
      }
      return slotTemplate.map(slot => {
        const zonedTime = slot.start.setZone(timezone)
        return {
          label: zonedTime.toFormat(
            zonedTime.hour < 12 ? 'HH:mm a' : 'hh:mm a'
          ),
          heightMinutes: slot.toDuration('minutes').minutes,
        }
      })
    }
    const labelSlotSize = gridSlotDuration >= 45 ? gridSlotDuration : 60
    const slots = getEmptySlots(DateTime.now(), labelSlotSize, timezone)
    return slots.map(val => {
      const zonedTime = val.start.setZone(timezone)
      return {
        label: zonedTime.toFormat(zonedTime.hour < 12 ? 'HH:mm a' : 'hh:mm a'),
        heightMinutes: labelSlotSize,
      }
    })
  }, [
    durationMode,
    timeRange,
    slotTemplate,
    gridSlotDuration,
    effectiveDuration,
    timezone,
  ])

  const isBackDisabled = useMemo(() => {
    const selectedDate = currentSelectedDate.setZone(timezone)
    const currentDate = DateTime.now().setZone(timezone)
    return selectedDate < currentDate || isLoading
  }, [currentSelectedDate, timezone, isLoading])

  const handleJumpToBestSlot = async () => {
    const suggestedTimes = await fetchBestSlot({
      startDate: currentSelectedDate.toJSDate(),
      endDate: currentSelectedDate.plus({ months: 1 }).toJSDate(),
    })
    if (suggestedTimes.length === 0) {
      toast({
        title: 'No Matching Times',
        description:
          'No slots in the next 30 days work for all participants. Please browse the calendar grid and select a time that works best.',
        status: 'info',
        duration: 5000,
        isClosable: true,
      })
      return
    }
    const bestSlotStart = new Date(suggestedTimes[0].start)
    setPickedTime(bestSlotStart)
    setCurrentSelectedDate(
      DateTime.fromJSDate(bestSlotStart).setZone(timezone).startOf('day')
    )

    handlePageSwitch(Page.SCHEDULE_DETAILS)
  }

  const handleTimeSelection = (time: Date) => {
    setPickedTime(time)
    handlePageSwitch(Page.SCHEDULE_DETAILS)
  }

  const handleDurationChange = (
    newValue: Option<number> | { value: string; label: string } | null
  ) => {
    if (!newValue) {
      setDurationMode('preset')
      setDuration(30)
      setTimeRange(null)
      return
    }

    if (newValue.value === 'TIME_RANGE') {
      setDurationMode('timeRange')
      if (!timeRange) {
        setTimeRange({ startTime: '09:00', endTime: '10:00' })
      }
    } else {
      // Regular duration option
      const durationValue = (newValue as Option<number>).value
      setDuration(durationValue)
      // Determine if it's a preset or custom
      const isPreset = DEFAULT_GROUP_SCHEDULING_DURATION.some(
        (preset: { duration: number; id: string }) =>
          preset.duration === durationValue
      )
      setDurationMode(isPreset ? 'preset' : 'custom')
      setTimeRange(null)
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
          <VStack
            gap={2}
            alignItems={'flex-start'}
            width="fit-content"
            minW={'10px'}
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
              components={getCustomSelectComponents<TimeZoneOption, boolean>()}
              filterOption={timeZoneFilter}
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
          <DurationSelector
            value={durationMode === 'timeRange' ? 'TIME_RANGE' : duration}
            durationMode={durationMode}
            timeRange={timeRange}
            onChange={handleDurationChange}
            onTimeRangeChange={(startTime, endTime) => {
              setTimeRange({ startTime, endTime })
            }}
            isDisabled={!canEditMeetingDetails || isScheduling}
          />
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

        <VStack
          gap={4}
          w="100%"
          alignItems={{ base: 'flex-start', md: 'center' }}
          display={{ base: 'flex', lg: 'none' }}
        >
          <Button
            isLoading={isBestSlotLoading}
            colorScheme="primary"
            onClick={handleJumpToBestSlot}
          >
            Jump to Best Slot
          </Button>
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
              </HStack>
              <Button
                colorScheme="primary"
                onClick={handleJumpToBestSlot}
                display={{ lg: 'flex', base: 'none' }}
                cursor={'pointer'}
                isLoading={isBestSlotLoading}
              >
                Jump to Best Slot
              </Button>

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
              {datesSlotsWithAvailability?.map((date, index) => {
                return (
                  <SlideFade
                    in={true}
                    key={'date' + index + date.date.toDateString()}
                    transition={{
                      exit: { delay: 0 },
                      enter: { duration: 0.2 },
                    }}
                    style={{
                      flex: 1,
                      willChange: 'opacity, transform',
                    }}
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
                          {DateTime.fromJSDate(date.date)
                            .setZone(timezone)
                            .toFormat('dd')}
                        </Text>
                        <Text
                          fontWeight={'500'}
                          fontSize={{
                            base: 'small',
                            md: 'medium',
                          }}
                        >
                          {DateTime.fromJSDate(date.date)
                            .setZone(timezone)
                            .toFormat('EEE')}
                        </Text>
                      </VStack>
                    </VStack>
                  </SlideFade>
                )
              })}
            </HStack>
          </VStack>
          {isLoading ? (
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
                  {HOURS_SLOTS.map((row, index) => {
                    const h = getLabelRowHeightPx(
                      row,
                      gridSlotDuration || 30,
                      durationMode
                    )
                    return (
                      <HStack
                        key={index}
                        w="100%"
                        justify={'center'}
                        align={'center'}
                        h={`${h}px`}
                        my={'1px'}
                      >
                        <Text
                          fontWeight={'500'}
                          fontSize={{
                            base: 'small',
                            md: 'medium',
                          }}
                        >
                          {row.label}
                        </Text>
                      </HStack>
                    )
                  })}
                </VStack>
              </VStack>
              {datesSlotsWithAvailability?.map((date, index) => {
                return (
                  <ScheduleDateSection
                    key={index + date.date.toDateString()}
                    pickedTime={pickedTime}
                    duration={gridSlotDuration}
                    timezone={timezone}
                    currentAccountAddress={currentAccount?.address}
                    displayNameToAddress={displayNameToAddress}
                    activeAvailabilityBlocks={currentUserActiveBlocks}
                    slots={date.slots}
                    handleTimeSelection={handleTimeSelection}
                  />
                )
              })}
            </HStack>
          )}
        </VStack>
      </VStack>
    </Tooltip.Provider>
  )
}
