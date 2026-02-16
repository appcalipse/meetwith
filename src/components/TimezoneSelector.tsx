import { Select } from 'chakra-react-select'
import { useEffect, useMemo, useState } from 'react'

import { getBrowserTimezone } from '@/utils/availability.helper'
import { TimeZoneOption, timeZoneFilter } from '@/utils/constants/select'
import { getTimezones } from '@/utils/date_helper'

interface TimezoneProps {
  value?: string | null
  onChange: (timezone?: string | null) => void
}

const TimezoneSelector: React.FC<TimezoneProps> = ({ value, onChange }) => {
  const tzs = useMemo(
    () =>
      getTimezones().map(tz => {
        return {
          value: tz.tzCode,
          label: tz.name,
          searchKeys: tz.countries,
        }
      }),
    []
  )

  const getBestTimezoneValue = (): string => {
    if (value) {
      return value
    }
    return getBrowserTimezone()
  }

  const [tz, setTz] = useState<TimeZoneOption>(
    tzs.find(tz => tz.value === getBestTimezoneValue()) || tzs[0]
  )

  useEffect(() => {
    const bestValue = getBestTimezoneValue()
    const foundTz = tzs.filter(tz => tz.value === bestValue)[0]
    if (foundTz) {
      setTz(foundTz)
    }
  }, [value])

  const _onChange = (timezone: unknown) => {
    setTz(timezone as TimeZoneOption)
    onChange((timezone as TimeZoneOption)?.value)
  }

  return (
    <Select
      value={tz}
      colorScheme="primary"
      onChange={_onChange}
      options={tzs}
      filterOption={timeZoneFilter}
    />
  )
}

export default TimezoneSelector
