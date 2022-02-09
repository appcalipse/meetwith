import { Auth } from 'googleapis'
import { FaApple, FaGoogle, FaMicrosoft } from 'react-icons/fa'

export interface ConnectResponse {
  url: string
}

export enum ConnectedCalendarProvider {
  GOOGLE = 'Google',
  ICLOUD = 'iCloud',
  OUTLOOK = 'Outlook',
  OFFICE = 'Office 365',
}

export const ConnectedCalendarIcons = {
  [ConnectedCalendarProvider.GOOGLE]: FaGoogle,
  [ConnectedCalendarProvider.ICLOUD]: FaApple,
  [ConnectedCalendarProvider.OFFICE]: FaMicrosoft,
  [ConnectedCalendarProvider.OUTLOOK]: FaMicrosoft,
}

export interface ConnectedCalendarCore {
  provider: ConnectedCalendarProvider
  email: string
  sync: boolean
}

export interface ConnectedCalendarCorePayload extends ConnectedCalendarCore {
  payload: Auth.Credentials
}

export interface ConnectedCalendar extends ConnectedCalendarCorePayload {
  id: number
  account_address: string
  updated?: Date
  created: Date
}

export type NewCalendarEventType = {
  uid: string
  id: string
  type: string
  password: string
  url: string
  additionalInfo: Record<string, any>
}
