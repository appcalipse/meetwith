import { DiscordAccount } from './Discord'
import { MeetingProvider } from './Meeting'
import { Subscription } from './Subscription'

export interface AuthToken {
  access_token: string
  expires_in: number
  created_at: number
  token_type: string
  refresh_token: string
}

export interface Account {
  id: string
  created_at: Date
  address: string
  internal_pub_key: string
  encoded_signature: string
  preferences: AccountPreferences
  nonce: number
  is_invited: boolean
  subscriptions: Subscription[]
  discord_account?: DiscordAccount
  signedUp?: boolean
  isCalendarConnected?: boolean
}

export interface SimpleAccountInfo {
  address: string
  internal_pub_key: string
}

export interface MeetingType {
  id: string
  title: string
  url: string
  duration: number
  description?: string
  minAdvanceTime: number
  scheduleGate?: string
  deleted?: boolean
  private?: boolean
}

export interface DayAvailability {
  weekday: number
  ranges: TimeRange[]
}

export interface TimeRange {
  start: string
  end: string
}

export interface AccountPreferences {
  id?: string
  timezone: string
  availableTypes: MeetingType[]
  description?: string
  availabilities: DayAvailability[]
  socialLinks?: SocialLink[]
  name?: string
  avatar?: string
  meetingProviders: Array<MeetingProvider>
}

export enum SocialLinkType {
  TELEGRAM = 'TELEGRAM',
  TWITTER = 'TWITTER',
  DISCORD = 'DISCORD',
}

export interface SocialLink {
  type: SocialLinkType
  url: string
}

export interface TgConnectedAccounts {
  telegram_id: string
  account_address: string
}

export interface DiscordConnectedAccounts {
  discord_id: string
  account_address: string
}
