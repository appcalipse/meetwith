import { Box, FormHelperText, Input, VStack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

import { durationToHumanReadable } from '@/utils/calendar_manager'
import { parseDurationInput, validateDuration } from '@/utils/duration.helper'

import { CustomDurationInputProps } from './DurationModeSelector.types'

const CustomDurationInput: React.FC<CustomDurationInputProps> = ({
  value,
  onChange,
  isInvalid: externalIsInvalid,
  errorMessage: externalErrorMessage,
  onBlur,
  isDisabled,
}) => {
  const [inputValue, setInputValue] = useState('')
  const [localError, setLocalError] = useState<string | undefined>()
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (!isFocused && value > 0) {
      const hours = Math.floor(value / 60)
      const minutes = value % 60

      if (hours > 0 && minutes > 0) {
        setInputValue(`${hours}h ${minutes}m`)
      } else if (hours > 0) {
        setInputValue(`${hours}h`)
      } else {
        setInputValue(String(value))
      }
    }
  }, [value, isFocused])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInput = e.target.value
    setInputValue(newInput)

    const parsedMinutes = parseDurationInput(newInput)

    const validation = validateDuration(parsedMinutes)

    if (!validation.isValid) {
      setLocalError(validation.errorMessage)
    } else {
      setLocalError(undefined)
      if (parsedMinutes !== null) {
        onChange(parsedMinutes)
      }
    }
  }

  const handleBlur = () => {
    setIsFocused(false)
    if (onBlur) {
      onBlur()
    }

    const parsedMinutes = parseDurationInput(inputValue)
    const validation = validateDuration(parsedMinutes)

    if (!validation.isValid && value > 0) {
      // Reset to last valid value
      const hours = Math.floor(value / 60)
      const minutes = value % 60
      if (hours > 0 && minutes > 0) {
        setInputValue(`${hours}h ${minutes}m`)
      } else if (hours > 0) {
        setInputValue(`${hours}h`)
      } else {
        setInputValue(String(value))
      }
      setLocalError(undefined)
    }
  }

  const handleFocus = () => {
    setIsFocused(true)
    if (value > 0) {
      const hours = Math.floor(value / 60)
      const minutes = value % 60
      if (hours > 0 && minutes > 0) {
        setInputValue(`${hours}h${minutes}m`)
      } else if (hours > 0) {
        setInputValue(`${hours}h`)
      } else {
        setInputValue(String(value))
      }
    }
  }

  const hasError = externalIsInvalid || !!localError
  const displayError = externalErrorMessage || localError

  return (
    <VStack align="stretch" spacing={1} width="100%">
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder="e.g., 90, 1h 30m, or 2:30"
        isInvalid={hasError}
        errorBorderColor="red.500"
        borderColor="input-border"
        bg="select-bg"
        width={'max-content'}
        maxW="350px"
        isDisabled={isDisabled}
        _placeholder={{
          color: 'neutral.400',
        }}
      />
      <Box minH="20px">
        {displayError && (
          <FormHelperText color="red.500" mt={1} fontSize="sm">
            {displayError}
          </FormHelperText>
        )}
        {!displayError && value > 0 && !isFocused && (
          <FormHelperText color="neutral.400" mt={1} fontSize="sm">
            {durationToHumanReadable(value)}
          </FormHelperText>
        )}
        {!displayError && !value && (
          <FormHelperText color="neutral.400" mt={1} fontSize="sm">
            Enter duration in minutes (e.g., 90) or hours and minutes (e.g., 1h
            30m)
          </FormHelperText>
        )}
      </Box>
    </VStack>
  )
}

export default CustomDurationInput
