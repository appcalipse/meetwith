import { useQuery } from '@tanstack/react-query'

import { getChainId, SupportedChain } from '@/types/chains'
import { getCryptoTokenBalance } from '@/utils/token.service'

import useAccountContext from './useAccountContext'

interface CryptoBalance {
  balance: number
  isLoading: boolean
  error: string | null
}

export const useCryptoBalance = (
  tokenAddress: string,
  chainId: number
): CryptoBalance => {
  const currentAccount = useAccountContext()

  // Map chainId to SupportedChain using centralized configuration
  const getChainFromId = (chainId: number): SupportedChain => {
    if (chainId === 0) {
      return SupportedChain.CELO
    }

    const chain = Object.values(SupportedChain).find(
      supportedChain => getChainId(supportedChain) === chainId
    )

    if (!chain) {
      throw new Error(`Unsupported chain ID: ${chainId}`)
    }

    return chain
  }

  const chain = getChainFromId(chainId)

  const { data, isLoading, error } = useQuery({
    cacheTime: 60000,
    enabled: !!currentAccount?.address && !!tokenAddress && chainId !== 0,
    queryFn: async () => {
      if (!currentAccount?.address || !tokenAddress || chainId === 0)
        return { balance: 0 }

      // Get token balance from blockchain
      return getCryptoTokenBalance(currentAccount.address, tokenAddress, chain)
    },
    queryKey: ['token-balance', currentAccount?.address, tokenAddress, chain],
    refetchInterval: 10000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 30000,
  })

  return {
    balance: data?.balance ?? 0,
    error: error instanceof Error ? error.message : null,
    isLoading,
  }
}
