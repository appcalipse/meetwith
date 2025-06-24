import { HStack, Input, Select, Text } from '@chakra-ui/react'
import { ChangeEvent, useEffect, useState } from 'react'

import { validateTimeFormat } from '@/utils/availability.helper'

import { allSlots } from '../../utils/calendar_manager'

type SelectorProps = {
  onChange: (time: string) => void
  time: string
  slots: string[]
  isInput?: boolean
}

const Selector: React.FC<SelectorProps> = ({
  onChange,
  time,
  slots,
  isInput = false,
}) => {
  const [inputValue, setInputValue] = useState(time)
  const [isValid, setIsValid] = useState(true)

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

  if (isInput) {
    return (
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        width={{ base: '80px', sm: '96px' }}
        borderColor={isValid ? undefined : 'red.500'}
        borderRadius="8px"
        _focus={{
          borderColor: isValid ? 'orange.400' : 'red.500',
          boxShadow: `0 0 0 1px var(--chakra-colors-${
            isValid ? 'orange-400' : 'red-500'
          })`,
        }}
        _focusVisible={{
          boxShadow: `0 0 0 1px var(--chakra-colors-${
            isValid ? 'orange-400' : 'red-500'
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
}

export const TimeSelector: React.FC<TimeSelectorProps> = ({
  index,
  onChange,
  start,
  end,
  nextStart = '24:00',
  previousEnd = '00:00',
  useDirectInput = false,
}) => {
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
      />
      <Text fontSize="sm" color="neutral.300">
        -
      </Text>
      <Selector
        onChange={onChangeEnd}
        time={end}
        slots={slots.end}
        isInput={useDirectInput}
      />
    </HStack>
  )
}
