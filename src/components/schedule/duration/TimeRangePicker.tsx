import {
  Box,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Select as ChakraSelect,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'

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
  errorMessage: externalErrorMessage,
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
  const displayError = externalErrorMessage || localError

  return (
    <VStack align="stretch" spacing={2} width="100%">
      <HStack spacing={4} align="flex-start" flexWrap="wrap">
        <FormControl
          w={'fit-content'}
          isInvalid={hasError}
          isDisabled={isDisabled}
        >
          <FormLabel htmlFor="start-time">
            Start time
            <Text color="red.500" display="inline">
              {' '}
              *
            </Text>
          </FormLabel>
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

        <FormControl
          w={'fit-content'}
          isInvalid={hasError}
          isDisabled={isDisabled}
        >
          <FormLabel htmlFor="end-time">
            End time
            <Text color="red.500" display="inline">
              {' '}
              *
            </Text>
          </FormLabel>
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
      </HStack>

      <Box minH="20px">
        {displayError && (
          <FormHelperText color="red.500" mt={1} fontSize="sm">
            {displayError}
          </FormHelperText>
        )}
        {!displayError && (
          <FormHelperText color="neutral.400" mt={1} fontSize="sm">
            Select a time window between 00:00 AM - 11:45 PM
          </FormHelperText>
        )}
      </Box>
    </VStack>
  )
}

export default TimeRangePicker
