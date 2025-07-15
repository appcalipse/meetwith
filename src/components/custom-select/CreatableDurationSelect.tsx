import { CreatableSelect as ChakraCreatableSelect } from 'chakra-react-select'
import { useState } from 'react'

import { DurationOptions } from '@/utils/constants/meeting-types'
import {
  fullWidthStyle,
  noClearCustomSelectComponent,
  Option,
} from '@/utils/constants/select'

const CreatableDurationSelect = ({
  value,
  onChange,
  onBlur,
  isInvalid: _isInvalid,
}: {
  value: Option<number> | null
  onChange: (value: Option<number> | null) => void
  onBlur: () => void
  isInvalid: boolean
}) => {
  const [options, setOptions] = useState(
    DurationOptions.map(opt => ({
      ...opt,
      label: opt.label.replace('Mins', 'Minutes'),
    }))
  )
  const formatCreateLabel = (inputValue: string) => {
    const numValue = parseInt(inputValue)
    if (isNaN(numValue) || numValue <= 0) {
      return `Invalid duration`
    }
    return `Add "${numValue} minutes"`
  }

  const handleCreate = (inputValue: string) => {
    const numValue = parseInt(inputValue)
    if (!isNaN(numValue) && numValue > 0) {
      const newOption: Option<number> = {
        value: numValue,
        label: `${numValue} ${numValue === 1 ? 'Minute' : 'Minutes'}`,
      }
      setOptions(options => {
        if (options.some(option => option.value === numValue)) return options
        return options.concat(newOption)
      })
      onChange(newOption)
    }
  }

  const isValidNewOption = (inputValue: string) => {
    const numValue = parseInt(inputValue)
    return !isNaN(numValue) && numValue > 0 && numValue <= 480 // Max 8 hours
  }

  return (
    <ChakraCreatableSelect
      value={value}
      onChange={newValue => onChange(newValue as Option<number> | null)}
      onCreateOption={handleCreate}
      formatCreateLabel={formatCreateLabel}
      isValidNewOption={isValidNewOption}
      options={options.sort((a, b) => a.value - b.value)}
      colorScheme="primary"
      className="date-select"
      components={noClearCustomSelectComponent}
      chakraStyles={fullWidthStyle}
      onBlur={onBlur}
      placeholder="Select or type duration in minutes..."
      noOptionsMessage={({ inputValue }) =>
        inputValue
          ? `Type a number to add "${inputValue} minutes"`
          : 'No options'
      }
    />
  )
}

export default CreatableDurationSelect
