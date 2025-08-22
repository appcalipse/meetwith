import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

import { Transaction } from '@/types/Transactions'
import { getWalletTransactions } from '@/utils/api_helper'
import { formatCurrency } from '@/utils/generic_utils'

import useAccountContext from './useAccountContext'

interface WalletTransactionsResponse {
  transactions: Transaction[]
  totalCount: number
}

export const useWalletTransactions = (
  tokenAddress?: string,
  chainId?: number,
  limit = 5,
  offset = 0
) => {
  const currentAccount = useAccountContext()

  const {
    data: response,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      'wallet-transactions',
      currentAccount?.address,
      tokenAddress,
      chainId,
      limit,
      offset,
    ],
    queryFn: async (): Promise<WalletTransactionsResponse> => {
      if (!currentAccount?.address) return { transactions: [], totalCount: 0 }

      return getWalletTransactions(
        currentAccount.address,
        tokenAddress,
        chainId,
        limit,
        offset
      ) as Promise<WalletTransactionsResponse>
    },
    enabled: !!currentAccount?.address,
    staleTime: 30000,
    cacheTime: 60000,
    refetchInterval: 10000,
  })

  const transactions = response?.transactions || []
  const totalCount = response?.totalCount || 0

  // Convert Transaction to display format
  const formatTransactionForDisplay = (tx: Transaction) => {
    const isCredit = tx.direction === 'credit'
    const amount = tx.fiat_equivalent || tx.amount
    const formattedAmount = formatCurrency(amount, tx.currency)

    const meetingSession = tx?.meeting_sessions
    const counterpartyName = tx?.counterparty_name as string | undefined
    const counterpartyAddress = tx?.counterparty_address as string | undefined
    const maskAddress = (addr?: string) =>
      addr && addr.length > 6
        ? `${addr.slice(0, 3)}***${addr.slice(-2)}`
        : addr || ''

    // Determine user and action based on transaction type
    let user = ''
    let action = ''

    if (isCredit) {
      user = 'You'
      if (tx.meeting_type_id) {
        const name = counterpartyName || 'Guest'
        action = `received ${formattedAmount} from ${name}`
      } else {
        const from = maskAddress(counterpartyAddress)
        action = `received ${formattedAmount}${from ? ` from ${from}` : ''}`
      }
    } else {
      user = 'You'
      if (tx.meeting_type_id) {
        const name = counterpartyName || 'Recipient'
        action = `sent ${formattedAmount} to ${name}`
      } else {
        const to = maskAddress(counterpartyAddress)
        action = `sent ${formattedAmount}${to ? ` to ${to}` : ''}`
      }
    }

    const confirmedDate = new Date(tx.confirmed_at || new Date())
    const date = format(confirmedDate, 'd MMM')
    const time = format(confirmedDate, 'HH:mm z')

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
      userImage: '/assets/wallet-add.png',
      action,
      amount: formattedAmount,
      status,
      date,
      time,
      originalTransaction: tx,
    }
  }

  const formattedTransactions =
    transactions && Array.isArray(transactions)
      ? transactions.map(formatTransactionForDisplay)
      : []

  return {
    transactions: formattedTransactions,
    rawTransactions: transactions,
    isLoading,
    error: error instanceof Error ? error.message : null,
    totalCount,
  }
}
