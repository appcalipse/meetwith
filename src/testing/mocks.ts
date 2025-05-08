import { SupportedChain } from '@/types/chains'
import { ConditionRelation } from '@/types/common'
import {
  GateCondition,
  GateInterface,
  TokenGateElement,
} from '@/types/TokenGating'
export const DAI_ELEMENT: TokenGateElement = {
  itemName: 'Dai Stablecoin',
  itemId: '0xcb7f6c752e00da963038f1bae79aafbca8473a36',
  itemSymbol: 'DAI',
  chain: SupportedChain.POLYGON_AMOY,
  type: GateInterface.ERC20,
  minimumBalance: BigInt(1e18),
}

export const USDC_ELEMENT: TokenGateElement = {
  itemName: 'USD Coin',
  itemId: '0xD33572f6DD1bb0D99C8397c8efE640Cf973EaF3B',
  itemSymbol: 'USDC',
  chain: SupportedChain.POLYGON_AMOY,
  type: GateInterface.ERC20,
  minimumBalance: 0n,
}

export const USDT_ELEMENT: TokenGateElement = {
  itemName: 'USDT Test Token',
  itemId: '0x36fEe18b265FBf21A89AD63ea158F342a7C64abB',
  itemSymbol: 'USDT',
  chain: SupportedChain.POLYGON_AMOY,
  type: GateInterface.ERC20,
  minimumBalance: 1n,
}

export const NFT_ELEMENT: TokenGateElement = {
  itemName: 'Non-Fungible Matic',
  itemId: '0x72B6Dc1003E154ac71c76D3795A3829CfD5e33b9',
  itemSymbol: 'NFM',
  chain: SupportedChain.POLYGON_MATIC,
  type: GateInterface.ERC721,
  minimumBalance: 1n,
}

export const POAP_MWW: TokenGateElement = {
  itemName: 'Meetwith early supporters',
  itemId: '33550',
  itemSymbol: '',
  type: GateInterface.POAP,
  minimumBalance: 1n,
}

export const POAP_RANDOM: TokenGateElement = {
  itemName: 'imnotArt test 3',
  itemId: '3350',
  itemSymbol: '',
  type: GateInterface.POAP,
  minimumBalance: 1n,
}

export const CONDITION_MOCK_DAI_OR_USDT: GateCondition = {
  relation: ConditionRelation.OR,
  elements: [DAI_ELEMENT, USDT_ELEMENT],
  conditions: [],
}

export const CONDITION_NFT: GateCondition = {
  relation: ConditionRelation.AND,
  elements: [NFT_ELEMENT],
  conditions: [],
}

export const CONDITION_USDC: GateCondition = {
  relation: ConditionRelation.AND,
  elements: [USDC_ELEMENT],
  conditions: [],
}

export const CONDITION_NFT_AND_DAI_OR_USDT: GateCondition = {
  relation: ConditionRelation.AND,
  conditions: [CONDITION_MOCK_DAI_OR_USDT, CONDITION_NFT],
  elements: [],
}

export const CONDITION_NFT_AND_USDT = {
  relation: ConditionRelation.AND,
  elements: [NFT_ELEMENT, USDT_ELEMENT],
  conditions: [],
}

export const CONDITION_RANDOM_POAP = {
  relation: ConditionRelation.AND,
  elements: [POAP_RANDOM],
  conditions: [],
}

export const CONDITION_MWW_POAP = {
  relation: ConditionRelation.AND,
  elements: [POAP_MWW],
  conditions: [],
}
export const TEST_ACCOUNT_REGEX = /0x[a-fA-F0-9]/
