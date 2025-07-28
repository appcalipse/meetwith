import { useQuery } from '@tanstack/react-query'

import { getCryptoBalance } from '@/utils/api_helper'

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

  const { data, isLoading, error } = useQuery({
    queryKey: [
      'crypto-balance',
      currentAccount?.address,
      tokenAddress,
      chainId,
    ],
    queryFn: async () => {
      if (!currentAccount?.address || !tokenAddress || !chainId)
        return { balance: 0 }
      return getCryptoBalance(currentAccount.address, tokenAddress, chainId)
    },
    enabled: !!currentAccount?.address && !!tokenAddress && !!chainId,
  })

  return {
    balance: data?.balance ?? 0,
    isLoading,
    error: error instanceof Error ? error.message : null,
  }
}
