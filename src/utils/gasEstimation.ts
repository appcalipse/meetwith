import {
  estimateGas,
  getContract,
  getGasPrice,
  prepareContractCall,
} from 'thirdweb'
import type { Account } from 'thirdweb/wallets'
import { parseUnits } from 'viem'

import { AcceptedToken, getChainInfo, SupportedChain } from '@/types/chains'
import { PriceFeedService } from '@/utils/services/chainlink.service'
import { getTokenInfo } from '@/utils/token.service'
import { thirdWebClient } from '@/utils/user_manager'

export interface Token {
  name: string
  symbol: string
  icon: string
  address: string
  chain: SupportedChain
  decimals: number
  chainId: number
}

export interface GasEstimationParams {
  selectedToken: Token
  recipientAddress: string
  amount: string
  sendNetwork: SupportedChain
  activeWallet: {
    getAccount: () => Account | undefined
  }
}

export interface GasEstimationResult {
  estimatedFee: number
  success: boolean
  error?: string
}

export const estimateGasFee = async (
  params: GasEstimationParams
): Promise<GasEstimationResult> => {
  const { selectedToken, recipientAddress, amount, sendNetwork, activeWallet } =
    params

  try {
    const chainInfo = getChainInfo(sendNetwork)
    if (!chainInfo) {
      return { error: 'Unsupported network', estimatedFee: 0, success: false }
    }

    // Create contract instance
    const contract = getContract({
      abi: [
        {
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          name: 'transfer',
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ],
      address: selectedToken.address as `0x${string}`,
      chain: chainInfo.thirdwebChain,
      client: thirdWebClient,
    })

    // Get token info for decimals
    const tokenInfo = await getTokenInfo(
      selectedToken.address as `0x${string}`,
      sendNetwork
    )
    if (!tokenInfo?.decimals) {
      return {
        error: 'Unable to get token details',
        estimatedFee: 0,
        success: false,
      }
    }

    // Get market price for the token
    const priceFeed = new PriceFeedService()
    const tokenMarketPrice = await priceFeed.getPrice(
      sendNetwork,
      AcceptedToken.USDC
    )

    // Convert user input to token amount using market price
    const transferAmount = parseUnits(
      `${parseFloat(amount) / tokenMarketPrice}`,
      tokenInfo.decimals
    )

    // Prepare transaction for gas estimation
    const transaction = prepareContractCall({
      contract,
      method: 'transfer',
      params: [recipientAddress as `0x${string}`, transferAmount],
    })

    // Estimate gas
    const gasEstimate = await estimateGas({
      account: activeWallet.getAccount()!,
      transaction,
    })

    // Get current gas price
    const gasPrice = await getGasPrice({
      chain: chainInfo.thirdwebChain,
      client: thirdWebClient,
    })

    // Calculate fee in native token
    const feeInNative = (Number(gasEstimate) * Number(gasPrice)) / 1e18

    // Convert to USD using native token price
    const nativeTokenSymbolMap: Record<string, AcceptedToken> = {
      CELO: AcceptedToken.CELO,
      ETH: AcceptedToken.ETHER,
    }
    const nativeToken =
      nativeTokenSymbolMap[chainInfo.nativeTokenSymbol] || AcceptedToken.ETHER

    const nativeTokenPrice = await priceFeed.getPrice(sendNetwork, nativeToken)

    const feeInUSD = feeInNative * nativeTokenPrice

    return {
      estimatedFee: feeInUSD,
      success: true,
    }
  } catch (error) {
    console.error('Error estimating gas fee:', error)

    return {
      error: error instanceof Error ? error.message : 'Unknown error',
      estimatedFee: 0,
      success: false,
    }
  }
}
