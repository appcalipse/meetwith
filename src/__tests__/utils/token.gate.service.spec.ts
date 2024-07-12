import * as thirdWeb from 'thirdweb'
import { base } from 'thirdweb/chains'

import { SupportedChain } from '@/types/chains'
import * as helper from '@/utils/api_helper'
import { isConditionValid } from '@/utils/token.gate.service'

import {
  CONDITION_MWW_POAP,
  CONDITION_NFT_AND_DAI_OR_USDT,
  CONDITION_NFT_AND_USDT,
  CONDITION_RANDOM_POAP,
  CONDITION_USDC,
  DAI_ELEMENT,
  NFT_ELEMENT,
  POAP_MWW,
  USDC_ELEMENT,
  USDT_ELEMENT,
} from '../../testing/mocks'
jest.mock('@/utils/api_helper')
jest.mock('thirdweb')
describe('get balance for tokens', () => {
  afterAll(() => {
    jest.unmock('ethers')
  })

  const WALLET_ADDRESS = '0x4F834fbb8b10F2cCbCBcA08D183aF3b9bdfCb2be'
  it('should be true given wallet holds both DAI and the NFT', async () => {
    jest
      .spyOn(thirdWeb, 'readContract')
      .mockResolvedValue(Promise.resolve(BigInt(1e18) as unknown as unknown[]))
    const conditionShouldBeMet = await isConditionValid(
      CONDITION_NFT_AND_DAI_OR_USDT,
      WALLET_ADDRESS
    )
    expect(conditionShouldBeMet.isValid).toBeTruthy()
  })

  it("should be false given wallet doesn't have any USDC even if minBalance condition is Zero", async () => {
    jest
      .spyOn(thirdWeb, 'readContract')
      .mockResolvedValue(Promise.resolve(BigInt(0n) as unknown as unknown[]))
    const conditionShouldNotBeMet = await isConditionValid(
      CONDITION_USDC,
      WALLET_ADDRESS
    )
    expect(conditionShouldNotBeMet.isValid).toBeFalsy()
  })

  it("should be false given wallet doesn't have POAP", async () => {
    const conditionShouldNotBeMet = await isConditionValid(
      CONDITION_RANDOM_POAP,
      WALLET_ADDRESS
    )
    expect(conditionShouldNotBeMet.isValid).toBeFalsy()
  })

  it('should be true given wallet have POAP', async () => {
    jest.spyOn(helper, 'getWalletPOAP').mockResolvedValue({
      chain: 'Test Chain',
      created: new Date().toString(),
      event: {
        city: 'value',
        country: 'w',
        description: '',
        end_date: '',
        event_url: '',
        expiry_date: '',
        fancy_id: '',
        id: 1,
        image_url: '',
        start_date: new Date().toString(),
        name: '',
        supply: 4,
        year: 1000,
      },
      owner: 'eee',
      tokenId: 'eejje',
    })
    const conditionShouldBeMet = await isConditionValid(
      CONDITION_MWW_POAP,
      WALLET_ADDRESS
    )
    expect(conditionShouldBeMet.isValid).toBeTruthy()
  })

  it('should be false given wallet holds the NFT but do not hold USDT', async () => {
    const conditionShouldNotBeMet = await isConditionValid(
      CONDITION_NFT_AND_USDT,
      WALLET_ADDRESS
    )
    expect(conditionShouldNotBeMet.isValid).toBeFalsy()
  })
})
