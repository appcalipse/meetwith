/**
 * Type definitions for Thirdweb webhook payloads
 * Used for processing crypto subscription payments
 */

/**
 * Transaction data extracted from Thirdweb webhook payload
 */
export interface TransactionData {
  chainId: number
  transactionHash: string
  amount: bigint
  decimals: number
  tokenAddress: string
  fiatEquivalent: number
  providerReferenceId: string | undefined
}

/**
 * Onramp transaction payload data structure
 */
export interface OnrampTransactionData {
  token: {
    chainId: number
    decimals: number
    address: string
  }
  transactionHash: string
  amount: bigint
  currencyAmount: number
  id: string
}

/**
 * Onchain transaction payload data structure
 */
export interface OnchainTransactionData {
  destinationToken: {
    chainId: number
    decimals: number
    address: string
    priceUsd: number
  }
  destinationAmount: bigint
  transactions?: Array<{
    chainId: number
    transactionHash: string
  }>
  transactionId?: string
  paymentId?: string
  originToken?: {
    decimals: number
    priceUsd: number
  }
  originAmount?: bigint
  developerFeeBps?: number
}

/**
 * Onchain transaction fee calculation data
 */
export interface OnchainFeeData {
  originToken?: {
    decimals: number
    priceUsd: number
  }
  originAmount?: bigint
  developerFeeBps?: number
}
