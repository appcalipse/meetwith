import { getRpcClient } from 'thirdweb/rpc'
import { formatEther } from 'viem'

import { AcceptedToken, getChainInfo, SupportedChain } from '@/types/chains'
import { TransactionCouldBeNotFoundError } from '@/utils/errors'
import { PriceFeedService } from '@/utils/services/chainlink.service'
import { thirdWebClient } from '@/utils/user_manager'

import { TRANSFER_FUNCTION_SELECTOR } from './constants'

// Helper function to extract receiver address from ERC20 transfer input data
function extractReceiverFromERC20Input(input: string): string | null {
  if (input.startsWith(TRANSFER_FUNCTION_SELECTOR) && input.length >= 138) {
    const receiverHex = input.slice(34, 74)
    return `0x${receiverHex}`
  }
  return null
}

export async function getTransactionFeeThirdweb(
  txHash: `0x${string}`,
  chain: SupportedChain
) {
  const priceService = new PriceFeedService()
  const chainInfo = getChainInfo(chain)
  const rpcRequest = getRpcClient({
    chain: chainInfo!.thirdwebChain,
    client: thirdWebClient,
  })

  const [tx, receipt] = await Promise.all([
    rpcRequest({
      method: 'eth_getTransactionByHash',
      params: [txHash],
    }),
    rpcRequest({
      method: 'eth_getTransactionReceipt',
      params: [txHash],
    }),
  ])
  if (!tx || !receipt) {
    throw new TransactionCouldBeNotFoundError(txHash)
  }
  const gasUsed = BigInt(receipt?.gasUsed || 0)
  const gasPrice = BigInt(tx?.gasPrice || 0)
  const fee = gasUsed * gasPrice
  const feeInEth = parseFloat(formatEther(fee))
  const priceInUsd = await priceService.getPrice(
    chain,
    [SupportedChain.CELO, SupportedChain.CELO_ALFAJORES].includes(chain)
      ? AcceptedToken.CELO
      : AcceptedToken.ETHER
  )
  const feeInUSD = feeInEth * priceInUsd

  let receiverAddress: string | null = null

  if (!tx.input || tx.input === '0x') {
    receiverAddress = tx.to
  } else {
    receiverAddress = extractReceiverFromERC20Input(tx.input)
  }

  return {
    feeInEth: Number(fee) / 1e18,
    feeInUSD,
    feeInWei: fee.toString(),
    from: tx.from,
    gasPrice: gasPrice.toString(),
    gasUsed: gasUsed.toString(),
    receiverAddress,
  }
}
