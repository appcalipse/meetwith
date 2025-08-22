import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

import { Transaction } from '@/types/Transactions'
import { getWalletTransactions } from '@/utils/api_helper'
import {
  COMMON_CURRENCIES,
  getCurrencyDisplayName,
  isSupportedCurrency,
} from '@/utils/constants'
import { formatCurrency } from '@/utils/generic_utils'
import { CurrencyService } from '@/utils/services/currency.service'

import useAccountContext from './useAccountContext'

interface WalletTransactionsResponse {
  transactions: Transaction[]
  totalCount: number
}

export const useWalletTransactions = (
  tokenAddress?: string,
  chainId?: number,
  limit = 5,
  offset = 0,
  selectedCurrency = 'USD'
) => {
  const currentAccount = useAccountContext()

  const { data: exchangeRates } = useQuery({
    queryKey: ['exchangeRates', selectedCurrency],
    queryFn: async () => {
      if (selectedCurrency === 'USD') return { USD: 1 }

      const rates: Record<string, number> = { USD: 1 }

      rates[selectedCurrency] = await CurrencyService.getExchangeRate(
        selectedCurrency
      )

      for (const currency of COMMON_CURRENCIES) {
        if (currency !== selectedCurrency) {
          try {
            rates[currency] = await CurrencyService.getExchangeRate(currency)
          } catch (error) {
            console.warn(`Failed to fetch ${currency} exchange rate:`, error)
          }
        }
      }

      return rates
    },
    enabled: selectedCurrency !== 'USD',
    staleTime: 1000 * 60 * 60,
    cacheTime: 1000 * 60 * 60 * 24,
  })

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
      selectedCurrency,
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

    let displayAmount = amount
    let displayCurrency = tx.currency

    if (
      selectedCurrency !== 'USD' &&
      exchangeRates &&
      tx.currency !== selectedCurrency
    ) {
      if (tx.currency === 'USD') {
        displayAmount = amount * exchangeRates[selectedCurrency]
        displayCurrency = selectedCurrency
      } else if (tx.currency && exchangeRates[tx.currency]) {
        const sourceToUsd = 1 / exchangeRates[tx.currency]
        const usdToTarget = exchangeRates[selectedCurrency]
        displayAmount = amount * sourceToUsd * usdToTarget
        displayCurrency = selectedCurrency
      } else if (tx.currency && !exchangeRates[tx.currency]) {
        if (isSupportedCurrency(tx.currency)) {
          console.warn(
            `Exchange rate for ${getCurrencyDisplayName(tx.currency)} (${
              tx.currency
            }) temporarily unavailable. ` + `Displaying in original currency.`
          )
        } else {
          console.warn(
            `Currency ${tx.currency} is not supported for conversion. ` +
              `Displaying in original currency. Consider adding ${tx.currency} to COMMON_CURRENCIES.`
          )
        }
        displayAmount = amount
        displayCurrency = tx.currency
      }
    }

    const formattedAmount = formatCurrency(displayAmount, displayCurrency)

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
