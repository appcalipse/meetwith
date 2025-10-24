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
      return { estimatedFee: 0, success: false, error: 'Unsupported network' }
    }

    // Create contract instance
    const contract = getContract({
      client: thirdWebClient,
      chain: chainInfo.thirdwebChain,
      address: selectedToken.address as `0x${string}`,
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
    })

    // Get token info for decimals
    const tokenInfo = await getTokenInfo(
      selectedToken.address as `0x${string}`,
      sendNetwork
    )
    if (!tokenInfo?.decimals) {
      return {
        estimatedFee: 0,
        success: false,
        error: 'Unable to get token details',
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
      transaction,
      account: activeWallet.getAccount()!,
    })

    // Get current gas price
    const gasPrice = await getGasPrice({
      client: thirdWebClient,
      chain: chainInfo.thirdwebChain,
    })

    // Calculate fee in native token
    const feeInNative = (Number(gasEstimate) * Number(gasPrice)) / 1e18

    // Convert to USD using native token price
    const nativeTokenPrice = await priceFeed.getPrice(
      sendNetwork,
      [SupportedChain.CELO, SupportedChain.CELO_ALFAJORES].includes(sendNetwork)
        ? AcceptedToken.CELO
        : AcceptedToken.ETHER
    )

    const feeInUSD = feeInNative * nativeTokenPrice

    return {
      estimatedFee: feeInUSD,
      success: true,
    }
  } catch (error) {
    console.error('Error estimating gas fee:', error)

    return {
      estimatedFee: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
