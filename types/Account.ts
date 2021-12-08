export interface Account {
    id: string,
    created: Date,
    address: string,
    internal_pub_key: string,
    encoded_signature: string,
    preferences?: AccountPreferences,
    preferences_path: string
}

export enum SpecialDomainType {
    ENS = 'ENS',
    UNSTOPPABLE_DOMAINS = 'UNSTOPPABLE_DOMAINS'
}

export interface PremiumAccount extends Account {
    special_domain: string,
    special_domain_type: SpecialDomainType,
}

export interface MeetingType {
    account_id: string,
    id?: string,
    title?: string,
    duration: number
    description?: string
    minAdvanceTime: number
}

export interface Availability {
    meetingTypeId: string,
    weekday: number,
    start: string
    end: string
}

export interface AccountPreferences {
    timezone: string,
    availableTypes: MeetingType[]
    description: string,
    availabilities: Availability[],
    socialLinks: SocialLink[]
}

export enum SocialLinkType {
    TELEGRAM = 'TELEGRAM',
    TWITTER = 'TWITTER',
    DISCORD = 'DISCORD',
}

export interface SocialLink {
    type: SocialLinkType,
    url: string
}