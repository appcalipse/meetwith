import { format, isSameMonth } from 'date-fns'
import { FC, useMemo } from 'react'

import { MonthDay } from './MonthDays'

interface StandAloneMonthDaysProps {
  day: Date
  startDay: Date
  handlePickDay: (day: Date) => void
  validator?: (day: Date) => boolean
  checkIsPickedDay: (day: Date) => boolean
  colorMode: 'light' | 'dark'
}
const StandAloneMonthDays: FC<StandAloneMonthDaysProps> = ({
  day,
  colorMode,
  handlePickDay,
  startDay,
  validator,
  checkIsPickedDay,
}) => {
  const _isSameMonth = isSameMonth(day, startDay)
  const { isValid, formatted, _isWeekend } = useMemo(
    () => ({
      isValid: validator ? validator(day) : true,
      formatted: format(day, 'd'),
      _isWeekend: [0, 6].includes(day.getDay()),
    }),
    [day, validator]
  )
  const _isToday = checkIsPickedDay(day)
  if (!_isSameMonth) {
    return <MonthDay key={day} />
  }
  return (
    <MonthDay
      key={day}
      isValid={isValid}
      isToday={_isToday}
      isDarkMode={colorMode === 'dark'}
      isWeekend={_isWeekend}
      onClick={() => isValid && handlePickDay(day)}
    >
      {formatted}
    </MonthDay>
  )
}
export default StandAloneMonthDays
