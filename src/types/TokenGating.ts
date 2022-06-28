import { BigNumber } from 'ethers'

import { isProduction } from '@/utils/constants'

import { SupportedChain } from './chains'

export enum TokenInterface {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721/NFT',
  ERC1155 = 'ERC1155',
  POAP = 'POAP',
}

export interface TokenGateElement {
  tokenName: string
  tokenAddress: string
  tokenSymbol: string
  type: TokenInterface
  minimumBalance: BigNumber
  chain?: SupportedChain
  tokenLogo?: string
  decimals?: number
}

export enum ConditionRelation {
  AND,
  OR,
}

export interface GateCondition {
  relation: ConditionRelation
  elements: TokenGateElement[]
  conditions: GateCondition[]
}

export interface GateConditionObject {
  id?: string
  title: string
  definition: GateCondition
}

export const DummyGateElement = {
  type: TokenInterface.ERC20,
  tokenName: '',
  tokenSymbol: '',
  tokenAddress: '',
  chain: isProduction
    ? SupportedChain.POLYGON_MATIC
    : SupportedChain.POLYGON_MUMBAI,
  minimumBalance: BigNumber.from(0),
}

export enum GateUsageType {
  MeetingSchedule = 'MeetingSchedule',
}

export interface GateUsage {
  gate_id: string
  type: GateUsageType
  gated_entity_id: string
}
