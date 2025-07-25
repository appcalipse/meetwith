import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { getWalletBalance } from '@/utils/api_helper'

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
    queryKey: ['wallet-balance', currentAccount?.address],
    queryFn: async () => {
      if (!currentAccount?.address) return { balance: 0 }

      const result = await getWalletBalance(currentAccount.address)
      return result as { balance: number }
    },
    enabled: !!currentAccount?.address,
    // Add caching and stale time for better performance
    staleTime: 60000, // 1 minute - balance doesn't change frequently
    cacheTime: 600000, // 10 minutes - longer cache for better UX
    refetchOnWindowFocus: false, // Don't refetch when user switches tabs
    refetchOnMount: false, // Don't refetch on component mount if we have cached data
  })

  return {
    totalBalance: balanceData?.balance || 0,
    currency,
    isLoading,
    error: error instanceof Error ? error.message : null,
  }
}
