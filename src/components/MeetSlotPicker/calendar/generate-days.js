import {
  addDays,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

function generateDays(month) {
  const start = startOfMonth(month)
  const end = endOfMonth(month)

  const firstDay = startOfWeek(start, {
    weekStartsOn: 0,
  })
  const lastDay = endOfWeek(end, {
    weekStartsOn: 0,
  })

  const days = []
  let day = firstDay

  while (day <= lastDay) {
    days.push(day)
    day = addDays(day, 1)
  }

  return [start, days]
}

export default generateDays
