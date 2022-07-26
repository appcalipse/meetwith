import { BigNumber } from 'ethers'

import { isProduction } from '@/utils/constants'

import { SupportedChain } from './chains'
import { ConditionRelation } from './common'

export enum GateInterface {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721/NFT',
  ERC1155 = 'ERC1155',
  POAP = 'POAP',
}

export interface TokenGateElement {
  itemName: string
  itemId: string
  itemSymbol: string
  type: GateInterface
  minimumBalance: BigNumber
  chain?: SupportedChain
  itemLogo?: string
  decimals?: number
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

export const DummyGateElement: TokenGateElement = {
  type: GateInterface.ERC20,
  itemName: '',
  itemSymbol: '',
  itemId: '',
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
