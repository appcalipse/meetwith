import { FormControl, FormLabel, HStack, Input, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import InfoTooltip from '@/components/profile/components/Tooltip'
import { useDebounceCallback } from '@/hooks/useDebounceCallback'
import {
  formatDurationValue,
  parseDurationInput,
  validateDuration,
} from '@/utils/duration.helper'

import { CustomDurationInputProps } from './DurationModeSelector.types'

const DEFAULT_DURATION = 60
const DEBOUNCE_DELAY = 500

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
  const isFocusedRef = useRef(false)
  const lastValidValueRef = useRef(value > 0 ? value : DEFAULT_DURATION)

  const commitChange = useCallback(
    (minutes: number) => {
      lastValidValueRef.current = minutes
      onChange(minutes)
    },
    [onChange]
  )

  const debouncedCommit = useDebounceCallback(commitChange, DEBOUNCE_DELAY)

  useEffect(() => {
    if (!isFocusedRef.current && value > 0) {
      setInputValue(formatDurationValue(value))
      lastValidValueRef.current = value
    }
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInput = e.target.value
    setInputValue(newInput)

    if (newInput.trim() !== '') {
      const parsedMinutes = parseDurationInput(newInput)
      const validation = validateDuration(parsedMinutes)

      if (validation.isValid && parsedMinutes !== null) {
        setLocalError(undefined)
        debouncedCommit(parsedMinutes)
      } else {
        setLocalError(validation.errorMessage)
      }
    } else {
      setLocalError(undefined)
    }
  }

  const handleBlur = () => {
    isFocusedRef.current = false
    debouncedCommit.cancel()

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
      commitChange(DEFAULT_DURATION)
    } else {
      commitChange(parsedMinutes)
      setInputValue(formatDurationValue(parsedMinutes))
    }
  }

  const handleFocus = () => {
    isFocusedRef.current = true
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
