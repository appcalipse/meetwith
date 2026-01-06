import {
  PaymentChannel,
  PaymentType,
  PlanType,
  SessionType,
} from '@utils/constants/meeting-types'

import { ConnectedCalendarCore } from './CalendarConnections'
import { AcceptedToken } from './chains'
import { DiscordAccount } from './Discord'
import { MeetingProvider } from './Meeting'
import { Subscription } from './Subscription'
import { Address } from './Transactions'

export interface AuthToken {
  access_token: string
  expires_in: number
  created_at: number
  token_type: string
  refresh_token: string
}
export interface LeanAccountInfo {
  name?: string
  address: string
  avatar_url?: string
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
  payment_preferences: PaymentPreferences | null
  signedUp?: boolean
  isCalendarConnected?: boolean
}

export interface PublicAccount extends Account {
  meetingTypes?: MeetingType[]
  payment_methods?: PaymentType[]
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
  meeting_platforms?: Array<MeetingProvider>
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
  default_token: AcceptedToken
  payment_channel: PaymentChannel
  payment_address: string
  payment_methods: PaymentType[]
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
  timezone: string | undefined
  description?: string
  availabilities: DayAvailability[]
  availaibility_id?: string
  socialLinks?: SocialLink[]
  name?: string
  avatar_url?: string
  meetingProviders: Array<MeetingProvider>
  banner_url?: string
  banner_setting?: BannerSetting
}

export interface PaymentPreferences {
  id?: number
  created_at?: Date
  owner_account_address: string
  pin?: string | null
  hasPin?: boolean
  default_chain_id?: number
  notification?: Array<'send-tokens' | 'receive-tokens'>
}

// For partial updates (e.g., just PIN operations)
export interface PartialPaymentPreferences {
  owner_account_address: string
  pin_hash?: string | null
  default_chain_id?: number
  notification?: Array<'send-tokens' | 'receive-tokens'>
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

export interface GetMeetingTypesResponseWithMetadata {
  meetingTypes: MeetingType[]
  total: number
  hidden: number
  paidHidden: number
  upgradeRequired: boolean
}

export interface PaidMeetingTypes extends MeetingType {
  session_used: number
  session_total: number
  transaction_hash: Address
}
export interface BannerSetting {
  show_avatar?: boolean
  show_description?: boolean
}
