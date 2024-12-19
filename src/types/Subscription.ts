import { isProduction } from '@/utils/constants'

import { SupportedChain } from './chains'
import { Row } from './supabase'
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
    usdPrice: isProduction ? 30 : 1,
    name: 'Pro',
  },
]

export const getPlanInfo = (plan: Plan): PlanInfo | undefined => {
  return existingPlans.find(_plan => _plan.plan === plan)
}

export interface Subscription {
  plan_id: number
  chain: SupportedChain
  owner_account: string
  expiry_time: Date
  domain: string
  config_ipfs_hash: string
  registered_at: Date
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
export interface Coupon extends Row<'coupons'> {
  claims: number
}
