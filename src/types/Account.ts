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
  created: Date
  address: string
  internal_pub_key: string
  encoded_signature: string
  preferences?: AccountPreferences
  preferences_path: string
  nonce: number
  name?: string
  avatar?: string
  is_invited: boolean
  subscriptions: Subscription[]
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
  timezone: string
  availableTypes: MeetingType[]
  description: string
  availabilities: DayAvailability[]
  socialLinks: SocialLink[]
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
