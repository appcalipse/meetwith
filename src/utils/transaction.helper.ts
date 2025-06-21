import { getRpcClient } from 'thirdweb/rpc'
import { formatEther } from 'viem'

import { AcceptedToken, getChainInfo, SupportedChain } from '@/types/chains'
import { TransactionCouldBeNotFoundError } from '@/utils/errors'
import { PriceFeedService } from '@/utils/services/chainlink.service'
import { thirdWebClient } from '@/utils/user_manager'

export async function getTransactionFeeThirdweb(
  txHash: `0x${string}`,
  chain: SupportedChain
) {
  const priceService = new PriceFeedService()
  const chainInfo = getChainInfo(chain)
  const rpcRequest = getRpcClient({
    client: thirdWebClient,
    chain: chainInfo!.thirdwebChain,
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
  return {
    gasUsed: gasUsed.toString(),
    gasPrice: gasPrice.toString(),
    feeInWei: fee.toString(),
    feeInEth: Number(fee) / 1e18,
    feeInUSD,
    from: tx.from,
  }
}
