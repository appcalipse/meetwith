export interface Account {
    id: string,
    created: Date,
    address: string,
    internal_pub_key: string,
    encoded_signature: string,
    preferences_path: string,
    preferences?: AccountPreferences
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
    duration: number
    description: string
    minAdvancetime: number
}

export interface Availability {
    start: string
    end: string
}

export interface AccountPreferences {
    availableTypes: MeetingType[]
    description: string,
    availabilities: Availability[]
}