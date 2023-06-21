import { BigNumber, ethers } from 'ethers'

import { getTokenBalance, getTokenInfo } from '@/utils/token.service'

import {
  DAI_ELEMENT,
  NFT_ELEMENT,
  USDC_ELEMENT,
  USDT_ELEMENT,
} from '../../testing/mocks'

describe('get balance for tokens', () => {
  beforeAll(() => {
    jest
      .spyOn(ethers, 'Contract')
      .mockImplementation((addressOrName: string) => {
        return {
          name: async () => {
            switch (addressOrName) {
              case USDT_ELEMENT.itemId:
                return Promise.resolve(USDT_ELEMENT.itemName)
              case NFT_ELEMENT.itemId:
                return Promise.resolve(NFT_ELEMENT.itemName)
            }
          },
          symbol: async () => {
            switch (addressOrName) {
              case USDT_ELEMENT.itemId:
                return Promise.resolve(USDT_ELEMENT.itemSymbol)
              case NFT_ELEMENT.itemId:
                return Promise.resolve(NFT_ELEMENT.itemSymbol)
            }
          },
          decimals: async () => {
            switch (addressOrName) {
              case USDT_ELEMENT.itemId:
                return Promise.resolve(18n)
              case NFT_ELEMENT.itemId:
                return Promise.resolve(0)
            }
          },
          baseURI: async () => {
            switch (addressOrName) {
              case USDT_ELEMENT.itemId:
                throw new Error('Not a NFT')
              case NFT_ELEMENT.itemId:
                return Promise.resolve('fakeBaseURi')
            }
          },
          balanceOf: async () => {
            switch (addressOrName) {
              case DAI_ELEMENT.itemId:
                return Promise.resolve(BigInt(1e18))
              case USDT_ELEMENT.itemId:
                return Promise.resolve(0n)
              case USDC_ELEMENT.itemId:
                return Promise.resolve(0n)
              case NFT_ELEMENT.itemId:
                return Promise.resolve(1n)
              default:
                return Promise.resolve(0n)
            }
          },
        } as any
      })
  })

  afterAll(() => {
    jest.unmock('ethers')
  })

  const WALLET_ADDRESS = '0x4F834fbb8b10F2cCbCBcA08D183aF3b9bdfCb2be'

  it('returns 0 because wallet has no balance of Mumbai USDT', async () => {
    const balance = await getTokenBalance(
      WALLET_ADDRESS,
      USDT_ELEMENT.itemId,
      USDT_ELEMENT.chain!
    )
    expect(balance).toEqual(0n)
  })

  it('returns more than zero cause wallet has balance of a mock DAI', async () => {
    const balance = await getTokenBalance(
      WALLET_ADDRESS,
      DAI_ELEMENT.itemId,
      DAI_ELEMENT.chain!
    )
    expect(balance).toEqual(BigInt(1e18))
  })

  it('returns one cause wallet holds NFT', async () => {
    const balance = await getTokenBalance(
      WALLET_ADDRESS,
      NFT_ELEMENT.itemId,
      NFT_ELEMENT.chain!
    )
    expect(balance).toEqual(1n)
  })

  it('returns token info for NFT', async () => {
    const tokenInfo = await getTokenInfo(NFT_ELEMENT.itemId, NFT_ELEMENT.chain!)

    expect(tokenInfo?.itemName).toEqual(NFT_ELEMENT.itemName)
    expect(tokenInfo?.itemSymbol).toEqual(NFT_ELEMENT.itemSymbol)
    expect(tokenInfo?.type).toEqual(NFT_ELEMENT.type)
    expect(tokenInfo?.chain).toEqual(NFT_ELEMENT.chain!)
    expect(tokenInfo?.itemId).toEqual(NFT_ELEMENT.itemId)
  })

  it('returns token info for ERC20', async () => {
    const tokenInfo = await getTokenInfo(
      USDT_ELEMENT.itemId,
      USDT_ELEMENT.chain!
    )
    expect(tokenInfo?.itemName).toEqual(USDT_ELEMENT.itemName)
    expect(tokenInfo?.itemSymbol).toEqual(USDT_ELEMENT.itemSymbol)
    expect(tokenInfo?.type).toEqual(USDT_ELEMENT.type)
    expect(tokenInfo?.chain).toEqual(USDT_ELEMENT.chain!)
    expect(tokenInfo?.itemId).toEqual(USDT_ELEMENT.itemId)
  })
})
