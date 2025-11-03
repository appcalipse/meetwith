import { Auth } from 'googleapis'

import { TimeSlotSource } from '@/types/Meeting'

import CaldavCalendarService, { CaldavCredentials } from './caldav.service'
import {
  BaseCalendarService,
  IGoogleCalendarService,
} from './calendar.service.types'
import GoogleCalendarService from './google.service'
import Office365CalendarService, {
  O365AuthCredentials,
} from './office365.service'

function getConnectedCalendarIntegration(
  address: string,
  email: string,
  provider: TimeSlotSource,
  credentials:
    | string
    | Auth.Credentials
    | O365AuthCredentials
    | CaldavCredentials
): BaseCalendarService
function getConnectedCalendarIntegration(
  address: string,
  email: string,
  provider: TimeSlotSource.GOOGLE,
  credentials:
    | string
    | Auth.Credentials
    | O365AuthCredentials
    | CaldavCredentials
): IGoogleCalendarService
function getConnectedCalendarIntegration(
  address: string,
  email: string,
  provider: TimeSlotSource.ICLOUD,
  credentials:
    | string
    | Auth.Credentials
    | O365AuthCredentials
    | CaldavCredentials
): BaseCalendarService
function getConnectedCalendarIntegration(
  address: string,
  email: string,
  provider: TimeSlotSource.OFFICE,
  credentials:
    | string
    | Auth.Credentials
    | O365AuthCredentials
    | CaldavCredentials
): BaseCalendarService
function getConnectedCalendarIntegration(
  address: string,
  email: string,
  provider: TimeSlotSource.WEBDAV,
  credentials:
    | string
    | Auth.Credentials
    | O365AuthCredentials
    | CaldavCredentials
): BaseCalendarService
function getConnectedCalendarIntegration(
  address: string,
  email: string,
  provider: TimeSlotSource.MWW,
  credentials:
    | string
    | Auth.Credentials
    | O365AuthCredentials
    | CaldavCredentials
): BaseCalendarService

function getConnectedCalendarIntegration(
  address: string,
  email: string,
  provider: TimeSlotSource,
  credentials:
    | string
    | Auth.Credentials
    | O365AuthCredentials
    | CaldavCredentials
): BaseCalendarService | IGoogleCalendarService {
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
    default:
      throw new Error(`Unsupported calendar provider: ${provider}`)
  }
}

export { getConnectedCalendarIntegration }
