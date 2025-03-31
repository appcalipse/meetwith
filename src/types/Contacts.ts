import { ContactStatus } from '@/utils/constants/contact'

import { NotificationType } from './AccountNotifications'

export interface LeanAccount {
  address?: string
  email?: string
}

export interface SearchAccount extends LeanAccount {
  is_invited: boolean
  name?: string
  avatar_url?: string
}
export interface ContactSearch {
  total_count: number
  result?: Array<SearchAccount> | null
}

export interface InviteContact {
  address?: string
  email?: string
}

export interface DBContact {
  id: string
  contact_address: string
  account_owner_address: string
  status: ContactStatus
  account: {
    preferences: {
      name: string
      avatar_url: string
      description: string
    }
    calendars_exist: Array<{
      id: number
    }>
    account_notifications: {
      notification_types: Array<NotificationType>
    }
  }
}

export interface DBContactInvite {
  id: string
  destination: string
  account_owner_address: string
  channel: string
  account: {
    preferences: {
      name: string
      avatar_url: string
      description: string
    }
    calendars_exist: Array<{
      id: number
    }>
    account_notifications: {
      notification_types: Array<NotificationType>
    }
  }
}

export interface Contact {
  id: string
  contact_address: string
  status: ContactStatus
  name: string
  avatar_url: string
  description: string
  calendar_exists: boolean
  email_address?: string
}

export interface ContactInvite {
  id: string
  account_owner_address: string
  name: string
  avatar_url: string
  description: string
  calendar_exists: boolean
  email_address?: string
}
