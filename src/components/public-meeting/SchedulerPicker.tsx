import {
  Box,
  Flex,
  Heading,
  HStack,
  Icon,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import * as Sentry from '@sentry/nextjs'
import { chakraComponents, Props, Select } from 'chakra-react-select' // TODO: Move all date logic to luxon
import { DateTime, Interval } from 'luxon'
import React, { useCallback, useContext, useEffect, useMemo } from 'react'
import { FaArrowLeft, FaCalendar, FaClock, FaGlobe } from 'react-icons/fa'

import Loading from '@/components/Loading' // TODO: create helper function to merge availabilities from availability block
import Calendar from '@/components/MeetSlotPicker/calendar/index'
import TimeSlots from '@/components/MeetSlotPicker/TimeSlots'
import {
  PublicScheduleContext,
  ScheduleStateContext,
} from '@/components/public-meeting'
import { ScheduleForm } from '@/components/schedule/schedule-form'
import useAccountContext from '@/hooks/useAccountContext'
import { logEvent } from '@/utils/analytics'
import { doesContactExist } from '@/utils/api_helper'
import {
  getCustomSelectComponents,
  TimeZoneOption,
  timeZoneFilter,
} from '@/utils/constants/select'
import { getFormattedDateAndDuration, getTimezones } from '@/utils/date_helper'
import { generateTimeSlots } from '@/utils/slots.helper'

const SchedulerPicker = () => {
  const tzs: TimeZoneOption[] = useMemo(
    () =>
      getTimezones().map(tz => ({
        value: String(tz.tzCode),
        label: tz.name,
        searchKeys: tz.countries || [],
      })),
    []
  )
  const {
    currentMonth,
    setCurrentMonth,
    availableSlots,
    selfAvailableSlots,
    checkingSlots,
    checkedSelfSlots,
    isScheduling,
    pickedDay,
    setPickedDay,
    pickedTime,
    setPickedTime,
    showConfirm,
    setShowConfirm,
    selectedMonth,
    setSelectedMonth,
    busySlots,
    selfBusySlots,
    timezone,
    setTimezone,
    getAvailableSlots,
    rescheduleSlot,
    rescheduleSlotLoading,
    meetingSlotId,
    setShowSlots,
    showSlots,
  } = useContext(ScheduleStateContext)
  const color = useColorModeValue('primary.500', 'white')
  const { account, selectedType, notificationsSubs, setIsContact } = useContext(
    PublicScheduleContext
  )
  const currentAccount = useAccountContext()
  const slotDurationInMinutes = selectedType?.duration_minutes || 0

  useEffect(() => {
    if (rescheduleSlotLoading) return
    if (meetingSlotId && rescheduleSlot) {
      setPickedDay(new Date(rescheduleSlot.start))
      setPickedTime(new Date(rescheduleSlot.start))
      setCurrentMonth(new Date(rescheduleSlot.start))
      setSelectedMonth(new Date(rescheduleSlot.start))
    }
  }, [rescheduleSlotLoading, rescheduleSlot])

  useEffect(() => {
    if (account?.preferences?.availabilities) {
      getAvailableSlots()
    }
  }, [
    account?.preferences?.availabilities,
    currentMonth,
    selectedType,
    timezone.value,
  ])
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
    void handleContactCheck()
  }, [currentAccount, account])

  const validator = useCallback(
    (pickedDay: Date) => {
      const pickedDayInTimezone = DateTime.fromJSDate(pickedDay).setZone(
        timezone.value
      )
      const endOfDayInTimezone = pickedDayInTimezone.endOf('day').toJSDate()
      const minTime = selectedType?.min_notice_minutes || 0

      const timeSlots = generateTimeSlots(
        pickedDay,
        selectedType?.duration_minutes || 30,
        false,
        timezone.value,
        endOfDayInTimezone
      )
      const daySlots = availableSlots.filter(
        slot =>
          slot.overlaps(
            Interval.fromDateTimes(
              pickedDayInTimezone.startOf('day'),
              pickedDayInTimezone.endOf('day')
            )
          ) ||
          slot.start?.hasSame(
            DateTime.fromJSDate(pickedDay || new Date()),
            'day'
          )
      )
      const filtered = timeSlots.filter(slot => {
        const minScheduleTime = DateTime.now()
          .setZone(timezone.value)
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
          daySlots.some(available => available.engulfs(slot)) &&
          !busySlots.some(busy => busy.overlaps(slot))
        )
      })

      return filtered.length > 0
    },
    [
      availableSlots,
      busySlots,
      selectedType?.duration_minutes,
      selectedType?.min_notice_minutes,
      timezone.value,
      rescheduleSlot,
    ]
  )
  const _onChange = (newValue: unknown) => {
    if (Array.isArray(newValue)) return
    const timezone = newValue as TimeZoneOption | null
    if (timezone) setTimezone(timezone)
  }

  const handlePickTime = (time: Date) => {
    logEvent('Selected time')
    setPickedTime(time)
    setShowConfirm(true)
  }

  const startTime = pickedTime || new Date()

  const { formattedDate, timeDuration } = getFormattedDateAndDuration(
    timezone.value,
    startTime,
    selectedType?.duration_minutes || 0
  )
  const customComponents: Props<TimeZoneOption, boolean>['components'] = {
    ...getCustomSelectComponents<TimeZoneOption, boolean>(),
    Control: props => (
      <chakraComponents.Control {...props}>
        <FaGlobe size={24} /> {props.children}
      </chakraComponents.Control>
    ),
  }

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
          display={{ base: !showSlots ? 'block' : 'none', md: 'block' }}
        >
          <Calendar
            loading={checkingSlots}
            validator={validator}
            monthChanged={setCurrentMonth}
            pickDay={(day: Date) => {
              setPickedDay(day)
              setShowSlots(true)
            }}
            pickedDay={pickedDay || new Date()}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            timezone={timezone.value}
          />
        </Box>
        <VStack
          alignItems={{ md: 'flex-start', base: 'center' }}
          display={{ base: showSlots ? 'flex' : 'none', md: 'flex' }}
          w={{ base: '100%', md: 'auto' }}
        >
          <VStack alignItems={'flex-start'} w="100%">
            <HStack mb={0}>
              <Icon
                as={FaArrowLeft}
                onClick={() => {
                  setPickedDay(null)
                  setShowSlots(false)
                }}
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
              filterOption={timeZoneFilter}
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
              selectedType={selectedType}
              rescheduleSlot={rescheduleSlot}
              pickedTime={pickedTime}
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
          {meetingSlotId &&
            rescheduleSlot &&
            pickedTime?.getTime() !== rescheduleSlot.start.getTime() && (
              <FormerDate
                startTime={new Date(rescheduleSlot.start)}
                timezone={timezone.value}
                endTime={new Date(rescheduleSlot.end)}
                duration_minutes={selectedType?.duration_minutes || 0}
              />
            )}
          <HStack>
            <FaCalendar size={24} />
            <Text textAlign="left">
              {`${formattedDate}, ${timeDuration}`}
              {pickedTime?.getTime() === rescheduleSlot?.start?.getTime() &&
                ' (Current booking)'}
            </Text>
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
        <VStack
          align="flex-start"
          flexBasis={{ base: '100%', '2xl': '50%' }}
          mt={{
            base: 4,
            '2xl': 0,
          }}
        >
          <HStack mb={0} cursor="pointer" onClick={() => setShowConfirm(false)}>
            <Icon as={FaArrowLeft} size="1.5em" color={color} />
            <Heading size="md" color={color}>
              Meeting Information
            </Heading>
          </HStack>
          <ScheduleForm
            pickedTime={pickedTime!}
            isSchedulingExternal={isScheduling}
            notificationsSubs={notificationsSubs}
            preferences={account?.preferences}
          />
        </VStack>
      </HStack>
    </Box>
  )
}
const FormerDate = ({
  startTime,
  timezone,
  endTime,
  duration_minutes = 0,
}: {
  startTime: Date
  timezone: string
  endTime: Date
  duration_minutes?: number
}) => {
  const { formattedDate, timeDuration } = getFormattedDateAndDuration(
    timezone,
    startTime,
    duration_minutes,
    endTime
  )
  return (
    <HStack>
      <FaCalendar size={24} />
      <Text textAlign="left">
        Former Time:{' '}
        <Text textDecor="line-through">{`${formattedDate}, ${timeDuration}`}</Text>
      </Text>
    </HStack>
  )
}
export default SchedulerPicker
