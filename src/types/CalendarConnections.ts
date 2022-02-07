export interface ConnectResponse {
  url: string
}

export enum ConnectedCalendarProvider {
  GOOGLE = 'google',
  APPLE = 'apple',
}

export interface ConnectedCalendarCorePayload {
  provider: ConnectedCalendarProvider
  email: string
  sync: boolean
  token: string
  refresh_token: string
}

export interface ConnectedCalendar extends ConnectedCalendarCorePayload {
  id: number
  account_address: string
  updated?: Date
  created: Date
}
