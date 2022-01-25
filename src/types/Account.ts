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
}

export interface EnhancedAccount extends Account {
  is_invited: boolean
  new_account: boolean
}

export interface SimpleAccountInfo {
  address: string
  internal_pub_key: string
}

export enum SpecialDomainType {
  ENS = 'ENS',
  UNSTOPPABLE_DOMAINS = 'UNSTOPPABLE_DOMAINS',
}

export interface PremiumAccount extends Account {
  special_domain: string
  special_domain_type: SpecialDomainType
  calendar_url: string
}

export interface MeetingType {
  id: string
  title: string
  url: string
  duration: number
  description?: string
  minAdvanceTime: number
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
