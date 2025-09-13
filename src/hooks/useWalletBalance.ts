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
    queryKey: ['total-wallet-balance', currentAccount?.address],
    queryFn: async () => {
      if (!currentAccount?.address) return { balance: 0 }

      const result = await getTotalWalletBalance(currentAccount.address)
      return result
    },
    enabled: !!currentAccount?.address,
    staleTime: 0,
    cacheTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 10000,
  })

  return {
    totalBalance: balanceData?.balance || 0,
    currency,
    isLoading,
    error: error instanceof Error ? error.message : null,
  }
}
