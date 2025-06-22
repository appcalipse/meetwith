import {
  PaymentChannel,
  PlanType,
  SessionType,
} from '@utils/constants/meeting-types'

import { ConnectedCalendarCore } from './CalendarConnections'
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

export interface PublicAccount extends Account {
  meetingTypes?: MeetingType[]
}

export interface SimpleAccountInfo {
  address: string
  internal_pub_key: string
}

export interface BaseMeetingType {
  title: string
  account_owner_address: string
  type: SessionType
  description?: string
  slug?: string
  duration_minutes: number
  min_notice_minutes: number
  fixed_link?: boolean
  custom_link?: string
  updated_at?: string | Date
}
export interface MeetingType extends BaseMeetingType {
  id: string
  scheduleGate?: string
  availabilities: Array<Availability>
  plan?: MeetingTypePlan
  calendars?: Array<
    Omit<
      ConnectedCalendarCore,
      'calendars' | 'expectedPermissions' | 'grantedPermissions'
    >
  >
  created_at: Date
  deleted_at: Date
}

interface Availability {
  id: string
  account_owner_address: string
  timezone: string
  title: string
  created_at: Date
  updated_at: Date
  weekly_availability: DayAvailability[]
}
export interface MeetingTypePlan {
  id: string
  meeting_type_id: string
  type: PlanType
  price_per_slot: number
  no_of_slot: number
  default_chain_id: number
  payment_channel: PaymentChannel
  payment_address: string
  created_at: Date
  updated_at: Date
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

interface BaseConnectedAccounts {
  timezone: string
  account_address: string
}
export interface TgConnectedAccounts extends BaseConnectedAccounts {
  telegram_id: string
}

export interface DiscordConnectedAccounts extends BaseConnectedAccounts {
  discord_id: string
}

export interface PaidMeetingTypes extends MeetingType {
  session_used: 1
  session_total: 1
  transaction_hash: string
}
