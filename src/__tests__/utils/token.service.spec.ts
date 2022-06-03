import { BigNumber } from 'ethers'

import { SupportedChain } from '@/types/chains'
import { TokenInterface } from '@/types/TokenGating'
import { getTokenBalance, getTokenInfo } from '@/utils/token.service'

describe('get balance for tokens', () => {
  const WALLET_ADDRESS = '0x4F834fbb8b10F2cCbCBcA08D183aF3b9bdfCb2be'

  it('returns 0 because wallet has no balance of Mumbai USDT', async () => {
    const balance = await getTokenBalance(
      WALLET_ADDRESS,
      '0x36fEe18b265FBf21A89AD63ea158F342a7C64abB',
      SupportedChain.POLYGON_MUMBAI
    )
    expect(balance).toEqual(BigNumber.from(0))
  })

  it('returns more than zero cause wallet has balance of a mock DAI', async () => {
    const balance = await getTokenBalance(
      WALLET_ADDRESS,
      '0xcb7f6c752e00da963038f1bae79aafbca8473a36',
      SupportedChain.POLYGON_MUMBAI
    )
    expect(balance).toEqual(BigNumber.from((1e18).toString()))
  })

  it('returns one cause wallet holds NFT', async () => {
    const balance = await getTokenBalance(
      WALLET_ADDRESS,
      '0x72B6Dc1003E154ac71c76D3795A3829CfD5e33b9',
      SupportedChain.POLYGON_MATIC
    )
    expect(balance).toEqual(BigNumber.from(1))
  })

  it('returns token info for NFT', async () => {
    const tokenInfo = await getTokenInfo(
      '0x72B6Dc1003E154ac71c76D3795A3829CfD5e33b9',
      SupportedChain.POLYGON_MATIC
    )
    expect(tokenInfo?.tokenName).toEqual('Non-Fungible Matic')
    expect(tokenInfo?.tokenSymbol).toEqual('NFM')
    expect(tokenInfo?.type).toEqual(TokenInterface.ERC721)
    expect(tokenInfo?.chain).toEqual(SupportedChain.POLYGON_MATIC)
    expect(tokenInfo?.tokenAddress).toEqual(
      '0x72B6Dc1003E154ac71c76D3795A3829CfD5e33b9'
    )
  })

  it('returns token info for ERC20', async () => {
    const tokenInfo = await getTokenInfo(
      '0x36fEe18b265FBf21A89AD63ea158F342a7C64abB',
      SupportedChain.POLYGON_MUMBAI
    )
    expect(tokenInfo?.tokenName).toEqual('Tether USD Test Token')
    expect(tokenInfo?.tokenSymbol).toEqual('USDT')
    expect(tokenInfo?.type).toEqual(TokenInterface.ERC20)
    expect(tokenInfo?.chain).toEqual(SupportedChain.POLYGON_MUMBAI)
    expect(tokenInfo?.tokenAddress).toEqual(
      '0x36fEe18b265FBf21A89AD63ea158F342a7C64abB'
    )
  })
})
