import { Select, SingleValue } from 'chakra-react-select'
import { useEffect, useState } from 'react'

import { getBrowserTimezone } from '@/utils/availability.helper'
import { timezones } from '@/utils/date_helper'

interface TimezoneProps {
  value?: string | null
  onChange: (timezone?: string | null) => void
}

const TimezoneSelector: React.FC<TimezoneProps> = ({ value, onChange }) => {
  const tzs = timezones.map(tz => {
    return {
      value: tz.tzCode,
      label: tz.name,
    }
  })

  const getBestTimezoneValue = (): string => {
    if (value) {
      return value
    }
    return getBrowserTimezone()
  }

  const [tz, setTz] = useState<SingleValue<{ label: string; value: string }>>(
    tzs.find(tz => tz.value === getBestTimezoneValue()) || tzs[0]
  )

  useEffect(() => {
    const bestValue = getBestTimezoneValue()
    const foundTz = tzs.filter(tz => tz.value === bestValue)[0]
    if (foundTz) {
      setTz(foundTz)
    }
  }, [value])

  const _onChange = (
    timezone: SingleValue<{ label: string; value: string }>
  ) => {
    setTz(timezone)
    onChange(timezone?.value)
  }

  return (
    <Select
      value={tz}
      colorScheme="primary"
      onChange={_onChange}
      options={tzs}
    />
  )
}

export default TimezoneSelector
