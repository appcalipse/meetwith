import { BigNumber, ethers } from 'ethers'

import { SupportedChain } from '@/types/chains'
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

describe('get balance for tokens', () => {
  beforeAll(() => {
    global.fetch = jest.fn().mockImplementation((path: string) => {
      return Promise.resolve({
        status: 200,
        json: () =>
          Promise.resolve([
            path.indexOf(POAP_MWW.itemId) === -1
              ? null
              : {
                  event: {},
                  tokenId: 'string',
                  chain: SupportedChain.POLYGON_MATIC,
                  created: 'YYYY-MM-DD HH:mm:ss',
                },
          ]),
      })
    })

    jest
      .spyOn(ethers, 'Contract')
      .mockImplementation((addressOrName: string) => {
        return {
          balanceOf: async () => {
            switch (addressOrName) {
              case DAI_ELEMENT.itemId:
                return Promise.resolve(BigNumber.from((2e18).toString()))
              case USDT_ELEMENT.itemId:
                return Promise.resolve(BigNumber.from(0))
              case USDC_ELEMENT.itemId:
                return Promise.resolve(BigNumber.from(0))
              case NFT_ELEMENT.itemId:
                return Promise.resolve(BigNumber.from(1))
              default:
                return Promise.resolve(BigNumber.from(0))
            }
          },
        } as any
      })
  })

  afterAll(() => {
    jest.unmock('ethers')
  })

  const WALLET_ADDRESS = '0x4F834fbb8b10F2cCbCBcA08D183aF3b9bdfCb2be'

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
      WALLET_ADDRESS
    )
    expect(conditionShouldNotBeMet).toBeFalsy()
  })

  it('should be true given wallet have POAP', async () => {
    const conditionShouldBeMet = await isConditionValid(
      CONDITION_MWW_POAP,
      WALLET_ADDRESS
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
