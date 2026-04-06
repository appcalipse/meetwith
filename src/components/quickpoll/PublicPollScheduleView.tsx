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
  VStack,
} from '@chakra-ui/react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Select } from 'chakra-react-select'
import { formatInTimeZone } from 'date-fns-tz'
import { DateTime, Interval } from 'luxon'
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { FaArrowLeft, FaChevronLeft, FaChevronRight } from 'react-icons/fa'

import InfoTooltip from '@/components/profile/components/Tooltip'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { PollCustomAvailability } from '@/types/QuickPoll'
import {
  customAvailabilityToSelectedSlots,
  getBrowserTimezone,
  isSlotWithinWeeklyRanges,
  selectedSlotsToCustomAvailability,
} from '@/utils/availability.helper'
import { customSelectComponents, Option } from '@/utils/constants/select'
import { getTimezones } from '@/utils/date_helper'
import {
  filterSlotsToPollRange,
  isDayInPollRange,
} from '@/utils/quickpoll_helper'
import { getEmptySlots } from '@/utils/slots.helper'
import { saveQuickPollSignInContext } from '@/utils/storage'

import ConnectCalendarModal from '../ConnectedCalendars/ConnectCalendarModal'
import {
  AvailabilityTrackerProvider,
  useAvailabilityTracker,
} from '../schedule/schedule-time-discover/AvailabilityTracker'
import QuickPollTimeSlot from '../schedule/schedule-time-discover/QuickPollTimeSlot'
import {
  getBgColor,
  State,
} from '../schedule/schedule-time-discover/SchedulePickTime'
import ChooseAvailabilityMethodModal from './ChooseAvailabilityMethodModal'

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

interface PublicPollScheduleViewProps {
  startDate: Date
  endDate: Date
  duration: number
  existingAvailability: PollCustomAvailability | null
  initialEditMode: boolean
  onSave: (availability: PollCustomAvailability) => void
  onBack: () => void
  pollTitle?: string
  pollSlug?: string
}

type DateWithSlots = {
  date: Date
  slots: Array<Interval<true>>
}

function PublicPollScheduleViewInner({
  startDate,
  endDate,
  duration,
  existingAvailability,
  initialEditMode,
  onSave,
  onBack,
  pollTitle,
  pollSlug,
}: PublicPollScheduleViewProps) {
  const [timezone, setTimezone] = useState(
    existingAvailability?.timezone || getBrowserTimezone()
  )
  const { loadSlots, selectedSlots, getAvailabilitySlots, clearSlots } =
    useAvailabilityTracker()
  const { openConnection } = useContext(OnboardingModalContext)

  const [isEditing, setIsEditing] = useState(initialEditMode)
  const [showMethodModal, setShowMethodModal] = useState(false)
  const [showConnectCalendarModal, setShowConnectCalendarModal] =
    useState(false)
  const hasLoadedInitial = useRef(false)
  const clearSlotsRef = useRef(clearSlots)

  useEffect(() => {
    clearSlotsRef.current = clearSlots
  }, [clearSlots])

  const SLOT_LENGTH =
    useBreakpointValue({ base: 3, md: 5, lg: 7 }, { ssr: true }) ?? 3

  const pollStart = useMemo(
    () => DateTime.fromJSDate(startDate).setZone(timezone).startOf('day'),
    [startDate, timezone]
  )
  const pollEnd = useMemo(
    () => DateTime.fromJSDate(endDate).setZone(timezone).endOf('day'),
    [endDate, timezone]
  )

  const [currentSelectedDate, setCurrentSelectedDate] = useState(
    () => pollStart
  )

  const tzOptions = useMemo(
    () =>
      getTimezones().map(tz => ({
        value: tz.tzCode,
        label: tz.name,
      })),
    []
  )

  const months = useMemo(() => {
    const options: Array<Option<string>> = []
    let cursor = pollStart.startOf('month')
    while (cursor <= pollEnd) {
      options.push({
        value: cursor.toISO() ?? cursor.toISODate() ?? '',
        label: cursor.toFormat('MMMM yyyy'),
      })
      cursor = cursor.plus({ months: 1 })
    }
    return options
  }, [pollStart, pollEnd])

  const selectChakraStyles = {
    container: (provided: SystemStyleObject) => ({
      ...provided,
      borderColor: 'input-border',
      bg: 'select-bg',
    }),
  }

  const dates: DateWithSlots[] = useMemo(() => {
    const monthStart = currentSelectedDate.setZone(timezone).startOf('month')
    const days = Array.from({ length: SLOT_LENGTH }, (_, k) => k)
      .map(k => currentSelectedDate.plus({ days: k }))
      .filter(val => monthStart.hasSame(val, 'month'))
    const filteredDays = days.filter(d =>
      isDayInPollRange(d, pollStart, pollEnd, timezone)
    )
    return filteredDays.map(date => {
      let slots = getEmptySlots(date, duration, timezone)
      slots = filterSlotsToPollRange(slots, pollStart, pollEnd)
      return {
        date: date.setZone(timezone).startOf('day').toJSDate(),
        slots,
      }
    })
  }, [currentSelectedDate, SLOT_LENGTH, timezone, pollStart, pollEnd, duration])

  const slotsWithState = useMemo(() => {
    return dates.map(dateEntry => ({
      ...dateEntry,
      slots: dateEntry.slots.map(slot => ({
        slot,
        state: (() => {
          if (!existingAvailability) return State.NONE_AVAILABLE
          const weekday = slot.start.weekday % 7
          const day = existingAvailability.weekly_availability.find(
            wa => wa.weekday === weekday
          )
          if (!day?.ranges?.length) return State.NONE_AVAILABLE

          const slotStartDt = slot.start.setZone(timezone)
          const slotEndDt = slot.end.setZone(timezone)
          const matches = isSlotWithinWeeklyRanges(
            slotStartDt,
            slotEndDt,
            day.ranges
          )
          return matches ? State.ALL_AVAILABLE : State.NONE_AVAILABLE
        })(),
        userStates: [] as Array<{ state: boolean; displayName: string }>,
        slotKey: `${slot.start.toISO()}-${slot.end.toISO()}`,
      })),
    }))
  }, [dates, existingAvailability, timezone])

  const HOURS_SLOTS = useMemo(() => {
    const slots = getEmptySlots(DateTime.now(), duration >= 45 ? duration : 60)
    return slots.map(val => {
      const zonedTime = val.start.setZone(timezone)
      return zonedTime.toFormat(zonedTime.hour < 12 ? 'HH:mm a' : 'hh:mm a')
    })
  }, [duration, timezone])

  useEffect(() => {
    if (hasLoadedInitial.current) return
    if (!existingAvailability || dates.length === 0) return

    const initialSlots = customAvailabilityToSelectedSlots(
      existingAvailability,
      dates
    )
    loadSlots(initialSlots)
    hasLoadedInitial.current = true
  }, [existingAvailability, dates, loadSlots, initialEditMode])

  useEffect(() => {
    // Keep internal edit state in sync with the parent view mode.
    // This prevents "Save availability" from showing after switching
    // from edit → view.
    setIsEditing(initialEditMode)
    hasLoadedInitial.current = false
    if (!initialEditMode && !existingAvailability) {
      clearSlotsRef.current()
    }
  }, [initialEditMode, existingAvailability])

  useEffect(() => {
    setCurrentSelectedDate(pollStart)
    hasLoadedInitial.current = false
  }, [pollStart])

  const isBackDisabled = useMemo(() => {
    const firstPollDay = pollStart.startOf('day')
    return currentSelectedDate <= firstPollDay
  }, [currentSelectedDate, pollStart])

  const isNextDisabled = useMemo(() => {
    const lastDate = currentSelectedDate.plus({ days: SLOT_LENGTH - 1 })
    return lastDate >= pollEnd.startOf('day')
  }, [currentSelectedDate, SLOT_LENGTH, pollEnd])

  const handleBack = useCallback(() => {
    setCurrentSelectedDate(prev => prev.minus({ days: SLOT_LENGTH }))
  }, [SLOT_LENGTH])

  const handleNext = useCallback(() => {
    setCurrentSelectedDate(prev => prev.plus({ days: SLOT_LENGTH }))
  }, [SLOT_LENGTH])

  const handleSave = useCallback(() => {
    const availabilitySlots = getAvailabilitySlots()
    const custom = selectedSlotsToCustomAvailability(
      availabilitySlots,
      timezone
    )
    onSave(custom)
  }, [getAvailabilitySlots, timezone, onSave])

  const handleCancel = useCallback(() => {
    if (existingAvailability && dates.length > 0) {
      const initialSlots = customAvailabilityToSelectedSlots(
        existingAvailability,
        dates
      )
      loadSlots(initialSlots)
    } else {
      clearSlots()
    }
    setIsEditing(false)
  }, [existingAvailability, dates, loadSlots, clearSlots])

  const handleSelectManual = useCallback(() => {
    setShowMethodModal(false)
    setIsEditing(true)
  }, [])

  const handleSelectImport = useCallback(() => {
    setShowMethodModal(false)
    if (pollSlug) {
      saveQuickPollSignInContext({
        pollSlug,
        pollId: '',
        pollTitle: pollTitle || '',
        returnUrl: window.location.href,
      })
      openConnection(`/poll/${pollSlug}`)
    }
  }, [pollSlug, pollTitle, openConnection])

  const handleSelectImportDirect = useCallback(() => {
    setShowMethodModal(false)
    setShowConnectCalendarModal(true)
  }, [])

  const hasAvailability = selectedSlots.length > 0

  return (
    <Tooltip.Provider delayDuration={400}>
      <VStack gap={4} w="100%">
        {/* Back */}
        <HStack
          color="primary.400"
          cursor="pointer"
          onClick={onBack}
          _hover={{ color: 'primary.500' }}
          w="fit-content"
          alignSelf="flex-start"
        >
          <FaArrowLeft />
          <Text fontWeight="medium">Back</Text>
        </HStack>

        <Heading
          fontSize={{ base: '20px', md: '24px' }}
          fontWeight={700}
          textAlign="left"
          alignSelf="flex-start"
          py={6}
        >
          My schedule
        </Heading>

        {/* Mobile / small tablet: add / edit / save — desktop row is desktopLg-only */}
        <HStack
          display={{ base: 'flex', desktopLg: 'none' }}
          w="100%"
          justify="flex-start"
          gap={3}
          flexWrap="wrap"
          pb={2}
        >
          {!isEditing ? (
            !existingAvailability ? (
              <ChooseAvailabilityMethodModal
                isOpen={showMethodModal}
                onClose={() => setShowMethodModal(false)}
                onSelectManual={handleSelectManual}
                onSelectImport={handleSelectImport}
                onSelectImportDirect={handleSelectImportDirect}
                showSignInCheckbox={true}
                variant="guest"
              >
                <Button
                  colorScheme="primary"
                  onClick={() => setShowMethodModal(true)}
                  px="16px"
                  py="8px"
                  fontSize="16px"
                  fontWeight="700"
                  borderRadius="8px"
                >
                  Add availability
                </Button>
              </ChooseAvailabilityMethodModal>
            ) : (
              <Button
                colorScheme="primary"
                onClick={() => setIsEditing(true)}
                px="16px"
                py="8px"
                fontSize="16px"
                fontWeight="700"
                borderRadius="8px"
              >
                Edit availability
              </Button>
            )
          ) : (
            <HStack spacing={3} flexWrap="wrap">
              <Button
                colorScheme="primary"
                onClick={handleSave}
                px="16px"
                py="8px"
                fontSize="16px"
                fontWeight="700"
                borderRadius="8px"
              >
                Save availability
              </Button>
              <Button
                variant="outline"
                colorScheme="primary"
                px="16px"
                py="8px"
                fontSize="16px"
                fontWeight="700"
                borderRadius="8px"
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </HStack>
          )}
        </HStack>

        {/* Controls (copied from QuickPollPickAvailability) */}
        <Flex
          w="100%"
          alignItems={{ lg: 'flex-end' }}
          flexDir={'row'}
          flexWrap="wrap"
          gap={6}
          zIndex={2}
          display={{ base: 'none', md: 'flex' }}
        >
          <VStack
            gap={2}
            alignItems={'flex-start'}
            width={{ base: '100%', lg: 'auto' }}
          >
            <HStack width="fit-content" gap={0}>
              <Heading fontSize="16px">Show times in</Heading>
              <InfoTooltip text="the default timezone is based on your availability settings" />
            </HStack>
            <Select
              value={{
                value: timezone,
                label:
                  tzOptions.find(t => t.value === timezone)?.label || timezone,
              }}
              colorScheme="primary"
              onChange={(newValue: unknown) => {
                if (Array.isArray(newValue)) return
                const next = newValue as Option<string>
                if (next?.value) setTimezone(String(next.value))
              }}
              className="noLeftBorder timezone-select"
              options={tzOptions}
              components={customSelectComponents}
              chakraStyles={selectChakraStyles}
            />
          </VStack>

          <VStack
            gap={2}
            alignItems={'flex-start'}
            width={{ base: '100%', lg: 'auto' }}
          >
            <Heading fontSize="16px">Month</Heading>
            <Select
              value={{
                value:
                  currentSelectedDate.startOf('month').toISO() ??
                  currentSelectedDate.startOf('month').toISODate() ??
                  '',
                label: currentSelectedDate.toFormat('MMMM yyyy'),
              }}
              colorScheme="primary"
              onChange={(newValue: unknown) => {
                if (Array.isArray(newValue)) return
                const next = newValue as Option<string>
                if (!next?.value) return
                const newMonth = DateTime.fromISO(String(next.value))
                  .setZone(timezone)
                  .startOf('day')
                setCurrentSelectedDate(
                  newMonth < pollStart ? pollStart : newMonth
                )
              }}
              className="noLeftBorder timezone-select"
              options={months}
              components={customSelectComponents}
              chakraStyles={selectChakraStyles}
            />
          </VStack>
        </Flex>

        {/* Grid container (copied from QuickPollPickAvailability structure) */}
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
            <HStack
              w="100%"
              justify="flex-start"
              position="relative"
              display={{ base: 'none', desktopLg: 'flex' }}
            >
              <HStack spacing={4}>
                <IconButton
                  aria-label={'left-icon'}
                  icon={<FaChevronLeft />}
                  onClick={handleBack}
                  isDisabled={isBackDisabled}
                  gap={0}
                />

                {!isEditing ? (
                  !existingAvailability ? (
                    <ChooseAvailabilityMethodModal
                      isOpen={showMethodModal}
                      onClose={() => setShowMethodModal(false)}
                      onSelectManual={handleSelectManual}
                      onSelectImport={handleSelectImport}
                      onSelectImportDirect={handleSelectImportDirect}
                      showSignInCheckbox={true}
                      variant="guest"
                    >
                      <Button
                        colorScheme="primary"
                        onClick={() => setShowMethodModal(true)}
                        px="16px"
                        py="8px"
                        fontSize="16px"
                        fontWeight="700"
                        borderRadius="8px"
                      >
                        Add availability
                      </Button>
                    </ChooseAvailabilityMethodModal>
                  ) : (
                    <Button
                      colorScheme="primary"
                      onClick={() => setIsEditing(true)}
                      px="16px"
                      py="8px"
                      fontSize="16px"
                      fontWeight="700"
                      borderRadius="8px"
                    >
                      Edit availability
                    </Button>
                  )
                ) : (
                  <HStack spacing={3}>
                    <Button
                      colorScheme="primary"
                      onClick={handleSave}
                      px="16px"
                      py="8px"
                      fontSize="16px"
                      fontWeight="700"
                      borderRadius="8px"
                    >
                      Save availability
                    </Button>
                    <Button
                      variant="outline"
                      colorScheme="primary"
                      px="16px"
                      py="8px"
                      fontSize="16px"
                      fontWeight="700"
                      borderRadius="8px"
                      onClick={handleCancel}
                    >
                      Cancel
                    </Button>
                  </HStack>
                )}
              </HStack>

              <Box
                maxW="400px"
                position="absolute"
                left="50%"
                transform="translateX(-50%)"
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

              <HStack gap={0} ml="auto">
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
                          fontSize={{ base: 'small', md: 'medium' }}
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
                                  fontSize={{ base: 'small', md: 'medium' }}
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
                aria-label={'right-icon'}
                icon={<FaChevronRight />}
                onClick={handleNext}
                isDisabled={isNextDisabled}
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
              {slotsWithState.map((date, index) => {
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
                          fontSize={{ base: '14px', md: '16px' }}
                        >
                          {formatInTimeZone(date.date, timezone, 'dd')}
                        </Text>
                        <Text
                          fontWeight={'500'}
                          fontSize={{ base: '12px', md: '14px' }}
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
            pointerEvents={isEditing ? 'auto' : 'none'}
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
                        fontSize={{ base: '12px', md: '14px' }}
                      >
                        {slot}
                      </Text>
                    </HStack>
                  )
                })}
              </VStack>
            </VStack>
            {slotsWithState.map((date, index) => {
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
                            pickedTime={null}
                            duration={duration}
                            handleTimePick={() => {}}
                            timezone={timezone}
                            isQuickPoll={true}
                            isEditingAvailability={isEditing}
                          />
                        )
                      })}
                    </VStack>
                  </VStack>
                </SlideFade>
              )
            })}
          </HStack>
        </VStack>

        <ConnectCalendarModal
          isOpen={showConnectCalendarModal}
          onClose={() => setShowConnectCalendarModal(false)}
          isQuickPoll={true}
        />
      </VStack>
    </Tooltip.Provider>
  )
}

export default function PublicPollScheduleView(
  props: PublicPollScheduleViewProps
) {
  return (
    <AvailabilityTrackerProvider>
      <Tooltip.Provider>
        <PublicPollScheduleViewInner {...props} />
      </Tooltip.Provider>
    </AvailabilityTrackerProvider>
  )
}
