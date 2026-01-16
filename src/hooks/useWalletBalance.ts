import { useQuery } from '@tanstack/react-query'

import { getTotalWalletBalance } from '@/utils/token.service'

import useAccountContext from './useAccountContext'

interface WalletBalance {
  totalBalance: number
  currency: string
  isLoading: boolean
  error: string | null
}

export const useWalletBalance = (currency = 'USD'): WalletBalance => {
  const currentAccount = useAccountContext()

  const {
    data: balanceData,
    isLoading,
    error,
  } = useQuery({
    cacheTime: 0,
    enabled: !!currentAccount?.address,
    queryFn: async () => {
      if (!currentAccount?.address) return { balance: 0 }

      const result = await getTotalWalletBalance(currentAccount.address)
      return result
    },
    queryKey: ['total-wallet-balance', currentAccount?.address],
    refetchInterval: 10000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  })

  return {
    currency,
    error: error instanceof Error ? error.message : null,
    isLoading,
    totalBalance: balanceData?.balance || 0,
  }
}
