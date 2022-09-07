import { MeetingType } from './Account'

export enum TeamPlatform {
  SOBOL = 'sobol',
}

export interface Team {
  id?: string
  name: string
  accounts_addresses: string[]
  logo?: string
  description?: string
  created_at?: Date
  externally_owned: boolean
  external_id?: string
  external_platform?: TeamPlatform
  meetingTypes: MeetingType[]
}

export interface Organization {
  id: string
  logo?: string
  description?: string
  created_at: number
}
