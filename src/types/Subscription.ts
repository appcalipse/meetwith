import { BigNumber } from 'ethers'

import { Account } from './Account'
import { SupportedChain } from './chains'

export enum Plans {
  PRO = 1,
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

export const isProAccount = (account: Account): boolean => {
  return account.subscriptions?.some(sub => sub.plan_id === Plans.PRO)
}
