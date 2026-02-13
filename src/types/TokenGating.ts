import { isProduction } from '@/utils/constants'

import { getNativeDecimals, SupportedChain } from './chains'
import { ConditionRelation } from './common'

declare global {
  interface BigInt {
    toJSON(): string
  }
}

BigInt.prototype.toJSON = function () {
  return this.toString()
}
export enum GateInterface {
  NATIVE = 'native',
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
  minimumBalance: bigint
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
  chain: isProduction
    ? SupportedChain.POLYGON_MATIC
    : SupportedChain.POLYGON_AMOY,
  itemId: '',
  itemName: '',
  itemSymbol: '',
  minimumBalance: 0n,
  type: GateInterface.ERC20,
}

export enum GateUsageType {
  MeetingSchedule = 'MeetingSchedule',
}

export interface GateUsage {
  gate_id: string
  type: GateUsageType
  gated_entity_id: string
}

export const getNativeTokenInfo = (chain: SupportedChain): TokenGateElement => {
  switch (chain) {
    case SupportedChain.ETHEREUM:
    case SupportedChain.SEPOLIA:
      return {
        chain: chain,
        decimals: getNativeDecimals(chain),
        itemId: '0x0000000000000000000000000000000000000000',
        itemName: 'Ether',
        itemSymbol: 'ETH',
        minimumBalance: 0n,
        type: GateInterface.NATIVE,
      }
    case SupportedChain.POLYGON_MATIC:
    case SupportedChain.POLYGON_AMOY:
      return {
        chain: chain,
        decimals: getNativeDecimals(chain),
        itemId: '0x0000000000000000000000000000000000000000',
        itemName: 'Matic',
        itemSymbol: 'MATIC',
        minimumBalance: 0n,
        type: GateInterface.NATIVE,
      }
    case SupportedChain.METIS_ANDROMEDA:
      return {
        chain: chain,
        decimals: getNativeDecimals(chain),
        itemId: '0x0000000000000000000000000000000000000000',
        itemName: 'Metis',
        itemSymbol: 'METIS',
        minimumBalance: 0n,
        type: GateInterface.NATIVE,
      }
    default:
      return DummyGateElement
  }
}
