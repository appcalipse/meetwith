import { ConnectedCalendarProvider } from '../../types/CalendarConnections'
import GoogleCalendarService from './google_service'
import Office365CalendarService from './office_365_service'
import WebdavCalendarService from './webdav_service'

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
      return new WebdavCalendarService(address, email, credentials)
    default:
      throw new Error(`Unsupported calendar provider: ${provider}`)
  }
}
