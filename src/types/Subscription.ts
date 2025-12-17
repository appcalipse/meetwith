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
    usdPrice: isProduction ? 8 : 1,
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
  'Unlimited scheduling groups',
  'Payments & Invoicing',
  'Unlimited integrations (Google calendar, iCloud, Office 365 and WebDAV)',
  'Unlimited QuickPolls',
  'Unlimited meeting types - Free & Paid',
  '24/7 priority support',
]

export const FREE_PLAN_BENEFITS: string[] = [
  'Personal scheduling page',
  '1 Meeting type - FREE meetings',
  'Custom account handle',
  '5 scheduling groups',
  'Limited QuickPolls (max. 2 active polls per time)',
  'Basic calendar sync - 1 calendar sync only',
  'Smart notifications — Email, Discord, and Telegram let you set the cadence for each meeting type.',
  'Unlimited contact connection',
  'Email support',
]
