import { ConnectedCalendarProvider } from '../../types/CalendarConnections'
import AppleCalendarService, { CaldavCredentials } from './apple_service'
import GoogleCalendarService from './google_service'
import Office365CalendarService from './office_365_service'

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
      const params: CaldavCredentials = {
        url: 'https://caldav.icloud.com',
        username: 'crisanto.israel@gmail.com',
        password: 'fvzx-jjyf-mtyc-yabq',
      }
      return new AppleCalendarService(address, email, params)
    default:
      throw new Error(`Unsupported calendar provider: ${provider}`)
  }
}
