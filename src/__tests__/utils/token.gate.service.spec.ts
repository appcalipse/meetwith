import 'isomorphic-fetch'

import { BigNumber } from 'ethers'

import { SupportedChain } from '@/types/chains'
import {
  ConditionRelation,
  GateCondition,
  TokenGateElement,
  TokenInterface,
} from '@/types/TokenGating'
import { isConditionValid } from '@/utils/token.gate.service'

describe('get balance for tokens', () => {
  const WALLET_ADDRESS = '0x4F834fbb8b10F2cCbCBcA08D183aF3b9bdfCb2be'
  const WALLET_ADDRESS_FOR_POAP = '0xe5b06bfd663C94005B8b159Cd320Fd7976549f9b'

  const DAI_ELEMENT: TokenGateElement = {
    tokenName: 'Dai Stablecoin',
    tokenAddress: '0xcb7f6c752e00da963038f1bae79aafbca8473a36',
    tokenSymbol: 'DAI',
    chain: SupportedChain.POLYGON_MUMBAI,
    type: TokenInterface.ERC20,
    minimumBalance: BigNumber.from((1e18).toString()),
  }

  const USDC_ELEMENT: TokenGateElement = {
    tokenName: 'USD Coin',
    tokenAddress: '0xD33572f6DD1bb0D99C8397c8efE640Cf973EaF3B',
    tokenSymbol: 'USDC',
    chain: SupportedChain.POLYGON_MUMBAI,
    type: TokenInterface.ERC20,
    minimumBalance: BigNumber.from(0),
  }

  const USDT_ELEMENT: TokenGateElement = {
    tokenName: 'USDT Test Token',
    tokenAddress: '0x36fEe18b265FBf21A89AD63ea158F342a7C64abB',
    tokenSymbol: 'USDT',
    chain: SupportedChain.POLYGON_MUMBAI,
    type: TokenInterface.ERC20,
    minimumBalance: BigNumber.from(1),
  }

  const NFT_ELEMENT: TokenGateElement = {
    tokenName: 'Non-Fungible Matic',
    tokenAddress: '0x72B6Dc1003E154ac71c76D3795A3829CfD5e33b9',
    tokenSymbol: 'NFM',
    chain: SupportedChain.POLYGON_MATIC,
    type: TokenInterface.ERC721,
    minimumBalance: BigNumber.from(1),
  }

  const POAP_MWW: TokenGateElement = {
    tokenName: 'Meet With Wallet early supporters',
    tokenAddress: '33550',
    tokenSymbol: '',
    chain: SupportedChain.POLYGON_MATIC,
    type: TokenInterface.POAP,
    minimumBalance: BigNumber.from(1),
  }

  const POAP_RANDOM: TokenGateElement = {
    tokenName: 'imnotArt test 3',
    tokenAddress: '3350',
    tokenSymbol: '',
    chain: SupportedChain.POLYGON_MATIC,
    type: TokenInterface.POAP,
    minimumBalance: BigNumber.from(1),
  }

  const CONDITION_MOCK_DAI_OR_USDT: GateCondition = {
    relation: ConditionRelation.OR,
    elements: [DAI_ELEMENT, USDT_ELEMENT],
    conditions: [],
  }

  const CONDITION_NFT: GateCondition = {
    relation: ConditionRelation.AND,
    elements: [NFT_ELEMENT],
    conditions: [],
  }

  const CONDITION_USDC: GateCondition = {
    relation: ConditionRelation.AND,
    elements: [USDC_ELEMENT],
    conditions: [],
  }

  const CONDITION_NFT_AND_DAI_OR_USDT: GateCondition = {
    relation: ConditionRelation.AND,
    conditions: [CONDITION_MOCK_DAI_OR_USDT, CONDITION_NFT],
    elements: [],
  }

  const CONDITION_NFT_AND_USDT = {
    relation: ConditionRelation.AND,
    elements: [NFT_ELEMENT, USDT_ELEMENT],
    conditions: [],
  }

  const CONDITION_RANDOM_POAP = {
    relation: ConditionRelation.AND,
    elements: [POAP_RANDOM],
    conditions: [],
  }

  const CONDITION_MWW_POAP = {
    relation: ConditionRelation.AND,
    elements: [POAP_MWW],
    conditions: [],
  }

  it('should be true given wallet holds both DAI and the NFT', async () => {
    const conditionShouldBeMet = await isConditionValid(
      CONDITION_NFT_AND_DAI_OR_USDT,
      WALLET_ADDRESS
    )
    expect(conditionShouldBeMet).toBeTruthy()
  })

  it("should be false given wallet doesn't have any USDC even if minBalance condition is Zero", async () => {
    const conditionShouldNotBeMet = await isConditionValid(
      CONDITION_USDC,
      WALLET_ADDRESS
    )
    expect(conditionShouldNotBeMet).toBeFalsy()
  })

  it("should be false given wallet doesn't have POAP", async () => {
    const conditionShouldNotBeMet = await isConditionValid(
      CONDITION_RANDOM_POAP,
      WALLET_ADDRESS_FOR_POAP
    )
    expect(conditionShouldNotBeMet).toBeFalsy()
  })

  it('should be true given wallet have POAP', async () => {
    const conditionShouldBeMet = await isConditionValid(
      CONDITION_MWW_POAP,
      WALLET_ADDRESS_FOR_POAP
    )
    expect(conditionShouldBeMet).toBeTruthy()
  })

  it('should be false given wallet holds the NFT but do not hold USDT', async () => {
    const conditionShouldNotBeMet = await isConditionValid(
      CONDITION_NFT_AND_USDT,
      WALLET_ADDRESS
    )
    expect(conditionShouldNotBeMet).toBeFalsy()
  })
})
