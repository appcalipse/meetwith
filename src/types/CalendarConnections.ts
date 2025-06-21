import {
  FaApple,
  FaCalendar,
  FaCalendarAlt,
  FaGoogle,
  FaMicrosoft,
} from 'react-icons/fa'

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
}

export interface CalendarSyncInfo {
  calendarId: string
  name: string
  sync: boolean
  enabled: boolean
  color?: string
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
  payload: any
}

export type NewCalendarEventType = {
  uid: string
  id: string
  type: string
  password: string
  url: string
  additionalInfo: Record<string, any>
}
export enum Office365RecurrenceType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  ABSOLUTE_MONTHLY = 'absoluteMonthly',
  RELATIVE_MONTHLY = 'relativeMonthly',
  ABSOLUTE_YEARLY = 'absoluteYearly',
  RELATIVE_YEARLY = 'relativeYearly',
}
