import {
  Flex,
  HStack,
  Image,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { RescheduleConferenceData } from '@components/public-meeting'
import { DateTime, Interval } from 'luxon'
import { FC, useContext, useMemo } from 'react'

import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { MeetingType } from '@/types/Account'
import { generateTimeSlots } from '@/utils/slots.helper'

interface IProps {
  pickedDay: Date
  pickedTime: Date | null
  slotSizeMinutes: number
  pickTime: (date: Date) => void
  showSelfAvailability: boolean
  availableSlots: Interval<true>[]
  busySlots: Interval<true>[]
  selfAvailableSlots: Interval<true>[]
  selfBusySlots: Interval<true>[]
  timezone?: string
  selectedType?: MeetingType | null
  rescheduleSlot?: RescheduleConferenceData
}

const TimeSlots: FC<IProps> = ({
  pickedDay,
  slotSizeMinutes,
  pickTime,
  showSelfAvailability,
  availableSlots,
  busySlots,
  selfAvailableSlots,
  selfBusySlots,
  selectedType,
  rescheduleSlot,
  pickedTime,
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone, // Default to local timezone
}) => {
  const { openConnection } = useContext(OnboardingModalContext)
  const { currentAccount } = useContext(AccountContext)
  const pickedDayInTimezone = DateTime.fromJSDate(pickedDay).setZone(timezone)
  const endOfDayInTimezone = pickedDayInTimezone.endOf('day').toJSDate()
  const minTime = selectedType?.min_notice_minutes || 0
  const timeSlots = generateTimeSlots(
    pickedDay,
    slotSizeMinutes,
    false,
    timezone,
    endOfDayInTimezone
  )
  const daySlots = useMemo(() => {
    return availableSlots.filter(
      slot =>
        slot.overlaps(
          Interval.fromDateTimes(
            pickedDayInTimezone.startOf('day'),
            pickedDayInTimezone.endOf('day')
          )
        ) ||
        slot.start.hasSame(DateTime.fromJSDate(pickedDay || new Date()), 'day')
    )
  }, [availableSlots, pickedDay, timezone])
  const selDaySlots = useMemo(() => {
    return selfAvailableSlots.filter(
      slot =>
        slot.overlaps(
          Interval.fromDateTimes(
            pickedDayInTimezone.startOf('day'),
            pickedDayInTimezone.endOf('day')
          )
        ) ||
        slot.start?.hasSame(DateTime.fromJSDate(pickedDay || new Date()), 'day')
    )
  }, [selfAvailableSlots, pickedDay, timezone])
  const filtered = timeSlots.filter(slot => {
    const minScheduleTime = DateTime.now()
      .setZone(timezone)
      .plus({ minutes: minTime })
    if (rescheduleSlot) {
      const rescheduleInterval = Interval.fromDateTimes(
        rescheduleSlot.start,
        rescheduleSlot.end
      )
      if (rescheduleInterval.overlaps(slot)) {
        return true
      }
    }

    if (minScheduleTime > slot.start) {
      return false
    }

    return (
      daySlots.some(available => available.overlaps(slot)) &&
      !busySlots.some(busy => busy.overlaps(slot))
    )
  })
  const selfAvailabilityCheck = (slot: Interval): boolean => {
    return (
      selDaySlots.some(selfSlot => selfSlot.overlaps(slot)) &&
      !selfBusySlots.some(busySlot => busySlot.overlaps(slot))
    )
  }
  const borderColor = useColorModeValue('neutral.200', 'neutral.500')
  const circleColor = useColorModeValue('primary.500', 'primary.500')
  const textColor = useColorModeValue('primary.500', 'neutral.100')
  return (
    <>
      {!currentAccount && (
        <HStack
          width={{ base: '100%', md: '80%', lg: '70%' }}
          minW="220px"
          border="1px solid"
          borderColor={borderColor}
          bgColor={circleColor}
          p={2}
          justifyContent="center"
          mb={4}
          cursor="pointer"
          onClick={() => openConnection(undefined, false)}
        >
          <Text flex={1} fontSize={'sm'} textAlign="center" color="white">
            Sign in to see your availability
          </Text>
        </HStack>
      )}
      {showSelfAvailability && (
        <HStack
          width={{ base: '100%', md: '80%', lg: '70%' }}
          border="1px solid"
          borderColor={borderColor}
          p={2}
          justifyContent="center"
          mb={4}
        >
          <Text flex={1} fontSize={'sm'} textAlign="center">
            Times you are available
          </Text>
          <Flex
            borderRadius="50%"
            w="10px"
            h="10px"
            marginEnd={'8px !important'}
            backgroundColor={circleColor}
          />
        </HStack>
      )}
      {filtered.length > 0 ? (
        <VStack w="100%" alignItems="flex-start">
          {filtered.map(slot => {
            return (
              <Flex
                key={slot.start.toISOTime()}
                onClick={() => pickTime(slot.start.toJSDate())}
                width={{ base: '100%', md: '80%', lg: '70%' }}
                borderWidth={2}
                borderColor={
                  pickedTime &&
                  slot.start.hasSame(DateTime.fromJSDate(pickedTime), 'minute')
                    ? textColor
                    : borderColor
                }
                px={4}
                py={3}
                justifyContent="center"
                alignItems="center"
                _hover={{
                  cursor: 'pointer',
                  color: 'white',
                  bgColor: 'primary.400',
                  borderColor: textColor,
                }}
                bg={
                  pickedTime &&
                  slot.start.hasSame(DateTime.fromJSDate(pickedTime), 'minute')
                    ? 'primary.400'
                    : 'transparent'
                }
                role={'group'}
                borderRadius={8}
                color={textColor}
                transitionProperty="all"
                transitionDuration="300ms"
                transitionTimingFunction="ease-in-out"
              >
                {
                  <Text flex={1} fontWeight="bold">
                    {slot.start.setZone(timezone).toFormat('h:mm a')}
                  </Text>
                }
                {showSelfAvailability && selfAvailabilityCheck(slot) ? (
                  <Flex
                    borderRadius="50%"
                    w="10px"
                    h="10px"
                    bgColor={circleColor}
                    _groupHover={{
                      bgColor: 'white',
                    }}
                    ml={-4}
                    mr={2}
                  />
                ) : (
                  <Flex w="10px" h="10px" ml={-3} />
                )}
              </Flex>
            )
          })}
        </VStack>
      ) : (
        <VStack alignItems="center">
          <Image
            src="/assets/no_meetings.svg"
            w="200px"
            pb={4}
            alt="No slots available"
          />
          <Text>No slots available for this day</Text>
        </VStack>
      )}
    </>
  )
}

export default TimeSlots
