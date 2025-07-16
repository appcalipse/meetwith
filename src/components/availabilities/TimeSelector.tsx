import { HStack, Input, Select, Text } from '@chakra-ui/react'
import { ChangeEvent, useEffect, useState } from 'react'

import {
  validateTimeFormat,
  validateTimeRange,
} from '@/utils/availability.helper'

import { allSlots } from '../../utils/calendar_manager'

type SelectorProps = {
  onChange: (time: string) => void
  time: string
  slots: string[]
  isInput?: boolean
  isStart?: boolean
  otherTime?: string
  onValidationChange?: (isValid: boolean) => void
}

const Selector: React.FC<SelectorProps> = ({
  onChange,
  time,
  slots,
  isInput = false,
  isStart = false,
  otherTime = '',
  onValidationChange,
}) => {
  const [inputValue, setInputValue] = useState(time)
  const [isValid, setIsValid] = useState(true)
  const [isRangeValid, setIsRangeValid] = useState(true)

  useEffect(() => {
    setInputValue(time)
  }, [time])

  const handleSelectChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value)
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setInputValue(value)

    const valid = validateTimeFormat(value)
    setIsValid(valid)

    // Check range validation for direct input mode
    let rangeValid = true
    if (isInput && valid && otherTime && validateTimeFormat(otherTime)) {
      rangeValid = isStart
        ? validateTimeRange(value, otherTime)
        : validateTimeRange(otherTime, value)
    }
    setIsRangeValid(rangeValid)

    if (onValidationChange) {
      onValidationChange(valid && rangeValid)
    }

    if (valid) {
      onChange(value)
    }
  }

  const handleInputBlur = () => {
    if (!isValid) {
      setInputValue(time)
      setIsValid(true)
    }
  }

  const isInputInvalid = !isValid || (!isRangeValid && isInput)

  if (isInput) {
    return (
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        width={{ base: '80px', sm: '96px' }}
        borderColor={isInputInvalid ? 'red.500' : undefined}
        borderRadius="8px"
        _focus={{
          borderColor: isInputInvalid ? 'red.500' : 'orange.400',
          boxShadow: `0 0 0 1px var(--chakra-colors-${
            isInputInvalid ? 'red-500' : 'orange-400'
          })`,
        }}
        _focusVisible={{
          boxShadow: `0 0 0 1px var(--chakra-colors-${
            isInputInvalid ? 'red-500' : 'orange-400'
          })`,
        }}
        placeholder="HH:MM"
        size="sm"
      />
    )
  }

  return (
    <Select
      value={time}
      onChange={handleSelectChange}
      width={{ base: '80px', sm: '96px' }}
      size="sm"
      borderRadius="8px"
      _focus={{
        borderColor: 'orange.400',
        boxShadow: '0 0 0 1px var(--chakra-colors-orange-400)',
      }}
      _focusVisible={{
        boxShadow: '0 0 0 1px var(--chakra-colors-orange-400)',
      }}
    >
      {slots.map(time => (
        <option key={time} value={time}>
          {time}
        </option>
      ))}
    </Select>
  )
}

type TimeSelectorProps = {
  index: number
  onChange: (index: number, start: string, end: string) => void
  start: string
  end: string
  nextStart?: string
  previousEnd?: string
  useDirectInput?: boolean
  onValidationChange?: (index: number, isValid: boolean) => void
}

export const TimeSelector: React.FC<TimeSelectorProps> = ({
  index,
  onChange,
  start,
  end,
  nextStart = '24:00',
  previousEnd = '00:00',
  useDirectInput = false,
  onValidationChange,
}) => {
  const [_isRangeValid, setIsRangeValid] = useState(true)

  const slots = {
    start: allSlots.slice(
      allSlots.findIndex(slot => slot === previousEnd),
      allSlots.findIndex(slot => slot === nextStart)
    ),
    end: allSlots.slice(
      allSlots.findIndex(slot => slot === start) + 1,
      allSlots.findIndex(slot => slot === nextStart) + 1
    ),
  }

  const validateCurrentRange = () => {
    if (
      useDirectInput &&
      validateTimeFormat(start) &&
      validateTimeFormat(end)
    ) {
      const valid = validateTimeRange(start, end)
      setIsRangeValid(valid)
      if (onValidationChange) {
        onValidationChange(index, valid)
      }
      return valid
    }
    return true
  }

  useEffect(() => {
    validateCurrentRange()
  }, [start, end, useDirectInput])

  const onChangeStart = (time: string) => {
    onChange(index, time, end)
  }

  const onChangeEnd = (time: string) => {
    onChange(index, start, time)
  }

  return (
    <HStack spacing={2} flexWrap="wrap" gap={2}>
      <Selector
        onChange={onChangeStart}
        time={start}
        slots={slots.start}
        isInput={useDirectInput}
        isStart={true}
        otherTime={end}
        onValidationChange={() => validateCurrentRange()}
      />
      <Text fontSize="sm" color="neutral.300">
        -
      </Text>
      <Selector
        onChange={onChangeEnd}
        time={end}
        slots={slots.end}
        isInput={useDirectInput}
        isStart={false}
        otherTime={start}
        onValidationChange={() => validateCurrentRange()}
      />
    </HStack>
  )
}
