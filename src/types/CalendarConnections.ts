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

export interface ConnectedCalendarCore {
  provider: TimeSlotSource
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
}

export type NewCalendarEventType = {
  uid: string
  id: string
  type: string
  password: string
  url: string
  additionalInfo: Record<string, any>
}
