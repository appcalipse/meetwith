import {
  PaymentDirection,
  PaymentStatus,
  PaymentType,
} from '@/utils/constants/meeting-types'
export type Address = `0x${string}`
export interface BaseTransaction {
  method: PaymentType
  transaction_hash?: Address
  provider_reference_id?: string // from onramp or payment provider
  direction: PaymentDirection
  amount: number
  initiator_address?: string
  meeting_type_id: string // [ref: > meeting_type.id, null] //  ensures persistence even if meeting type is only soft deleted
  status?: PaymentStatus
  metadata?: Record<string, string> // e.g., { "iconUri": "...", "sender": "...", ... }
  token_address?: string
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
}

export interface BaseMeetingSession {
  transaction_id: string
  meeting_type_id: string
  owner_address: string
  guest_email?: string
  guest_address?: string
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
