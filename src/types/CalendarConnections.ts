import { Auth } from 'googleapis'
import { FaApple, FaCalendarAlt, FaGoogle, FaMicrosoft } from 'react-icons/fa'

export interface ConnectResponse {
  url: string
}

export enum ConnectedCalendarProvider {
  GOOGLE = 'Google',
  ICLOUD = 'iCloud',
  OFFICE = 'Office 365',
  WEBDAV = 'Webdav',
}

export const ConnectedCalendarIcons = {
  [ConnectedCalendarProvider.GOOGLE]: FaGoogle,
  [ConnectedCalendarProvider.ICLOUD]: FaApple,
  [ConnectedCalendarProvider.OFFICE]: FaMicrosoft,
  [ConnectedCalendarProvider.WEBDAV]: FaCalendarAlt,
}

export interface ConnectedCalendarCore {
  provider: ConnectedCalendarProvider
  email: string
  sync: boolean
}

export interface ConnectedCalendarCorePayload extends ConnectedCalendarCore {
  payload: any
}

export interface ConnectedCalendar extends ConnectedCalendarCorePayload {
  id: number
  account_address: string
  updated?: Date
  created: Date
  webdav?: {
    url: string
    user: string
    secret: string
  }
}

export type NewCalendarEventType = {
  uid: string
  id: string
  type: string
  password: string
  url: string
  additionalInfo: Record<string, any>
}
