import { Tables } from './Supabase'

export enum PaymentProvider {
  STRIPE = 'stripe',
}

export enum PaymentAccountStatus {
  PENDING = 'pending',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  FAILED = 'failed',
}

export interface ActivePaymentAccount extends Tables<'payment_accounts'> {
  username?: string
}
