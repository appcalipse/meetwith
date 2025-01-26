import { Select, SingleValue } from 'chakra-react-select'
import { useState } from 'react'

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

  const [tz, setTz] = useState<SingleValue<{ label: string; value: string }>>(
    tzs.filter(tz => tz.value === value)[0]
  )

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
