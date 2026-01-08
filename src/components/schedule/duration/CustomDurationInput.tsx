import { FormControl, FormLabel, HStack, Input, VStack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

import InfoTooltip from '@/components/profile/components/Tooltip'
import { useDebounceCallback } from '@/hooks/useDebounceCallback'
import {
  formatDurationValue,
  parseDurationInput,
  validateDuration,
} from '@/utils/duration.helper'

import { CustomDurationInputProps } from './DurationModeSelector.types'

const DEFAULT_DURATION = 60

const CustomDurationInput: React.FC<CustomDurationInputProps> = ({
  value,
  onChange,
  isInvalid: externalIsInvalid,
  onBlur,
  isDisabled,
}) => {
  const [inputValue, setInputValue] = useState(() =>
    formatDurationValue(value > 0 ? value : DEFAULT_DURATION)
  )
  const [localError, setLocalError] = useState<string | undefined>()
  const [isFocused, setIsFocused] = useState(false)

  const debouncedOnChange = useDebounceCallback(onChange, 300)

  useEffect(() => {
    if (!isFocused && value > 0) {
      setInputValue(formatDurationValue(value))
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
        debouncedOnChange(parsedMinutes)
      }
    }
  }

  const handleBlur = () => {
    setIsFocused(false)
    debouncedOnChange.cancel()

    if (onBlur) {
      onBlur()
    }

    const parsedMinutes = parseDurationInput(inputValue)
    const validation = validateDuration(parsedMinutes)

    if (
      !validation.isValid ||
      parsedMinutes === null ||
      inputValue.trim() === ''
    ) {
      setInputValue(formatDurationValue(DEFAULT_DURATION))
      setLocalError(undefined)
      onChange(DEFAULT_DURATION)
    } else {
      onChange(parsedMinutes)
      setInputValue(formatDurationValue(parsedMinutes))
    }
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const hasError = externalIsInvalid || !!localError

  return (
    <VStack gap={2} alignItems={'flex-start'} width="fit-content" minW={'10px'}>
      <FormControl
        isInvalid={hasError}
        isDisabled={isDisabled}
        w={'fit-content'}
      >
        <HStack width="fit-content" gap={0}>
          <FormLabel htmlFor="custom-duration" mb={0} mr={0}>
            Duration
          </FormLabel>
          <InfoTooltip
            text="Enter any custom duration between 5-480 minutes. Supports formats like '90' (minutes) or '1:30' (hours:minutes)."
            ml={1}
          />
        </HStack>
        <Input
          id="custom-duration"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder="e.g., 90 or 1:30"
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
      </FormControl>
    </VStack>
  )
}

export default CustomDurationInput
