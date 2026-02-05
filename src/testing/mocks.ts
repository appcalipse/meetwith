import { SupportedChain } from '@/types/chains'
import { ConditionRelation } from '@/types/common'
import {
  GateCondition,
  GateInterface,
  TokenGateElement,
} from '@/types/TokenGating'
export const DAI_ELEMENT: TokenGateElement = {
  chain: SupportedChain.POLYGON_AMOY,
  itemId: '0xcb7f6c752e00da963038f1bae79aafbca8473a36',
  itemName: 'Dai Stablecoin',
  itemSymbol: 'DAI',
  minimumBalance: BigInt(1e18),
  type: GateInterface.ERC20,
}

export const USDC_ELEMENT: TokenGateElement = {
  chain: SupportedChain.POLYGON_AMOY,
  itemId: '0xD33572f6DD1bb0D99C8397c8efE640Cf973EaF3B',
  itemName: 'USD Coin',
  itemSymbol: 'USDC',
  minimumBalance: 0n,
  type: GateInterface.ERC20,
}

export const USDT_ELEMENT: TokenGateElement = {
  chain: SupportedChain.POLYGON_AMOY,
  itemId: '0x36fEe18b265FBf21A89AD63ea158F342a7C64abB',
  itemName: 'USDT Test Token',
  itemSymbol: 'USDT',
  minimumBalance: 1n,
  type: GateInterface.ERC20,
}

export const NFT_ELEMENT: TokenGateElement = {
  chain: SupportedChain.POLYGON_MATIC,
  itemId: '0x72B6Dc1003E154ac71c76D3795A3829CfD5e33b9',
  itemName: 'Non-Fungible Matic',
  itemSymbol: 'NFM',
  minimumBalance: 1n,
  type: GateInterface.ERC721,
}

export const POAP_MWW: TokenGateElement = {
  itemId: '33550',
  itemName: 'Meetwith early supporters',
  itemSymbol: '',
  minimumBalance: 1n,
  type: GateInterface.POAP,
}

export const POAP_RANDOM: TokenGateElement = {
  itemId: '3350',
  itemName: 'imnotArt test 3',
  itemSymbol: '',
  minimumBalance: 1n,
  type: GateInterface.POAP,
}

export const CONDITION_MOCK_DAI_OR_USDT: GateCondition = {
  conditions: [],
  elements: [DAI_ELEMENT, USDT_ELEMENT],
  relation: ConditionRelation.OR,
}

export const CONDITION_NFT: GateCondition = {
  conditions: [],
  elements: [NFT_ELEMENT],
  relation: ConditionRelation.AND,
}

export const CONDITION_USDC: GateCondition = {
  conditions: [],
  elements: [USDC_ELEMENT],
  relation: ConditionRelation.AND,
}

export const CONDITION_NFT_AND_DAI_OR_USDT: GateCondition = {
  conditions: [CONDITION_MOCK_DAI_OR_USDT, CONDITION_NFT],
  elements: [],
  relation: ConditionRelation.AND,
}

export const CONDITION_NFT_AND_USDT = {
  conditions: [],
  elements: [NFT_ELEMENT, USDT_ELEMENT],
  relation: ConditionRelation.AND,
}

export const CONDITION_RANDOM_POAP = {
  conditions: [],
  elements: [POAP_RANDOM],
  relation: ConditionRelation.AND,
}

export const CONDITION_MWW_POAP = {
  conditions: [],
  elements: [POAP_MWW],
  relation: ConditionRelation.AND,
}
