import { Auth } from 'googleapis'
import { CiStreamOn } from 'react-icons/ci'
import {
  FaApple,
  FaCalendar,
  FaCalendarAlt,
  FaGoogle,
  FaMicrosoft,
} from 'react-icons/fa'
import { CaldavCredentials } from '@/utils/services/caldav.service'
import { O365AuthCredentials } from '@/utils/services/office365.credential'
import { TimeSlotSource } from './Meeting'

export interface ConnectResponse {
  url: string
}

export const ConnectedCalendarIcons = {
  [TimeSlotSource.GOOGLE]: FaGoogle,
  [TimeSlotSource.ICLOUD]: FaApple,
  [TimeSlotSource.OFFICE]: FaMicrosoft,
  [TimeSlotSource.WEBDAV]: FaCalendarAlt,
  [TimeSlotSource.MWW]: FaCalendar,
  [TimeSlotSource.WEBCAL]: CiStreamOn,
}

export interface CalendarSyncInfo {
  calendarId: string
  name: string
  sync: boolean
  enabled: boolean
  color?: string
  isReadOnly?: boolean
}
export interface ConnectedCalendarCore {
  id: number
  provider: TimeSlotSource
  email: string
  calendars: CalendarSyncInfo[]
  expectedPermissions?: number
  grantedPermissions?: number
}
export interface ConnectedCalendar extends ConnectedCalendarCore {
  id: number
  account_address: string
  updated?: Date
  calendarId?: string
  enabled: boolean
  created: Date
  payload: string | Auth.Credentials | O365AuthCredentials | CaldavCredentials
}

// Response type for calendar integrations API
export interface GetCalendarIntegrationsResponse {
  calendars: ConnectedCalendarCore[]
  total: number
  isPro: boolean
  upgradeRequired: boolean
}

export type NewCalendarEventType = {
  uid: string
  id: string
  type: string
  password: string
  url: string
  additionalInfo: Record<string, string | number | boolean>
}

export enum Office365RecurrenceType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  ABSOLUTE_MONTHLY = 'absoluteMonthly',
  RELATIVE_MONTHLY = 'relativeMonthly',
  ABSOLUTE_YEARLY = 'absoluteYearly',
  RELATIVE_YEARLY = 'relativeYearly',
}

export interface WebCalResponse {
  connected: boolean
  email: string
  calendarName: string
  eventCount: string
}
