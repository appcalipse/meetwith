import { BigNumber } from 'ethers'

import { SupportedChain } from './chains'

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
    usdPrice: process.env.NEXT_PUBLIC_ENV === 'production' ? 30 : 1,
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
  planId: BigNumber
  owner: string
  expiryTime: BigNumber
  domain: string
  configIpfsHash: string
  registeredAt: BigNumber
  chain: SupportedChain
}

export enum SpecialDomainType {
  CUSTOM = 'CUSTOM',
  ENS = 'ENS',
  UNSTOPPABLE_DOMAINS = 'UNSTOPPABLE_DOMAINS',
}
