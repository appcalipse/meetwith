import { Select, SingleValue } from 'chakra-react-select'
import ct from 'countries-and-timezones'
import { useState } from 'react'

interface TimezoneProps {
  value?: string | null
  onChange: (timezone?: string | null) => void
}
const timezonesObj = ct.getAllTimezones()
const timezonesKeys = Object.keys(timezonesObj) as Array<
  keyof typeof timezonesObj
>
const _timezones = timezonesKeys
  .map(key => {
    return {
      name: `${key} (GMT${timezonesObj[key].dstOffsetStr})`,
      tzCode: key,
      offset: timezonesObj[key].utcOffset,
    }
  })
  .sort((a, b) => a.offset - b.offset)
const timezones = [..._timezones, { tzCode: 'UTC', name: '(UTC+00:00) UTC' }]
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
