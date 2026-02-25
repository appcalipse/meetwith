import { ethers } from 'ethers'
import * as thirdWeb from 'thirdweb'

import { getTokenBalance, getTokenInfo, getTokenMeta } from '@/utils/token.service'

import {
  DAI_ELEMENT,
  NFT_ELEMENT,
  USDC_ELEMENT,
  USDT_ELEMENT,
} from '../../testing/mocks'

jest.mock('thirdweb')
describe('token.service', () => {
  afterAll(() => {
    jest.unmock('thirdweb')
  })

  const WALLET_ADDRESS = '0x4F834fbb8b10F2cCbCBcA08D183aF3b9bdfCb2be'

  describe('getTokenBalance', () => {
    it('returns 0 because wallet has no balance of Mumbai USDT', async () => {
      jest
        .spyOn(thirdWeb, 'readContract')
        .mockResolvedValue(Promise.resolve(BigInt(0n) as unknown as unknown[]))
      const balance = await getTokenBalance(
        WALLET_ADDRESS,
        USDT_ELEMENT.itemId as `0x${string}`,
        USDT_ELEMENT.chain!
      )
      expect(balance).toEqual(0n)
    })

    it('returns more than zero cause wallet has balance of a mock DAI', async () => {
      jest
        .spyOn(thirdWeb, 'readContract')
        .mockResolvedValue(Promise.resolve(BigInt(1e18) as unknown as unknown[]))
      const balance = await getTokenBalance(
        WALLET_ADDRESS,
        DAI_ELEMENT.itemId as `0x${string}`,
        DAI_ELEMENT.chain!
      )
      expect(balance).toEqual(BigInt(1e18))
    })

    it('returns one cause wallet holds NFT', async () => {
      jest
        .spyOn(thirdWeb, 'readContract')
        .mockResolvedValue(Promise.resolve(BigInt(1n) as unknown as unknown[]))
      const balance = await getTokenBalance(
        WALLET_ADDRESS,
        NFT_ELEMENT.itemId as `0x${string}`,
        NFT_ELEMENT.chain!
      )
      expect(balance).toEqual(1n)
    })
  })

  describe('getTokenInfo', () => {
    it('returns token info for NFT', async () => {
      jest.spyOn(thirdWeb, 'readContract').mockImplementation(({ method }) => {
        switch (method) {
          case 'name':
            return Promise.resolve(NFT_ELEMENT.itemName as unknown as unknown[])
          case 'symbol':
            return Promise.resolve(NFT_ELEMENT.itemSymbol as unknown as unknown[])
          case 'decimals':
            return Promise.resolve(0 as unknown as unknown[])
          case 'function baseURI()':
            return Promise.resolve('fakeBaseURi' as unknown as unknown[])
          default:
            return Promise.resolve(0n as unknown as unknown[])
        }
      })
      const tokenInfo = await getTokenInfo(
        NFT_ELEMENT.itemId as `0x${string}`,
        NFT_ELEMENT.chain!
      )
      expect(tokenInfo?.itemName).toEqual(NFT_ELEMENT.itemName)
      expect(tokenInfo?.itemSymbol).toEqual(NFT_ELEMENT.itemSymbol)
      expect(tokenInfo?.type).toEqual(NFT_ELEMENT.type)
      expect(tokenInfo?.chain).toEqual(NFT_ELEMENT.chain!)
      expect(tokenInfo?.itemId).toEqual(NFT_ELEMENT.itemId)
    })

    it('returns token info for ERC20', async () => {
      jest.spyOn(thirdWeb, 'readContract').mockImplementation(({ method }) => {
        switch (method) {
          case 'name':
            return Promise.resolve(USDT_ELEMENT.itemName as unknown as unknown[])
          case 'symbol':
            return Promise.resolve(
              USDT_ELEMENT.itemSymbol as unknown as unknown[]
            )
          case 'decimals':
            return Promise.resolve(0 as unknown as unknown[])
          case 'function baseURI()':
            return Promise.resolve(0 as unknown as unknown[])
          default:
            return Promise.resolve(0n as unknown as unknown[])
        }
      })
      const tokenInfo = await getTokenInfo(
        USDT_ELEMENT.itemId as `0x${string}`,
        USDT_ELEMENT.chain!
      )
      expect(tokenInfo?.itemName).toEqual(USDT_ELEMENT.itemName)
      expect(tokenInfo?.itemSymbol).toEqual(USDT_ELEMENT.itemSymbol)
      expect(tokenInfo?.type).toEqual(USDT_ELEMENT.type)
      expect(tokenInfo?.chain).toEqual(USDT_ELEMENT.chain!)
      expect(tokenInfo?.itemId).toEqual(USDT_ELEMENT.itemId)
    })

    it('returns null when readContract throws', async () => {
      jest
        .spyOn(thirdWeb, 'readContract')
        .mockRejectedValue(new Error('Contract call failed'))

      const tokenInfo = await getTokenInfo(
        '0x0000000000000000000000000000000000000001',
        USDT_ELEMENT.chain!
      )
      expect(tokenInfo).toBeNull()
    })
  })

  describe('getTokenMeta', () => {
    const originalFetch = global.fetch

    beforeEach(() => {
      global.fetch = jest.fn()
    })

    afterEach(() => {
      global.fetch = originalFetch
    })

    it('should return token metadata from CoinGecko', async () => {
      const mockMeta = {
        id: 'ethereum',
        symbol: 'eth',
        name: 'Ethereum',
      }
      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockMeta),
      })

      const result = await getTokenMeta('ethereum', '0xtoken')
      expect(result).toEqual(mockMeta)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('coingecko.com'),
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should pass the token address in the URL', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue({}),
      })

      await getTokenMeta('ethereum', '0xABC123')
      const [url] = (global.fetch as jest.Mock).mock.calls[0]
      expect(url).toContain('0xABC123')
    })
  })
})
