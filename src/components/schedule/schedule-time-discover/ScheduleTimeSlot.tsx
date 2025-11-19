import {
  Box,
  Button,
  HStack,
  Link,
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { formatWithOrdinal, getMeetingBoundaries } from '@utils/date_helper'
import { DateTime, Interval } from 'luxon'
import React, { FC, useMemo } from 'react'
import { FaArrowRight } from 'react-icons/fa6'

import { Account } from '@/types/Account'
import { TimeSlot } from '@/types/Meeting'
import { generateCalendarEventUrl } from '@/utils/calendar_event_url'
import {
  EVENT_TITLE_ELLIPSIS_START_INDEX,
  EVENT_TITLE_MAX_LENGTH,
  EVENT_TITLE_TRUNCATE_LENGTH,
} from '@/utils/constants'
import { getAccountDisplayName } from '@/utils/user_manager'

import { getBgColor, State } from './SchedulePickTime'

export interface ScheduleTimeSlotProps {
  slotData: {
    slot: Interval<true>
    state: State
    userStates: Array<{ state: boolean; displayName: string }>
    slotKey: string
  }
  pickedTime: Date | null
  handleTimePick: (time: Date) => void
  timezone: string
  duration: number
  busySlotsWithDetails?: Map<string, TimeSlot[]>
  currentAccountAddress?: string
  meetingMembers?: Account[]
}

const ScheduleTimeSlot: FC<ScheduleTimeSlotProps> = ({
  slotData,
  pickedTime,
  handleTimePick: pickTime,
  timezone,
  duration,
  busySlotsWithDetails,
  currentAccountAddress,
  meetingMembers,
}) => {
  const itemsBgColor = useColorModeValue('white', 'gray.600')
  const { slot, state, userStates } = slotData
  const toast = useToast()
  const handleTimePick = () => {
    if (pickTime) {
      if (slot.start < DateTime.now().setZone(timezone)) {
        toast({
          title: 'Invalid time selection',
          description: 'You cannot select a time in the past.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        })
        return
      }
      pickTime(slot.start.toJSDate())
    }
  }
  const isActive = pickedTime
    ? slot.start.hasSame(DateTime.fromJSDate(pickedTime), 'minute')
    : false

  const { isTopElement, isBottomElement } = getMeetingBoundaries(slot, duration)

  // Find event details for current user if they're unavailable
  const currentUserEvent = useMemo(() => {
    if (!currentAccountAddress || !busySlotsWithDetails) {
      return null
    }

    // Find overlapping event for current user
    const userBusySlots = busySlotsWithDetails.get(
      currentAccountAddress.toLowerCase()
    )
    if (!userBusySlots || userBusySlots.length === 0) {
      return null
    }

    const overlappingEvent = userBusySlots.find(busySlot => {
      const busyStart =
        busySlot.start instanceof Date
          ? busySlot.start
          : new Date(busySlot.start)
      const busyEnd =
        busySlot.end instanceof Date ? busySlot.end : new Date(busySlot.end)
      const busyInterval = Interval.fromDateTimes(
        DateTime.fromJSDate(busyStart),
        DateTime.fromJSDate(busyEnd)
      )
      return busyInterval.overlaps(slot)
    })

    if (!overlappingEvent) {
      return null
    }

    // Only show event details if we have event information (title or eventId)
    if (
      overlappingEvent.eventTitle ||
      overlappingEvent.eventId ||
      overlappingEvent.eventWebLink
    ) {
      return overlappingEvent
    }

    return null
  }, [slot, currentAccountAddress, busySlotsWithDetails])

  // Generate calendar URL for the event
  const eventUrl = useMemo(() => {
    if (!currentUserEvent) {
      return null
    }
    return generateCalendarEventUrl(
      currentUserEvent.source,
      currentUserEvent.eventId,
      currentUserEvent.eventWebLink
    )
  }, [currentUserEvent])

  // Truncate event title to match design
  const truncatedTitle = useMemo(() => {
    if (!currentUserEvent?.eventTitle) {
      return null
    }
    const title = currentUserEvent.eventTitle
    if (title.length <= EVENT_TITLE_MAX_LENGTH) {
      return title
    }
    return (
      title.substring(
        EVENT_TITLE_ELLIPSIS_START_INDEX,
        EVENT_TITLE_TRUNCATE_LENGTH
      ) + '...'
    )
  }, [currentUserEvent])

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
  return (
    <Tooltip.Root key={slot.start.toISOTime()}>
      <Tooltip.Trigger asChild>
        <Button
          bg={getBgColor(state)}
          w="100%"
          h={`${(duration >= 45 ? 12 : 12 / (60 / (duration || 30))) * 4}px`}
          m={0}
          mb={isBottomElement ? '1px' : 0}
          mt={isTopElement ? '1px' : 0}
          borderTopRadius={isTopElement ? 4 : 0}
          borderBottomRadius={isBottomElement ? 4 : 0}
          cursor={'pointer'}
          onClick={() => handleTimePick()}
          isActive={isActive}
          borderColor={'gray.700'}
          borderTopWidth={isTopElement ? 1 : 0}
          borderBottomWidth={isBottomElement ? 1 : 0}
          data-state={state}
          _active={{
            cursor: 'pointer',
            color: 'white',
            bgColor: 'primary.400',
            borderColor: 'primary.500',
          }}
          _hover={{
            border: '2px solid #F35826',
          }}
        />
      </Tooltip.Trigger>
      <Tooltip.Content style={{ zIndex: 10 }} side="right">
        <Box
          p={2}
          bg={itemsBgColor}
          borderRadius={10}
          boxShadow="md"
          py={3}
          px={4}
        >
          <Text mb={'7px'}>
            {formatWithOrdinal(slot)} ({timezone})
          </Text>

          {(() => {
            // Separate current user from other participants
            const currentUserState = userStates?.find(userState => {
              const accountAddress = displayNameToAddress.get(
                userState.displayName
              )
              return accountAddress === currentAccountAddress?.toLowerCase()
            })

            const otherUserStates =
              userStates?.filter(userState => {
                const accountAddress = displayNameToAddress.get(
                  userState.displayName
                )
                return accountAddress !== currentAccountAddress?.toLowerCase()
              }) || []

            return (
              <>
                {/* Show current user first */}
                {currentUserState && (
                  <VStack
                    w="fit-content"
                    gap={1}
                    align={'flex-start'}
                    mb={currentUserEvent ? 3 : 2}
                  >
                    <HStack>
                      <Box
                        w={4}
                        h={4}
                        rounded={999}
                        bg={currentUserState.state ? 'green.400' : 'neutral.0'}
                      />
                      <Text>{`${currentUserState.displayName} (You)`}</Text>
                    </HStack>
                  </VStack>
                )}

                {/* Show event details if current user is unavailable */}
                {currentUserEvent && (
                  <Box
                    mb={3}
                    p={3}
                    bg="neutral.200"
                    borderRadius={10}
                    borderWidth={0}
                  >
                    <Text
                      fontSize="12.8px"
                      fontWeight="500"
                      mb={1.5}
                      color="neutral.900"
                    >
                      YOUR CALENDAR EVENT BLOCKING SLOT
                      {currentUserEvent.eventEmail && (
                        <span
                          style={{
                            fontSize: '12.8px',
                            fontWeight: '700',
                            color: 'neutral.900',
                          }}
                        >
                          {' '}
                          - {currentUserEvent.eventEmail}
                        </span>
                      )}
                    </Text>
                    {truncatedTitle && (
                      <Text
                        fontSize="16px"
                        fontWeight="500"
                        color="neutral.900"
                        mb={2}
                      >
                        {truncatedTitle}
                      </Text>
                    )}
                    {eventUrl && (
                      <HStack gap={1}>
                        <Link
                          href={eventUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          fontSize="16px"
                          color="primary.500"
                          fontWeight="500"
                          textDecoration="underline"
                        >
                          Open this event
                        </Link>
                        <FaArrowRight size={12} color="#F35826" />
                      </HStack>
                    )}
                  </Box>
                )}

                {/* Show other participants */}
                {otherUserStates.length > 0 && (
                  <>
                    <Text
                      fontSize="18px"
                      fontWeight="700"
                      mb={2}
                      color="#ffffff"
                    >
                      OTHERS AVAILABILITY
                    </Text>

                    <VStack w="fit-content" gap={1} align={'flex-start'}>
                      {otherUserStates.map((userState, index) => (
                        <HStack key={index}>
                          <Box
                            w={4}
                            h={4}
                            rounded={999}
                            bg={userState.state ? 'green.400' : 'neutral.0'}
                          />
                          <Text>{userState.displayName}</Text>
                        </HStack>
                      ))}
                    </VStack>
                  </>
                )}
              </>
            )
          })()}
        </Box>
        <Tooltip.Arrow />
      </Tooltip.Content>
    </Tooltip.Root>
  )
}
export default React.memo(ScheduleTimeSlot)
