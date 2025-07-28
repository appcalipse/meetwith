import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

import { FormattedTransaction, WalletTransaction } from '@/types/Transactions'
import { getWalletTransactions } from '@/utils/api_helper'

import useAccountContext from './useAccountContext'

export const useWalletTransactions = (
  tokenAddress?: string,
  chainId?: number
) => {
  const currentAccount = useAccountContext()

  const {
    data: transactions,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      'wallet-transactions',
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
    enabled: !!currentAccount?.address,
    staleTime: 30000, // 30 seconds
    cacheTime: 300000, // 5 minutes
  })

  const formatTransaction = (tx: WalletTransaction): FormattedTransaction => {
    const isCredit = tx.direction === 'credit'
    const amount = tx.fiat_equivalent || tx.amount
    const formattedAmount = `$${amount.toLocaleString()}`

    // Determine user and action based on transaction type
    let user = 'Unknown'
    let action = isCredit ? 'sent you' : 'You sent'

    if (tx.guest_name) {
      // Meeting-related transaction
      user = tx.guest_name
      action = isCredit ? 'paid for' : 'You paid for'
    } else {
      // Pure crypto transfer
      user = isCredit ? 'Wallet' : 'Wallet'
      action = isCredit ? 'received' : 'You sent'
    }

    const confirmedDate = new Date(tx.confirmed_at)
    const date = format(confirmedDate, 'd MMM')
    const time = format(confirmedDate, 'HH:mm z')

    // Map status
    let status: 'Successful' | 'Failed' | 'Pending' | 'Cancelled'
    switch (tx.status) {
      case 'completed':
        status = 'Successful'
        break
      case 'failed':
        status = 'Failed'
        break
      case 'pending':
        status = 'Pending'
        break
      case 'cancelled':
        status = 'Cancelled'
        break
      default:
        status = 'Failed'
    }

    return {
      id: tx.id,
      user,
      userImage: '/assets/wallet-add.png', // Default image
      action,
      amount: formattedAmount,
      status,
      date,
      time,
      fullName: tx.guest_name,
      email: tx.guest_email,
      plan: tx.plan_title,
      sessions: '1 session', // Default, could be enhanced
      price: formattedAmount,
      paymentMethod: 'Crypto Payment',
      sessionLocation: 'Virtual Meeting',
      transactionHash: tx.transaction_hash,
    }
  }

  const formattedTransactions =
    transactions && Array.isArray(transactions)
      ? transactions.map(formatTransaction)
      : []

  return {
    transactions: formattedTransactions,
    rawTransactions: transactions || [],
    isLoading,
    error: error instanceof Error ? error.message : null,
  }
}
