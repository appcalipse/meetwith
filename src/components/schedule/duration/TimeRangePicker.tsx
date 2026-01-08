import {
  FormControl,
  FormLabel,
  HStack,
  Select as ChakraSelect,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'

import InfoTooltip from '@/components/profile/components/Tooltip'
import {
  convertTime12To24,
  convertTime24To12,
  validateTimeRange,
} from '@/utils/availability.helper'
import { allSlots } from '@/utils/calendar_manager'

import { TimeRangePickerProps } from './DurationModeSelector.types'

const TimeRangePicker: React.FC<TimeRangePickerProps> = ({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  isInvalid: externalIsInvalid,
  isDisabled,
}) => {
  const [localError, setLocalError] = useState<string | undefined>()

  const timeOptions = useMemo(() => {
    return allSlots
      .filter(slot => slot !== '24:00')
      .map(slot => ({
        value24: slot,
        display12: convertTime24To12(slot),
      }))
  }, [])

  const startTime12 = useMemo(() => {
    return startTime ? convertTime24To12(startTime) : ''
  }, [startTime])

  const endTime12 = useMemo(() => {
    return endTime ? convertTime24To12(endTime) : ''
  }, [endTime])

  useEffect(() => {
    if (startTime && endTime) {
      const isValid = validateTimeRange(startTime, endTime)
      if (!isValid) {
        setLocalError('End time must be after start time')
      } else {
        setLocalError(undefined)
      }
    } else {
      setLocalError(undefined)
    }
  }, [startTime, endTime])

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected12 = e.target.value
    const selected24 = convertTime12To24(selected12)
    onStartTimeChange(selected24)

    // If end time is now before or equal to start time, update it
    if (endTime && validateTimeRange(selected24, endTime) === false) {
      // Find next valid end time (15 minutes after start)
      const [hours, minutes] = selected24.split(':').map(Number)
      const nextEndMinutes = minutes + 15
      const nextEndHours = nextEndMinutes >= 60 ? hours + 1 : hours
      const adjustedMinutes =
        nextEndMinutes >= 60 ? nextEndMinutes - 60 : nextEndMinutes

      if (nextEndHours < 24) {
        const adjusted24 = `${String(nextEndHours).padStart(2, '0')}:${String(
          adjustedMinutes
        ).padStart(2, '0')}`
        onEndTimeChange(adjusted24)
      }
    }
  }

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected12 = e.target.value
    const selected24 = convertTime12To24(selected12)
    onEndTimeChange(selected24)
  }

  const hasError = externalIsInvalid || !!localError

  return (
    <>
      <VStack
        gap={2}
        alignItems={'flex-start'}
        width="fit-content"
        minW={'10px'}
      >
        <FormControl
          w={'fit-content'}
          isInvalid={hasError}
          isDisabled={isDisabled}
        >
          <HStack width="fit-content" gap={0}>
            <FormLabel htmlFor="start-time" mb={0} mr={0}>
              Start time
            </FormLabel>
            <InfoTooltip
              text="The earliest time the meeting can begin. Only time slots starting at or after this time will be shown."
              ml={1}
            />
          </HStack>
          <ChakraSelect
            id="start-time"
            value={startTime12}
            onChange={handleStartTimeChange}
            placeholder="Start time"
            borderColor="input-border"
            bg="select-bg"
            width={'max-content'}
            maxW="350px"
            errorBorderColor="red.500"
            isDisabled={isDisabled}
          >
            {timeOptions.map(option => (
              <option key={option.value24} value={option.display12}>
                {option.display12}
              </option>
            ))}
          </ChakraSelect>
        </FormControl>
      </VStack>

      <VStack
        gap={2}
        alignItems={'flex-start'}
        width="fit-content"
        minW={'10px'}
      >
        <FormControl
          w={'fit-content'}
          isInvalid={hasError}
          isDisabled={isDisabled}
        >
          <HStack width="fit-content" gap={0}>
            <FormLabel htmlFor="end-time" mb={0} mr={0}>
              End time
            </FormLabel>
            <InfoTooltip
              text="The latest time the meeting should end. The meeting duration equals the time between start and end."
              ml={1}
            />
          </HStack>
          <ChakraSelect
            id="end-time"
            value={endTime12}
            onChange={handleEndTimeChange}
            placeholder="End time"
            borderColor="input-border"
            bg="select-bg"
            width={'max-content'}
            maxW="350px"
            errorBorderColor="red.500"
            isDisabled={isDisabled}
          >
            {timeOptions.map(option => (
              <option key={option.value24} value={option.display12}>
                {option.display12}
              </option>
            ))}
          </ChakraSelect>
        </FormControl>
      </VStack>
    </>
  )
}

export default TimeRangePicker
