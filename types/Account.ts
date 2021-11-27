export interface Account {
    id: string,
    created: Date,
    address: string,
    internal_pub_key: string,
    encoded_signature: string,
    preferences_path: string,
    preferences?: AccountPreferences
}

export interface PremiumAccount extends Account {
    ens: string
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