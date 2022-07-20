import { TimeSlotSource } from '@/types/Meeting'

import CaldavCalendarService from './caldav.service'
import GoogleCalendarService from './google.service'
import Office365CalendarService from './office365.service'

export const getConnectedCalendarIntegration = (
  address: string,
  email: string,
  provider: TimeSlotSource,
  credentials: any
) => {
  switch (provider) {
    case TimeSlotSource.GOOGLE:
      return new GoogleCalendarService(address, email, credentials)
    case TimeSlotSource.OFFICE:
      return new Office365CalendarService(address, email, credentials)
    case TimeSlotSource.ICLOUD:
    case TimeSlotSource.WEBDAV:
      return new CaldavCalendarService(address, email, credentials)
    default:
      throw new Error(`Unsupported calendar provider: ${provider}`)
  }
}
