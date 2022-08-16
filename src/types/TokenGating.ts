import { BigNumber, ethers } from 'ethers'

import { isProduction } from '@/utils/constants'

import { getNativeDecimals, SupportedChain } from './chains'
import { ConditionRelation } from './common'

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

export const getNativeTokenInfo = (chain: SupportedChain): TokenGateElement => {
  switch (chain) {
    case SupportedChain.ETHEREUM:
    case SupportedChain.RINKEBY:
      return {
        type: GateInterface.NATIVE,
        itemName: 'Ether',
        itemSymbol: 'ETH',
        itemId: '0x0000000000000000000000000000000000000000',
        chain: chain,
        minimumBalance: ethers.BigNumber.from(0),
        decimals: getNativeDecimals(chain),
      }
    case SupportedChain.POLYGON_MATIC:
    case SupportedChain.POLYGON_MUMBAI:
      return {
        type: GateInterface.NATIVE,
        itemName: 'Matic',
        itemSymbol: 'MATIC',
        itemId: '0x0000000000000000000000000000000000000000',
        chain: chain,
        minimumBalance: ethers.BigNumber.from(0),
        decimals: getNativeDecimals(chain),
      }
    case SupportedChain.HARMONY:
    case SupportedChain.HARMONY_TESTNET:
      return {
        type: GateInterface.NATIVE,
        itemName: 'One',
        itemSymbol: 'ONE',
        itemId: '0x0000000000000000000000000000000000000000',
        chain: chain,
        minimumBalance: ethers.BigNumber.from(0),
        decimals: getNativeDecimals(chain),
      }
    case SupportedChain.METIS_ANDROMEDA:
    case SupportedChain.METIS_STARTDUST:
      return {
        type: GateInterface.NATIVE,
        itemName: 'Metis',
        itemSymbol: 'METIS',
        itemId: '0x0000000000000000000000000000000000000000',
        chain: chain,
        minimumBalance: ethers.BigNumber.from(0),
        decimals: getNativeDecimals(chain),
      }
  }
}
