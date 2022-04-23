import { ConnectedCalendarProvider } from '@/types/CalendarConnections'

import CaldavCalendarService from './caldav.service'
import GoogleCalendarService from './google.service'
import Office365CalendarService from './office365.service'

export const getConnectedCalendarIntegration = (
  address: string,
  email: string,
  provider: ConnectedCalendarProvider,
  credentials: any
) => {
  switch (provider) {
    case ConnectedCalendarProvider.GOOGLE:
      return new GoogleCalendarService(address, email, credentials)
    case ConnectedCalendarProvider.OFFICE:
      return new Office365CalendarService(address, email, credentials)
    case ConnectedCalendarProvider.ICLOUD:
    case ConnectedCalendarProvider.WEBDAV:
      return new CaldavCalendarService(address, email, credentials)
    default:
      throw new Error(`Unsupported calendar provider: ${provider}`)
  }
}
