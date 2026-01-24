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
  SystemStyleObject,
  Text,
  useBreakpointValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Select, SingleValue } from 'chakra-react-select'
import { formatInTimeZone } from 'date-fns-tz'
import { DateTime, Interval } from 'luxon'
import { useRouter } from 'next/router'
import React, { useContext, useEffect, useMemo, useState } from 'react'
import { FaArrowRight, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { FaAnglesRight } from 'react-icons/fa6'
import { MdShare } from 'react-icons/md'

import Loading from '@/components/Loading'
import InfoTooltip from '@/components/profile/components/Tooltip'
import useAccountContext from '@/hooks/useAccountContext'
import { useDebounceCallback } from '@/hooks/useDebounceCallback'
import useSlotsWithAvailability from '@/hooks/useSlotsWithAvailability'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { useQuickPollAvailability } from '@/providers/quickpoll/QuickPollAvailabilityContext'
import {
  Page,
  useScheduleNavigation,
} from '@/providers/schedule/NavigationContext'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'
import { useParticipantPermissions } from '@/providers/schedule/PermissionsContext'
import { useScheduleState } from '@/providers/schedule/ScheduleContext'
import { Account } from '@/types/Account'
import {
  QuickPollBySlugResponse,
  QuickPollIntent,
  QuickPollParticipantType,
} from '@/types/QuickPoll'
import {
  fetchBusySlotsRawForQuickPollParticipants,
  getExistingAccounts,
  getPollParticipantCalendars,
  getSuggestedSlots,
} from '@/utils/api_helper'
import { customSelectComponents, Option } from '@/utils/constants/select'
import { parseMonthAvailabilitiesToDate, timezones } from '@/utils/date_helper'
import { handleApiError } from '@/utils/error_helper'
import { deduplicateArray } from '@/utils/generic_utils'
import {
  clipIntervalsToBounds,
  computeBaseAvailability,
  convertAvailabilityToSelectedSlots,
  createMockMeetingMembers,
  extractOverrideIntervals,
  generateFullDayBlocks,
  mergeLuxonIntervals,
  processPollParticipantAvailabilities,
  subtractBusyTimesFromBlocks,
  subtractRemovalIntervals,
} from '@/utils/quickpoll_helper'
import { getMergedParticipants } from '@/utils/schedule.helper'
import { getEmptySlots } from '@/utils/slots.helper'
import { saveQuickPollSignInContext } from '@/utils/storage'

import { useAvailabilityTracker } from '../schedule/schedule-time-discover/AvailabilityTracker'
import QuickPollTimeSlot from '../schedule/schedule-time-discover/QuickPollTimeSlot'
import { AccountAddressRecord } from '../schedule/schedule-time-discover/SchedulePickTime'
import ChooseAvailabilityMethodModal from './ChooseAvailabilityMethodModal'
import { QuickPollParticipationInstructions } from './QuickPollParticipationInstructions'

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
      return 'blue.400'
    case State.NONE_AVAILABLE:
      return 'text-primary'
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

interface QuickPollPickAvailabilityProps {
  openParticipantModal: () => void
  pollData?: QuickPollBySlugResponse
  onSaveAvailability?: () => void
  onCancelEditing?: () => void
  onSharePoll?: () => void
  onImportCalendar?: () => void
  isEditingAvailability?: boolean
  isSavingAvailability?: boolean
  isRefreshingAvailabilities?: boolean
}

export function QuickPollPickAvailability({
  openParticipantModal,
  pollData,
  onSaveAvailability,
  onCancelEditing,
  onSharePoll,
  isEditingAvailability,
  isSavingAvailability,
  isRefreshingAvailabilities,
}: QuickPollPickAvailabilityProps) {
  const _router = useRouter()
  const {
    timezone,
    setTimezone,
    currentSelectedDate,
    setPickedTime,
    setCurrentSelectedDate,
    pickedTime,
    duration,
    setDuration,
  } = useScheduleState()
  const { isUpdatingMeeting } = useParticipantPermissions()
  const currentAccount = useAccountContext()
  const { currentGuestEmail, currentParticipantId } = useQuickPollAvailability()
  const { loadSlots } = useAvailabilityTracker()
  const { openConnection } = useContext(OnboardingModalContext)
  const [showMethodModal, setShowMethodModal] = useState(false)

  const isHost = useMemo(() => {
    if (!pollData || !currentAccount) return false

    return pollData.poll.participants.some(
      p =>
        p.account_address === currentAccount.address &&
        p.participant_type === QuickPollParticipantType.SCHEDULER
    )
  }, [pollData, currentAccount])

  // Get current participant
  const currentParticipant = useMemo(() => {
    if (!pollData) return null
    if (currentAccount) {
      return pollData.poll.participants.find(
        p =>
          p.account_address?.toLowerCase() ===
          currentAccount.address.toLowerCase()
      )
    }
    if (currentGuestEmail) {
      return pollData.poll.participants.find(
        p =>
          p.guest_email?.toLowerCase() === currentGuestEmail.toLowerCase() ||
          p.id === currentParticipantId
      )
    }
    if (currentParticipantId) {
      return pollData.poll.participants.find(p => p.id === currentParticipantId)
    }
    return null
  }, [pollData, currentAccount, currentGuestEmail, currentParticipantId])

  // Check if participant has calendar imported
  const { data: participantCalendars } = useQuery({
    queryKey: ['poll-participant-calendars', currentParticipant?.id],
    queryFn: () =>
      currentParticipant?.id
        ? getPollParticipantCalendars(currentParticipant.id)
        : Promise.resolve([]),
    enabled: !!currentParticipant?.id,
  })

  // Check if user has any availability
  const hasAvailability = useMemo(() => {
    if (!currentParticipant) return false

    // Check if they have manual availability slots
    const hasManualAvailability =
      currentParticipant.available_slots &&
      currentParticipant.available_slots.length > 0

    // Check if they have calendar imported
    const hasCalendar = participantCalendars && participantCalendars.length > 0

    // Check if account owner has default availability blocks
    const hasDefaultAvailability =
      currentAccount &&
      currentAccount.preferences?.availabilities &&
      currentAccount.preferences.availabilities.length > 0

    return hasManualAvailability || hasCalendar || hasDefaultAvailability
  }, [
    currentParticipant,
    participantCalendars,
    currentAccount?.preferences?.availabilities,
  ])

  const { currentIntent } = useQuickPollAvailability()
  const isSchedulingIntent = currentIntent === QuickPollIntent.SCHEDULE
  const isEditAvailabilityIntent =
    currentIntent === QuickPollIntent.EDIT_AVAILABILITY ||
    (!currentIntent && !isSchedulingIntent)

  const {
    groupAvailability,
    setGroupAvailability,
    setGroupParticipants,
    meetingMembers,
    setMeetingMembers,
    participants,
    groups,
    allAvailaibility,
  } = useParticipants()

  const addresses = useMemo(
    () =>
      allAvailaibility
        .filter((val): val is AccountAddressRecord => !!val.account_address)
        .map(val => val.account_address)
        .sort(),
    [allAvailaibility]
  )
  const { mutateAsync: fetchBestSlot, isLoading: isBestSlotLoading } =
    useMutation({
      mutationKey: ['busySlots', addresses.join(','), duration],
      mutationFn: ({
        endDate,
        startDate,
      }: {
        startDate: Date
        endDate: Date
      }) => getSuggestedSlots(addresses, startDate, endDate, duration),
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

  const toast = useToast()
  const [isBreakpointResolved, setIsBreakpointResolved] = useState(false)
  const [hasLoadedInitialSlots, setHasLoadedInitialSlots] = useState(false)
  const SLOT_LENGTH =
    useBreakpointValue({ base: 3, md: 5, lg: 7 }, { ssr: true }) ?? 3

  const daysUntilExpiry = useMemo(() => {
    const expiresAt = pollData?.poll?.expires_at
    if (!expiresAt) return null
    try {
      const now = DateTime.now().setZone(timezone).startOf('day')
      const end = DateTime.fromISO(expiresAt, { zone: 'utc' })
        .setZone(timezone)
        .endOf('day')
      const diff = Math.ceil(end.diff(now, 'days').days)
      return Math.max(diff, 0)
    } catch {
      return null
    }
  }, [pollData?.poll?.expires_at, timezone])

  useEffect(() => {
    // Only resolve after client-side rendering
    const timer = setTimeout(() => setIsBreakpointResolved(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const { handlePageSwitch, inviteModalOpen } = useScheduleNavigation()

  useEffect(() => {
    if (pollData) {
      const quickpollAvailability: Record<string, string[]> = {}
      const quickpollParticipants: Record<string, string[]> = {}

      const participantIdentifiers = pollData.poll.participants
        .map(
          p => p.account_address?.toLowerCase() || p.guest_email?.toLowerCase()
        )
        .filter(Boolean) as string[]

      const groupKey = `quickpoll-${pollData.poll.id}`

      quickpollAvailability[groupKey] = participantIdentifiers
      quickpollParticipants[groupKey] = participantIdentifiers

      setGroupAvailability(quickpollAvailability)
      setGroupParticipants(quickpollParticipants)
    }
  }, [pollData, setGroupAvailability, setGroupParticipants])

  const [isLoading, setIsLoading] = useState(true)

  const isDisplayLoading = isLoading || isRefreshingAvailabilities
  const [availableSlots, setAvailableSlots] = useState<
    Map<string, Interval<true>[]>
  >(new Map())
  const [busySlots, setBusySlots] = useState<Map<string, Interval<true>[]>>(
    new Map()
  )
  const availabilityAddresses = useMemo(() => {
    if (pollData) {
      const groupKey = `quickpoll-${pollData.poll.id}`
      const visibleParticipants = groupAvailability[groupKey] || []

      return pollData.poll.participants
        .filter(p => p.account_address || p.guest_email)
        .map(
          p =>
            (p.account_address?.toLowerCase() || p.guest_email?.toLowerCase())!
        )
        .filter(addr => visibleParticipants.includes(addr))
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
  }, [pollData, groupAvailability])

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

  const [dates, setDates] = useState<Array<Dates>>([])

  // Get current user identifier
  const currentUserIdentifier = useMemo(() => {
    if (currentAccount) {
      return currentAccount.address.toLowerCase()
    }
    if (currentGuestEmail) {
      return currentGuestEmail.toLowerCase()
    }
    if (currentParticipant) {
      return (
        currentParticipant.account_address?.toLowerCase() ||
        currentParticipant.guest_email?.toLowerCase() ||
        ''
      )
    }
    return ''
  }, [currentAccount, currentGuestEmail, currentParticipant])

  // When editing availability, show only current user's slots
  const effectiveBusySlots = busySlots
  const effectiveAvailableSlots = useMemo(() => {
    if (!isEditingAvailability || !currentUserIdentifier) {
      return availableSlots
    }

    if (!hasAvailability) {
      return availableSlots
    }
    // Filter to show only current user's availability
    const userSlots = availableSlots.get(currentUserIdentifier)
    const filteredMap = new Map<string, Interval<true>[]>()
    if (userSlots && userSlots.length > 0) {
      filteredMap.set(currentUserIdentifier, userSlots)
    }
    return filteredMap
  }, [
    isEditingAvailability,
    availableSlots,
    currentUserIdentifier,
    hasAvailability,
  ])
  const effectiveMeetingMembers = useMemo(() => {
    if (!isEditingAvailability || !hasAvailability) {
      return meetingMembers
    }
    return []
  }, [isEditingAvailability, meetingMembers, hasAvailability])
  const effectiveAvailabilityAddresses = useMemo(() => {
    if (!isEditingAvailability) {
      return availabilityAddresses
    }

    if (!hasAvailability) {
      return availabilityAddresses
    }
    // When editing, only show current user's availability
    if (
      currentUserIdentifier &&
      availabilityAddresses.includes(currentUserIdentifier)
    ) {
      return [currentUserIdentifier]
    }
    return []
  }, [
    isEditingAvailability,
    availabilityAddresses,
    currentUserIdentifier,
    hasAvailability,
  ])
  const datesSlotsWithAvailability = useSlotsWithAvailability(
    dates,
    effectiveBusySlots,
    effectiveAvailableSlots,
    effectiveMeetingMembers,
    effectiveAvailabilityAddresses,
    timezone,
    undefined,
    undefined,
    true
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
        DateTime.now().set({
          month: Number(month.value),
          day: 1,
          year: Number(year),
        })
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

  const selectChakraStyles = {
    container: (provided: SystemStyleObject) => ({
      ...provided,
      borderColor: 'input-border',
      bg: 'select-bg',
    }),
  }

  const getAvailabilityButtonText = () => {
    if (isEditingAvailability) return 'Save availability'
    return hasAvailability ? 'Edit availability' : 'Add Availability'
  }

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
      .map(k =>
        currentSelectedDate.plus({
          days: k,
        })
      )
      .filter(val =>
        currentSelectedDate
          .setZone(timezone)
          .startOf('month')
          .hasSame(val, 'month')
      )
    return days.map(date => {
      const slots = getEmptySlots(date, scheduleDuration, timezone)

      return {
        date: date.setZone(timezone).startOf('day').toJSDate(),
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
      const monthStart = currentSelectedDate
        .setZone(timezone)
        .startOf('month')
        .toJSDate()
      const monthEnd = currentSelectedDate
        .setZone(timezone)
        .endOf('month')
        .toJSDate()

      if (pollData) {
        const filteredGroupAvailability = Object.fromEntries(
          Object.entries(groupAvailability).filter(([_, v]) => v !== undefined)
        ) as Record<string, string[]>

        const manualAvailabilityMap = processPollParticipantAvailabilities(
          pollData,
          filteredGroupAvailability,
          monthStart,
          monthEnd,
          timezone,
          currentAccount,
          isHost,
          currentGuestEmail
        )

        manualAvailabilityMap.forEach((intervals, identifier) => {
          manualAvailabilityMap.set(identifier, mergeLuxonIntervals(intervals))
        })

        const participantMeta = new Map<string, { hasAccount: boolean }>()
        pollData.poll.participants.forEach(participant => {
          const identifier = (
            participant.account_address || participant.guest_email
          )?.toLowerCase()
          if (!identifier) return
          participantMeta.set(identifier, {
            hasAccount: !!participant.account_address,
          })
        })

        const accountAddresses = deduplicateArray(
          pollData.poll.participants
            .map(participant => participant.account_address?.toLowerCase())
            .filter(Boolean) as string[]
        )

        const defaultAvailabilityMap = new Map<string, Interval[]>()
        let quickPollAccountDetails: Account[] = []

        if (accountAddresses.length > 0) {
          quickPollAccountDetails = await getExistingAccounts(accountAddresses)

          quickPollAccountDetails.forEach(account => {
            const identifier = account.address?.toLowerCase()
            if (!identifier) return

            const defaultAvailability = mergeLuxonIntervals(
              parseMonthAvailabilitiesToDate(
                account.preferences?.availabilities || [],
                monthStart,
                monthEnd,
                account.preferences?.timezone || timezone
              )
            )

            if (defaultAvailability.length > 0) {
              defaultAvailabilityMap.set(identifier, defaultAvailability)
            }
          })
        }

        const visibleParticipants = Array.from(
          new Set(Object.values(filteredGroupAvailability).flat())
        )
        const visibleParticipantsData = pollData.poll.participants.filter(p => {
          const identifier = (p.account_address || p.guest_email)?.toLowerCase()
          return identifier && visibleParticipants.includes(identifier)
        })

        const quickPollParticipants = visibleParticipantsData.map(p => ({
          account_address: p.account_address,
          participant_id: p.id,
        }))

        const syntheticToRealIdMap = new Map<string, string>()
        visibleParticipantsData.forEach(p => {
          const realIdentifier = (
            p.account_address || p.guest_email
          )?.toLowerCase()
          if (!realIdentifier) return
          if (p.account_address) {
            syntheticToRealIdMap.set(
              p.account_address.toLowerCase(),
              realIdentifier
            )
          } else if (p.id) {
            syntheticToRealIdMap.set(`quickpoll_${p.id}`, realIdentifier)
          }
        })

        const busySlotsRaw = await fetchBusySlotsRawForQuickPollParticipants(
          quickPollParticipants,
          monthStart,
          monthEnd
        )

        const busySlotsMap: Map<string, Interval[]> = new Map()
        busySlotsRaw.forEach(busySlot => {
          const syntheticId = busySlot.account_address?.toLowerCase()
          if (!syntheticId) return
          const realIdentifier = syntheticToRealIdMap.get(syntheticId)
          if (!realIdentifier) return

          const interval = Interval.fromDateTimes(
            new Date(busySlot.start),
            new Date(busySlot.end)
          )
          if (interval.isValid) {
            const existing = busySlotsMap.get(realIdentifier) || []
            busySlotsMap.set(realIdentifier, [...existing, interval])
          }
        })

        const allIdentifiers = new Set<string>()
        manualAvailabilityMap.forEach((_, identifier) =>
          allIdentifiers.add(identifier)
        )
        defaultAvailabilityMap.forEach((_, identifier) =>
          allIdentifiers.add(identifier)
        )
        busySlotsMap.forEach((_, identifier) => allIdentifiers.add(identifier))
        visibleParticipants.forEach(identifier =>
          allIdentifiers.add(identifier.toLowerCase())
        )

        const finalAvailabilityMap = new Map<string, Interval[]>()

        allIdentifiers.forEach(identifier => {
          if (!identifier) return

          const manualAvailability = manualAvailabilityMap.get(identifier) || []
          const defaultAvailability =
            defaultAvailabilityMap.get(identifier) || []
          const busyTimes = busySlotsMap.get(identifier) || []
          const hasBusyEntry = busySlotsMap.has(identifier)
          const hasAccount =
            participantMeta.get(identifier)?.hasAccount ??
            defaultAvailability.length > 0

          // Extract overrides from participant's available_slots
          const participant = pollData.poll.participants.find(
            p =>
              p.account_address?.toLowerCase() === identifier ||
              p.guest_email?.toLowerCase() === identifier
          )
          const overrides = participant
            ? extractOverrideIntervals(
                participant,
                monthStart,
                monthEnd,
                timezone
              )
            : { additions: [], removals: [] }

          let manualToInclude = manualAvailability
          if (hasAccount && defaultAvailability.length > 0) {
            manualToInclude = clipIntervalsToBounds(
              manualAvailability,
              defaultAvailability
            )
          }

          let calendarBase: Interval[] = []
          if (hasBusyEntry) {
            if (hasAccount) {
              if (defaultAvailability.length > 0) {
                calendarBase = defaultAvailability
              } else if (manualAvailability.length > 0) {
                calendarBase = manualAvailability
              } else {
                calendarBase = generateFullDayBlocks(
                  monthStart,
                  monthEnd,
                  timezone
                )
              }
            } else {
              calendarBase = generateFullDayBlocks(
                monthStart,
                monthEnd,
                timezone
              )
            }
          } else if (hasAccount && defaultAvailability.length > 0) {
            calendarBase = defaultAvailability
          }

          let calendarFree: Interval[] = []
          if (hasBusyEntry && calendarBase.length > 0) {
            if (busyTimes.length > 0) {
              calendarFree = subtractBusyTimesFromBlocks(
                calendarBase,
                busyTimes
              )
            } else {
              calendarFree = calendarBase
            }
          } else if (
            !hasBusyEntry &&
            hasAccount &&
            defaultAvailability.length > 0
          ) {
            calendarFree = defaultAvailability
          }

          // Use computeBaseAvailability to get base (excludes existing removals)
          const baseAvailability = participant
            ? computeBaseAvailability(
                participant,
                manualAvailability,
                defaultAvailability,
                busyTimes,
                monthStart,
                monthEnd,
                timezone
              )
            : mergeLuxonIntervals([...manualToInclude, ...calendarFree])

          // Start with base availability
          let combined = baseAvailability

          // Apply overrides: add additions (even if busy), remove removals (even if free)
          if (overrides.additions.length > 0) {
            combined = mergeLuxonIntervals([
              ...combined,
              ...overrides.additions,
            ])

            const currentBusySlots = busySlotsMap.get(identifier) || []
            const updatedBusySlots = subtractRemovalIntervals(
              currentBusySlots,
              overrides.additions
            )
            busySlotsMap.set(identifier, updatedBusySlots)
          }

          if (overrides.removals.length > 0) {
            combined = mergeLuxonIntervals(
              subtractRemovalIntervals(combined, overrides.removals)
            )
          }

          finalAvailabilityMap.set(identifier, combined)
        })

        const freeSlotsMap: Map<string, Interval[]> = new Map()
        finalAvailabilityMap.forEach((availabilities, identifier) => {
          freeSlotsMap.set(identifier, mergeLuxonIntervals(availabilities))
        })

        const mockMeetingMembers = createMockMeetingMembers(
          pollData,
          currentAccount,
          isHost,
          currentGuestEmail,
          quickPollAccountDetails
        )

        setAvailableSlots(freeSlotsMap)
        setBusySlots(busySlotsMap)
        setDates(getDates(duration))
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

      const quickPollParticipants = allParticipants
        .filter(p => p.account_address)
        .map(p => ({
          account_address: p.account_address,
          participant_id: undefined,
        }))
        .concat([
          {
            account_address: currentAccount?.address,
            participant_id: undefined,
          },
        ])

      const [busySlots, meetingMembers] = await Promise.all([
        fetchBusySlotsRawForQuickPollParticipants(
          quickPollParticipants,
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
        getExistingAccounts(
          deduplicateArray(
            allParticipants
              .map(p => p.account_address)
              .filter(Boolean) as string[]
          )
        ),
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

      setBusySlots(busySlotsMap)
      setMeetingMembers(meetingMembers)
      setAvailableSlots(availableSlotsMap)
      setDates(getDates(duration))
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
    currentSelectedDate.month,
    duration,
    inviteModalOpen,
    isBreakpointResolved,
    pollData,
    isRefreshingAvailabilities,
  ])

  useEffect(() => {
    handleSlotLoad()
  }, [SLOT_LENGTH])

  useEffect(() => {
    setDates(getDates())
  }, [currentSelectedDate, timezone, SLOT_LENGTH])

  // This ensures that when editing starts again, slots are reloaded from the latest availability
  useEffect(() => {
    if (!isEditingAvailability) {
      setHasLoadedInitialSlots(false)
    }
  }, [isEditingAvailability])

  // Pre-select existing slots when editing starts
  useEffect(() => {
    if (
      !isEditingAvailability ||
      !currentUserIdentifier ||
      hasLoadedInitialSlots ||
      !loadSlots ||
      dates.length === 0
    ) {
      return
    }

    // Get user's existing availability slots
    const userSlots = effectiveAvailableSlots.get(currentUserIdentifier)
    if (!userSlots || userSlots.length === 0) {
      setHasLoadedInitialSlots(true)
      return
    }

    // Convert availability intervals to duration-sized slots that match rendered slots
    const allRenderedSlots = dates.flatMap(dateData => dateData.slots)
    const uniqueSlots = convertAvailabilityToSelectedSlots(
      userSlots,
      allRenderedSlots
    )

    // Load slots into the tracker
    if (uniqueSlots.length > 0 && typeof loadSlots === 'function') {
      loadSlots(uniqueSlots)
    }
    setHasLoadedInitialSlots(true)
  }, [
    isEditingAvailability,
    currentUserIdentifier,
    effectiveAvailableSlots,
    loadSlots,
    hasLoadedInitialSlots,
    dates,
    duration,
  ])

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
    const slots = getEmptySlots(DateTime.now(), duration >= 45 ? duration : 60)
    return slots.map(val => {
      const zonedTime = val.start.setZone(timezone)
      return zonedTime.toFormat(zonedTime.hour < 12 ? 'HH:mm a' : 'hh:mm a')
    })
  }, [duration, timezone])

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
          'No slots in the next 30 days work for all participants. Choose a time from the calendar grid that works best.',
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
    React.startTransition(() => {
      setPickedTime(time)
    })

    if (isHost && isSchedulingIntent) {
      if (pollData) {
        handlePageSwitch(Page.SCHEDULE_DETAILS)
      }
    }
  }

  const handleAvailabilityButtonClick = () => {
    if (currentAccount) {
      onSaveAvailability?.()
    } else {
      setShowMethodModal(true)
    }
  }

  const handleSelectManual = () => {
    setShowMethodModal(false)
    onSaveAvailability?.()
  }

  const handleSelectImport = () => {
    setShowMethodModal(false)
    if (!pollData?.poll) return

    saveQuickPollSignInContext({
      pollSlug: pollData.poll.slug,
      pollId: pollData.poll.id,
      pollTitle: pollData.poll.title,
      returnUrl: window.location.href,
    })

    openConnection()
  }

  return (
    <Tooltip.Provider delayDuration={400}>
      <VStack gap={4} w="100%">
        {/* Mobile Controls */}
        <VStack gap={4} w="100%" display={{ base: 'flex', md: 'none' }}>
          <VStack gap={2} alignItems={'flex-start'} width="100%">
            <HStack width="fit-content" gap={0}>
              <Heading fontSize="14px">Show times in</Heading>
              <InfoTooltip text="the default timezone is based on your availability settings" />
            </HStack>
            <Select
              value={tz}
              colorScheme="primary"
              onChange={_onChange}
              className="noLeftBorder timezone-select"
              options={tzOptions}
              components={customSelectComponents}
              chakraStyles={selectChakraStyles}
            />
          </VStack>

          <VStack gap={2} alignItems={'flex-start'} width="100%">
            <Heading fontSize="14px">Month</Heading>
            <Select
              value={monthValue}
              colorScheme="primary"
              onChange={newValue => _onChangeMonth(newValue)}
              className="noLeftBorder timezone-select"
              options={months}
              components={customSelectComponents}
              chakraStyles={selectChakraStyles}
            />
          </VStack>
        </VStack>

        {/* Desktop Controls */}
        <Flex
          w="100%"
          alignItems={{ lg: 'flex-end' }}
          flexDir={'row'}
          flexWrap="wrap"
          gap={6}
          zIndex={2}
          display={{ base: 'none', md: 'flex' }}
        >
          {onSaveAvailability && isEditAvailabilityIntent && (
            <HStack spacing={3}>
              <ChooseAvailabilityMethodModal
                isOpen={showMethodModal}
                onClose={() => setShowMethodModal(false)}
                onSelectManual={handleSelectManual}
                onSelectImport={handleSelectImport}
              >
                <Button
                  colorScheme="primary"
                  onClick={handleAvailabilityButtonClick}
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
                  {getAvailabilityButtonText()}
                </Button>
              </ChooseAvailabilityMethodModal>
              {isEditingAvailability && onCancelEditing && (
                <Button
                  variant="outline"
                  colorScheme="primary"
                  px="16px"
                  py="8px"
                  fontSize="16px"
                  fontWeight="700"
                  borderRadius="8px"
                  onClick={onCancelEditing}
                  isDisabled={isSavingAvailability}
                >
                  Cancel
                </Button>
              )}
            </HStack>
          )}
          <VStack gap={2} alignItems={'flex-start'} minW={'max-content'}>
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
              chakraStyles={selectChakraStyles}
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
              chakraStyles={selectChakraStyles}
            />
          </VStack>

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
          {isUpdatingMeeting && (
            <Button
              rightIcon={<FaArrowRight />}
              colorScheme="primary"
              _disabled={{
                bg: 'text-muted',
              }}
              isDisabled={!pickedTime}
              onClick={() => handlePageSwitch(Page.SCHEDULE_DETAILS)}
            >
              Continue scheduling
            </Button>
          )}
        </Flex>
        {typeof daysUntilExpiry === 'number' && (
          <Box w="100%" px={{ base: 0, md: 0 }}>
            <Text
              fontSize={{ base: '14px', md: '16px' }}
              fontWeight={700}
              color="text-primary"
            >
              This poll expires in:{' '}
              <Text as="span" color="primary.200" fontWeight={700}>
                {daysUntilExpiry} {daysUntilExpiry === 1 ? 'Day' : 'Days'}
              </Text>
            </Text>
          </Box>
        )}
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

        {/* Mobile Action Buttons */}
        <VStack gap={3} w="100%" display={{ base: 'flex', md: 'none' }}>
          {onSaveAvailability && (
            <>
              <ChooseAvailabilityMethodModal
                isOpen={showMethodModal}
                onClose={() => setShowMethodModal(false)}
                onSelectManual={handleSelectManual}
                onSelectImport={handleSelectImport}
              >
                <Button
                  colorScheme="primary"
                  size="md"
                  w="100%"
                  py={3}
                  fontSize="16px"
                  fontWeight="600"
                  borderRadius="8px"
                  onClick={handleAvailabilityButtonClick}
                  isLoading={isSavingAvailability}
                  loadingText="Saving..."
                  isDisabled={isSavingAvailability}
                >
                  {getAvailabilityButtonText()}
                </Button>
              </ChooseAvailabilityMethodModal>
              {isEditingAvailability && onCancelEditing && (
                <Button
                  variant="outline"
                  colorScheme="primary"
                  size="md"
                  w="100%"
                  py={3}
                  fontSize="16px"
                  fontWeight="600"
                  borderRadius="8px"
                  onClick={onCancelEditing}
                  isDisabled={isSavingAvailability}
                >
                  Cancel
                </Button>
              )}
            </>
          )}
          {onSharePoll && (
            <Button
              variant="outline"
              colorScheme="primary"
              leftIcon={<MdShare color="#F9B19A" size={20} />}
              onClick={onSharePoll}
              w="100%"
              py={3}
              fontSize="16px"
              fontWeight="600"
              borderRadius="8px"
            >
              Share Poll
            </Button>
          )}
        </VStack>

        {/* Mobile Availability Info Section */}
        <VStack
          gap={4}
          w="100%"
          alignItems="flex-start"
          display={{ base: 'flex', md: 'none' }}
        >
          <VStack align="flex-start" gap={2} w="100%">
            <Heading fontSize="16px" fontWeight={700} color="text-primary">
              Select all the time slots that work for you
            </Heading>
            <Text fontSize="14px" color="text-primary">
              Click on each cell to mark when you&apos;re available, so the host
              can easily find the best time for everyone.
            </Text>
          </VStack>

          {isHost && isSchedulingIntent && (
            <Button
              colorScheme="primary"
              onClick={handleJumpToBestSlot}
              w="100%"
              isLoading={isBestSlotLoading}
              py={3}
              fontSize="16px"
              fontWeight="600"
              borderRadius="8px"
            >
              Jump to Best Slot
            </Button>
          )}
        </VStack>

        <QuickPollParticipationInstructions />

        <VStack gap={0} w="100%" rounded={12} bg="bg-surface-secondary">
          <VStack
            pt={{ base: 3, md: 4 }}
            gap={{ base: 4, md: 6 }}
            w="100%"
            py={{ base: 3, md: 4 }}
            rounded={12}
            roundedBottom={0}
            position="sticky"
            top={0}
            zIndex={1}
            bg="bg-surface-secondary"
            borderWidth={1}
            borderColor={'input-border'}
            borderBottomWidth={0}
            px={{ base: 3, md: 6 }}
          >
            {/* Mobile Date Navigation */}
            <HStack
              w="100%"
              justify={'space-between'}
              position="relative"
              display={{ base: 'flex', md: 'none' }}
            >
              <IconButton
                aria-label={'left-icon'}
                icon={<FaChevronLeft />}
                onClick={handleScheduledTimeBack}
                isDisabled={isBackDisabled}
                size="sm"
                bg="bg-surface-tertiary"
                _hover={{ bg: 'bg-surface-tertiary' }}
              />

              <HStack gap={0}>
                <Grid
                  gridTemplateColumns={'1fr 1fr'}
                  justifyContent={'space-between'}
                  w="fit-content"
                  gap={1}
                >
                  {GUIDES.map((guide, index) => {
                    return (
                      <HStack key={index} gap={1}>
                        <Box w={4} h={4} bg={guide.color} borderRadius={3} />
                        <Text fontSize="12px" color="text-primary">
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
                  <Tooltip.Portal>
                    <Tooltip.Content style={{ zIndex: 1000 }} sideOffset={6}>
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
                                <Text fontSize="12px" color="text-primary">
                                  {guide.description}
                                </Text>
                              </HStack>
                            )
                          })}
                        </VStack>
                      </Box>
                      <Tooltip.Arrow color="#323F4B" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </HStack>

              <IconButton
                aria-label={'right-icon'}
                icon={<FaChevronRight />}
                onClick={handleScheduledTimeNext}
                size="sm"
                bg="bg-surface-tertiary"
                _hover={{ bg: 'bg-surface-tertiary' }}
              />
            </HStack>

            {/* Desktop Date Navigation */}
            <HStack
              w="100%"
              justify={'space-between'}
              position="relative"
              display={{ base: 'none', md: 'flex' }}
            >
              <HStack spacing={4}>
                <IconButton
                  aria-label={'left-icon'}
                  icon={<FaChevronLeft />}
                  onClick={handleScheduledTimeBack}
                  isDisabled={isBackDisabled}
                  gap={0}
                />
                {isHost && isSchedulingIntent && (
                  <Button
                    colorScheme="primary"
                    onClick={handleJumpToBestSlot}
                    display={{ lg: 'block', base: 'none' }}
                    isLoading={isBestSlotLoading}
                  >
                    Jump to Best Slot
                  </Button>
                )}
              </HStack>

              <Box
                maxW="400px"
                textAlign="center"
                display={{ lg: 'block', base: 'none' }}
              >
                <Heading fontSize="20px" fontWeight={700}>
                  Select all the time slots that work for you
                </Heading>
                <Text fontSize="12px">
                  Click on each cell to mark when you&apos;re available, so the
                  host can easily find the best time for everyone.
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
                  <Tooltip.Portal>
                    <Tooltip.Content style={{ zIndex: 1000 }} sideOffset={6}>
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
                  </Tooltip.Portal>
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
              gap={{ base: 2, md: 6 }}
            >
              <VStack
                align={'flex-start'}
                flex={1}
                justify={'flex-start'}
                gap={2}
              >
                <Box h={{ base: '40px', md: '48px' }} width={'100%'} />
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
                      <VStack
                        align={'center'}
                        w="100%"
                        h={{ base: 10, md: 12 }}
                        gap={0}
                      >
                        <Text
                          fontWeight={'700'}
                          fontSize={{
                            base: '14px',
                            md: '16px',
                          }}
                        >
                          {formatInTimeZone(date.date, timezone, 'dd')}
                        </Text>
                        <Text
                          fontWeight={'500'}
                          fontSize={{
                            base: '12px',
                            md: '14px',
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
              gap={{ base: 2, md: 6 }}
              px={{ base: 3, md: 6 }}
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
                        h={{ base: 10, md: 12 }}
                        my={'1px'}
                      >
                        <Text
                          fontWeight={'500'}
                          fontSize={{
                            base: '12px',
                            md: '14px',
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
                          return (
                            <QuickPollTimeSlot
                              key={slotData.slotKey}
                              slotData={slotData}
                              pickedTime={pickedTime}
                              duration={duration}
                              handleTimePick={handleTimeSelection}
                              timezone={timezone}
                              isQuickPoll={true}
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
