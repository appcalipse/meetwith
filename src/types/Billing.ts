import { Tables } from './Supabase'

// =====================================================
// Enums
// =====================================================

// Billing cycle for subscription plans
export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

// Subscription status for billing subscriptions
export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

// Payment provider for billing subscriptions
export enum PaymentProvider {
  STRIPE = 'stripe',
  CRYPTO = 'crypto',
}

// Subscription type for billing subscriptions
export enum SubscriptionType {
  INITIAL = 'initial',
  EXTENSION = 'extension',
}

// Billing page mode for navigation
export enum BillingMode {
  EXTEND = 'extend',
  SUBSCRIBE = 'subscribe',
}

// =====================================================
// Core Billing Types
// =====================================================

// Billing plan information
export interface BillingPlan {
  id: string
  name: string
  price: number
  billing_cycle: BillingCycle
  created_at: string
  updated_at: string | null
}

// Provider-specific mapping for billing plans
// Maps billing plans to provider-specific product IDs
export interface BillingPlanProvider {
  id: string
  provider: PaymentProvider
  billing_plan_id: string
  provider_product_id: string // Stripe product_id (not price_id)
  created_at: string
  updated_at: string | null
}

// Stripe subscription record
// Maps account to long-lived Stripe subscription object
export interface StripeSubscription {
  id: string
  account_address: string
  stripe_subscription_id: string
  stripe_customer_id: string
  billing_plan_id: string
  created_at: string
  updated_at: string | null
}

// Links transactions to Stripe subscriptions
// Provides traceability for all transactions belonging to a Stripe subscription
export interface StripeSubscriptionTransaction {
  id: string
  stripe_subscription_id: string
  transaction_id: string
  created_at: string
}

// Subscription period record
// One record per billing period (immutable model)
export interface SubscriptionPeriod {
  id: string
  owner_account: string
  plan_id: number | null // Legacy field for backward compatibility
  billing_plan_id: string | null // New billing plan reference
  chain: string | null // Legacy field
  domain: string | null // Legacy field
  config_ipfs_hash: string | null // Legacy field
  status: SubscriptionStatus
  expiry_time: string
  transaction_id: string | null
  registered_at: string
  updated_at: string | null
}

// Billing plan with provider information
// Used for displaying plans to users
export interface BillingPlanWithProvider extends BillingPlan {
  provider_product_id?: string // Stripe product ID if provider mapping exists
}

// =====================================================
// API Request/Response Types
// =====================================================

// Request to subscribe to a billing plan
export interface SubscribeRequest {
  billing_plan_id: BillingCycle // 'monthly' or 'yearly'
  payment_method?: 'stripe' | 'crypto' // Optional, defaults to 'stripe'
}

// Response after initiating subscription
export interface SubscribeResponse {
  success: boolean
  checkout_url?: string // Stripe Checkout URL (for Stripe subscriptions)
  subscription_id?: string // For tracking
  message?: string
}

// Request to subscribe to a billing plan via crypto
export interface SubscribeRequestCrypto {
  billing_plan_id: BillingCycle // 'monthly' or 'yearly'
  subscription_type?: SubscriptionType // Optional, defaults to 'initial'
  is_trial?: boolean // Optional flag to start a crypto trial
}

export interface TrialEligibilityResponse {
  eligible: boolean
}

// Response after initiating crypto subscription
// Returns payment configuration for Thirdweb payment widget
export interface SubscribeResponseCrypto {
  success: boolean
  amount: number
  currency: string
  billing_plan_id: string
  subscriptionData: {
    subscription_type: SubscriptionType
    billing_plan_id: string
    account_address: string
    subscription_channel: string
  }
}

// Request to cancel a subscription
export type CancelSubscriptionRequest = Record<string, never>

// Response after canceling subscription
export interface CancelSubscriptionResponse {
  success: boolean
  message: string
  cancellation_effective_date?: string // When subscription will actually end
}

// Response for getting current subscription
export interface GetSubscriptionResponse {
  subscription: SubscriptionPeriod | null
  billing_plan: BillingPlan | null
  stripe_subscription: StripeSubscription | null
  is_active: boolean
  expires_at: string | null
  payment_provider: PaymentProvider | null
}

// Response for getting available plans
export interface GetPlansResponse {
  plans: BillingPlanWithProvider[]
}

// Response for getting subscription history
export interface SubscriptionHistoryItem {
  plan: string
  date: string
  paymentMethod: string
  amount: string
}

export interface GetSubscriptionHistoryResponse {
  periods: SubscriptionPeriod[]
  total: number
  items: SubscriptionHistoryItem[]
  page: number
  totalPages: number
}

// =====================================================
// Helper Types
// =====================================================

// Combined subscription info (domain or billing)
// Used by subscription manager
export interface ActiveSubscription {
  type: 'domain' | 'billing'
  subscription: SubscriptionPeriod | Tables<'subscriptions'>
  billing_plan?: BillingPlan
  expires_at: Date | string
}

// Stripe webhook event data for subscription events
export interface StripeSubscriptionWebhookData {
  id: string
  customer: string
  status: string
  current_period_start: number
  current_period_end: number
  cancel_at_period_end: boolean
  metadata?: {
    account_address?: string
    billing_plan_id?: string
  }
}

// Stripe invoice webhook event data
export interface StripeInvoiceWebhookData {
  id: string
  subscription: string
  customer: string
  amount_paid: number
  currency: string
  status: string
  paid: boolean
  period_start: number
  period_end: number
}

// =====================================================
// Email Helper Types
// =====================================================

// Account info for billing emails
export interface BillingEmailAccountInfo {
  email: string
  displayName: string
}

// Period info for billing emails
export interface BillingEmailPeriod {
  registered_at: string | Date
  expiry_time: string | Date
}

// Plan info for billing emails
export interface BillingEmailPlan {
  id: string
  name: string
  price: number
  billing_cycle?: string | null
}
