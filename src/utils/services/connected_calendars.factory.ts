import { Auth } from 'googleapis'

import { TimeSlotSource } from '@/types/Meeting'

import CaldavCalendarService, { CaldavCredentials } from './caldav.service'
import {
  BaseCalendarService,
  ICaldavCalendarService,
  IGoogleCalendarService,
  IOffcie365CalendarService,
} from './calendar.service.types'
import GoogleCalendarService from './google.service'
import { O365AuthCredentials } from './office365.credential'
import { Office365CalendarService } from './office365.service'
import WebCalService from './webcal.service'

// Overload for Google
function getConnectedCalendarIntegration(
  address: string,
  email: string,
  provider: TimeSlotSource.GOOGLE,
  credentials: string | Auth.Credentials
): IGoogleCalendarService

// Overload for Office365
function getConnectedCalendarIntegration(
  address: string,
  email: string,
  provider: TimeSlotSource.OFFICE,
  credentials:
    | string
    | Auth.Credentials
    | O365AuthCredentials
    | CaldavCredentials
): IOffcie365CalendarService
function getConnectedCalendarIntegration(
  address: string,
  email: string,
  provider: TimeSlotSource.WEBDAV | TimeSlotSource.ICLOUD,
  credentials:
    | string
    | Auth.Credentials
    | O365AuthCredentials
    | CaldavCredentials
): ICaldavCalendarService
function getConnectedCalendarIntegration(
  address: string,
  email: string,
  provider: TimeSlotSource,
  credentials:
    | string
    | Auth.Credentials
    | O365AuthCredentials
    | CaldavCredentials
):
  | BaseCalendarService
  | ICaldavCalendarService
  | IGoogleCalendarService
  | IOffcie365CalendarService
// Implementation signature
function getConnectedCalendarIntegration(
  address: string,
  email: string,
  provider: TimeSlotSource,
  credentials:
    | string
    | Auth.Credentials
    | O365AuthCredentials
    | CaldavCredentials
):
  | BaseCalendarService
  | ICaldavCalendarService
  | IGoogleCalendarService
  | IOffcie365CalendarService {
  switch (provider) {
    case TimeSlotSource.GOOGLE:
      return new GoogleCalendarService(
        address,
        email,
        credentials as string | Auth.Credentials
      )
    case TimeSlotSource.OFFICE:
      return new Office365CalendarService(
        address,
        email,
        credentials as string | O365AuthCredentials
      )
    case TimeSlotSource.ICLOUD:
    case TimeSlotSource.WEBDAV:
      return new CaldavCalendarService(
        address,
        email,
        credentials as CaldavCredentials
      )
    case TimeSlotSource.WEBCAL:
      return new WebCalService(address, email, credentials as string)
    default:
      throw new Error(`Unsupported calendar provider: ${provider}`)
  }
}

export { getConnectedCalendarIntegration }
