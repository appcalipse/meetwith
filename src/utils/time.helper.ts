import { addHours } from 'date-fns'

export const ParseTime = (date: Date) => {
  const minutes = Math.ceil(date.getMinutes() / 10) * 10
  return (
    (minutes < 60 ? date.getHours() : addHours(date, 1).getHours()) +
    ':' +
    (minutes < 60 ? minutes : '00')
  )
}
