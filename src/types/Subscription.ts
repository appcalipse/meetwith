import { isProduction } from '@/utils/constants'

import { SupportedChain } from './chains'
import { Tables } from './Supabase'
export interface PlanInfo {
  plan: Plan
  usdPrice: number
  name: string
}

export enum Plan {
  PRO = 1,
}

export const existingPlans: PlanInfo[] = [
  {
    plan: Plan.PRO,
    usdPrice: 8,
    name: 'Pro',
  },
]

export const getPlanInfo = (plan: Plan): PlanInfo | undefined => {
  return existingPlans.find(_plan => _plan.plan === plan)
}

export interface Subscription {
  plan_id: number | null
  chain: SupportedChain | null
  owner_account: string
  expiry_time: Date
  domain: string | null
  config_ipfs_hash: string | null
  registered_at: Date
  billing_plan_id?: string | null
  status?: 'active' | 'cancelled' | 'expired'
  transaction_id?: string | null
}

export interface BlockchainSubscription {
  planId: bigint
  owner: string
  expiryTime: bigint
  domain: string
  configIpfsHash: string
  registeredAt: bigint
  chain: SupportedChain
}
export interface Coupon extends Tables<'coupons'> {
  claims: number
}

// Subscription plan benefits
export const PRO_PLAN_BENEFITS: string[] = [
  'Everything in Free plus (+)',
  'Custom account handle',
  'Unlimited scheduling groups',
  'Payments & Invoicing',
  'Unlimited integrations (Google calendar, iCloud, Office 365 and WebDAV)',
  'Unlimited calendar connection',
  'Unlimited QuickPolls',
  'Unlimited contact connection per month',
  'Unlimited meeting types - Free & Paid',
  '24/7 priority support',
]

export const FREE_PLAN_BENEFITS: string[] = [
  'Personal scheduling page',
  '1 Meeting type - FREE meetings',
  '5 scheduling groups',
  'Up to 2 calendar integrations (Google calendar, iCloud, Office 365 or WebDAV)',
  'Limited QuickPolls (1 active poll per month)',
  'Calendar sync - up to 2 calendars connected',
  'Smart notifications — Email, Discord, and Telegram let you set the cadence for each meeting type.',
  'Add up to 3 new contacts per month',
  'Email support',
]
