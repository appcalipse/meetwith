import {
  PaymentDirection,
  PaymentStatus,
  PaymentType,
} from '@/utils/constants/meeting-types'

import { SubscriptionType } from './Billing'
export type Address = `0x${string}`
export interface BaseTransaction {
  method: PaymentType
  transaction_hash?: Address
  provider_reference_id?: string // from onramp or payment provider
  direction: PaymentDirection
  amount: number
  initiator_address?: string
  meeting_type_id?: string | null // [ref: > meeting_type.id, null] //  ensures persistence even if meeting type is only soft deleted
  status?: PaymentStatus
  metadata?: Record<string, string | number> // e.g., { "iconUri": "...", "sender": "...", ... }
  token_address?: string | null
  token_type?: string // fiat resolves to crypto so safe to have
  chain_id?: number
  currency?: string // e.g "USD", "EUR"
  fiat_equivalent?: number
  fee_breakdown?: Record<string, number | string> // e.g., { "network": 0.5, "platform": 1.0 }
  total_fee?: number // for fee analytics
  confirmed_at?: Date | string
  updated_at?: Date
}

export interface Transaction extends BaseTransaction {
  id: string
  created_at?: Date
  meeting_sessions?: MeetingSession[]
  meeting_types?: { title: string }[]
  counterparty_name?: string
  counterparty_address?: string
}

export interface BaseMeetingSession {
  transaction_id: string
  meeting_type_id: string | null
  owner_address: string | undefined
  guest_email?: string
  guest_address?: string
  guest_name?: string
  session_number: number
}

export interface MeetingSession extends BaseMeetingSession {
  id: string
  used_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface InvoiceMetadata {
  full_name: string
  email_address: string
  plan: string
  number_of_sessions: string
  price: string
  payment_method: string
  url?: string
}

export interface ReceiptMetadata extends InvoiceMetadata {
  transaction_fee: string
  transaction_status: string
  transaction_hash: string
}

// Wallet-specific transaction types
export interface WalletTransaction {
  id: string
  transaction_hash: string
  amount: number
  direction: 'credit' | 'debit'
  chain_id: number
  token_address: string
  fiat_equivalent: number
  status: string
  confirmed_at: string
  currency: string
  total_fee: number
  fee_breakdown: {
    gas_used: string
    fee_in_usd: number
  }
  guest_name?: string
  guest_email?: string
  plan_title?: string
  sender_address?: string
  recipient_address?: string
}

export interface FormattedTransaction {
  id: string
  user: string
  userImage?: string
  action: string
  amount: string
  status: 'Successful' | 'Failed' | 'Pending' | 'Cancelled'
  date: string
  time: string
  fullName?: string
  email?: string
  plan?: string
  sessions?: string
  price?: string
  paymentMethod?: string
  sessionLocation?: string
  transactionHash?: string
}

export interface OnrampMoneyWebhook {
  orderId: number
  eventType: string
  walletAddress: string
  coinId: number
  fiatType: number
  factor: number
  expectedPrice: number
  actualFiatAmount: number
  paymentType: number | string
  actualPrice: number
  actualQuantity: number
  kycNeeded: number
  createdAt: Date | string
  updatedAt: Date | string
  status: number
  statusDescription: string
  referenceId: string
  chainId: number
  onRampFee: number
  clientFee: number
  gatewayFee: number
  transactionHash: string
  merchantRecognitionId: string
  coinCode: string
  network: string
}

export interface IPurchaseData {
  message_channel: string
  meeting_type_id: string
  guest_email?: string
  guest_name?: string
  guest_address?: string
  environment?: string
  [key: string]: unknown
}

export interface ISubscriptionData {
  subscription_channel: string
  subscription_type: SubscriptionType
  billing_plan_id: string
  account_address: string
  [key: string]: unknown
}
export interface ICheckoutMetadata {
  [key: string]: unknown
  meeting_type_id: string
  guest_email?: string
  guest_name: string
  guest_address?: string
  transaction_id: string
}
export interface ICoinConfig {
  allCoinConfig: {
    [x: string]: {
      coinId: number
      networks: number[]
      coinName: string
      coinIcon: string
      balanceFloatPlaces: number
      tradeFloatPlaces: number
    }
  }
  networkConfig: {
    [x: number]: {
      addressRegex: string
      chainName: string
      chainSymbol: string
      hashLink: string
      memoRegex: string
      nativeToken: number
      networkId: number
      node: number
      startingWith: string[]
    }
  }
}
