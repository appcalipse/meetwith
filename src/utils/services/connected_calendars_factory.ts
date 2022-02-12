import { ConnectedCalendarProvider } from '../../types/CalendarConnections'
import GoogleCalendarService from './google_service'

export const getConnectedCalendarIntegration = (
  address: string,
  email: string,
  provider: ConnectedCalendarProvider,
  credentials: any
) => {
  switch (provider) {
    case ConnectedCalendarProvider.GOOGLE:
      return new GoogleCalendarService(address, email, credentials)
    default:
      throw new Error(`Unsupported calendar provider: ${provider}`)
  }
}
