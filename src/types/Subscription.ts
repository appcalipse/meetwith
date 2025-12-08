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
