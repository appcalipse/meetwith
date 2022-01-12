import LocalizedFormat from 'dayjs/plugin/localizedFormat'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import isBetween from 'dayjs/plugin/isBetween'
import dayjs from 'dayjs'

dayjs.extend(LocalizedFormat)
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(isBetween)

export default dayjs
