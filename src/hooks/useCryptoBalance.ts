import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { getWalletTransactions } from '@/utils/api_helper'

import useAccountContext from './useAccountContext'

interface CryptoBalance {
  balance: number
  fiatEquivalent: number
  isLoading: boolean
  error: string | null
}

export const useCryptoBalance = (
  tokenAddress: string,
  chainId: number
): CryptoBalance => {
  const currentAccount = useAccountContext()
  const [balance, setBalance] = useState(0)
  const [fiatEquivalent, setFiatEquivalent] = useState(0)

  const {
    data: transactions,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      'crypto-transactions',
      currentAccount?.address,
      tokenAddress,
      chainId,
    ],
    queryFn: async () => {
      if (!currentAccount?.address) return []

      return getWalletTransactions(
        currentAccount.address,
        tokenAddress,
        chainId
      )
    },
    enabled: !!currentAccount?.address && !!tokenAddress && !!chainId,
  })

  useEffect(() => {
    if (transactions && Array.isArray(transactions)) {
      const cryptoBalance = transactions.reduce((acc: number, tx: any) => {
        if (tx.direction === 'CREDIT') {
          return acc + tx.amount
        } else {
          return acc - tx.amount
        }
      }, 0)

      const fiatBalance = transactions.reduce((acc: number, tx: any) => {
        if (tx.direction === 'CREDIT') {
          return acc + (tx.fiat_equivalent || tx.amount)
        } else {
          return acc - (tx.fiat_equivalent || tx.amount)
        }
      }, 0)

      setBalance(cryptoBalance)
      setFiatEquivalent(fiatBalance)
    }
  }, [transactions])

  return {
    balance,
    fiatEquivalent,
    isLoading,
    error: error instanceof Error ? error.message : null,
  }
}
