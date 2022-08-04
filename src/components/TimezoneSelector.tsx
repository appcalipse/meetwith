import { Select } from 'chakra-react-select'
import { useState } from 'react'
import timezones from 'timezones-list'

interface TimezoneProps {
  value: string
  onChange: (timezone: string) => void
}

const TimezoneSelector: React.FC<TimezoneProps> = ({ value, onChange }) => {
  const tzs = timezones.map(tz => {
    return {
      value: tz.tzCode,
      label: tz.name,
    }
  })

  const [tz, setTz] = useState(tzs.filter(tz => tz.value === value)[0])

  const _onChange = (timezone: any) => {
    setTz(timezone)
    onChange(timezone.value)
  }

  return (
    <Select
      value={tz}
      colorScheme="orange"
      onChange={_onChange}
      options={tzs}
    />
  )
}

export default TimezoneSelector
