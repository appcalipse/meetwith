import {
  Box,
  HStack,
  Icon,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { format } from 'date-fns'
import React, { useState } from 'react'
import { FaArrowLeft, FaCalendar, FaClock } from 'react-icons/fa'

import { SchedulingType } from '../../types/Meeting'
import { logEvent } from '../../utils/analytics'
import Loading from '../Loading'
import { ScheduleForm } from '../schedule/schedule-form'
import Calendar from './calendar'
import { Popup, PopupHeader, PopupWrapper } from './Popup'
import TimeSlots from './time-slots'
import { preventPastDays } from './validators'

interface MeetSlotPickerProps {
  onSchedule: (
    scheduleType: SchedulingType,
    startTime: Date,
    guestEmail?: string,
    name?: string,
    content?: string,
    meetingUrl?: string
  ) => Promise<boolean>
  timeSlotAvailability: (slot: Date) => boolean
  slotDurationInMinutes: number
  onDayChange?: (day: Date) => void
  onMonthChange?: (day: Date) => void
  willStartScheduling: (isScheduling: boolean) => void
  isSchedulingExternal: boolean
  checkingSlots: boolean
  reset: boolean
}

const MeetSlotPicker: React.FC<MeetSlotPickerProps> = ({
  onSchedule,
  timeSlotAvailability,
  slotDurationInMinutes,
  onDayChange,
  onMonthChange,
  willStartScheduling,
  isSchedulingExternal,
  checkingSlots,
  reset,
}) => {
  const [pickedDay, setPickedDay] = useState(null as Date | null)
  const [pickedTime, setPickedTime] = useState(null as Date | null)
  const [showPickTime, setShowPickTime] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  React.useEffect(() => {
    if (reset) {
      setPickedDay(null)
      setPickedTime(null)
      setShowPickTime(false)
      setShowConfirm(false)
    }
  }, [reset])

  const handlePickDay = (day: Date) => {
    if (pickedDay !== day) {
      onDayChange && onDayChange(day)
    }
    logEvent('Selected day')
    setPickedDay(day)
    setShowPickTime(true)
  }

  const handlePickTime = (time: Date) => {
    logEvent('Selected time')
    setPickedTime(time)
    setShowPickTime(false)
    setShowConfirm(true)
    willStartScheduling(true)
  }

  const handleClosePickTime = () => {
    setShowPickTime(false)
  }

  const handleCloseConfirm = () => {
    willStartScheduling(false)
    setShowConfirm(false)
    setShowPickTime(true)
  }

  const color = useColorModeValue('orange.500', 'orange.400')

  return (
    <PopupWrapper>
      {!showPickTime && !showConfirm && (
        <Calendar
          validator={preventPastDays}
          monthChanged={onMonthChange}
          pickDay={handlePickDay}
        />
      )}

      {showPickTime &&
        (checkingSlots ? (
          <Box>
            <Loading label="Checking availability" />
          </Box>
        ) : (
          <Popup>
            <PopupHeader>
              <HStack mb={4} cursor="pointer" onClick={handleClosePickTime}>
                <Icon as={FaArrowLeft} size="1.5em" color={color} />
                <Text ml={3} color={color}>
                  Back
                </Text>
              </HStack>
              <HStack alignItems="flex-start">
                <Box mt="4px">
                  <FaCalendar />
                </Box>
                <VStack alignItems="flex-start">
                  <Text>{format(pickedDay!, 'PPPP')}</Text>
                  <Text fontSize="sm">
                    Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                  </Text>
                </VStack>
              </HStack>
            </PopupHeader>

            <TimeSlots
              pickedDay={pickedDay}
              slotSizeMinutes={slotDurationInMinutes}
              validator={timeSlotAvailability}
              pickTime={handlePickTime}
            />
          </Popup>
        ))}

      {showConfirm && (
        <Popup>
          <PopupHeader>
            <HStack mb={4} cursor="pointer" onClick={handleCloseConfirm}>
              <Icon as={FaArrowLeft} size="1.5em" color={color} />
              <Text ml={3} color={color}>
                Back
              </Text>
            </HStack>
            <HStack>
              <FaCalendar />
              <Text>{format(pickedDay!, 'PPPP')}</Text>
            </HStack>

            <HStack>
              <FaClock />
              <Text>{format(pickedTime!, 'HH:mm')}</Text>
            </HStack>
          </PopupHeader>

          <ScheduleForm
            onConfirm={onSchedule}
            willStartScheduling={willStartScheduling}
            pickedTime={pickedTime!}
            isSchedulingExternal={isSchedulingExternal}
          />
        </Popup>
      )}
    </PopupWrapper>
  )
}

export default MeetSlotPicker
