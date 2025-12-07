# Billing Feature Implementation - Sequential Task List

## ✅ Completed Setup

- [x] Database tables created (billing_plans, billing_plan_providers, stripe_subscriptions, stripe_subscription_transactions)
- [x] Subscriptions and transactions tables updated
- [x] Stripe products and prices created in Stripe Dashboard
- [x] Product IDs added to billing_plan_providers table

---

## Phase 1: Foundation - Types & Enums (Start Here)

### Task 1.1: Create Billing Types File

**File**: `src/types/Billing.ts`

- [ ] Create `BillingCycle` enum: `'monthly' | 'yearly'`
- [ ] Create `SubscriptionStatus` enum: `'active' | 'cancelled' | 'expired'`
- [ ] Create `PaymentProvider` enum: `'stripe'` (for now)
- [ ] Create `BillingPlan` interface:
  ```typescript
  {
    id: string
    name: string
    price: number
    billing_cycle: BillingCycle
    created_at: string
    updated_at: string | null
  }
  ```
- [ ] Create `BillingPlanProvider` interface:
  ```typescript
  {
    id: string
    provider: PaymentProvider
    billing_plan_id: string
    provider_product_id: string
    created_at: string
    updated_at: string | null
  }
  ```
- [ ] Create `StripeSubscription` interface:
  ```typescript
  {
    id: string
    account_address: string
    stripe_subscription_id: string
    stripe_customer_id: string
    billing_plan_id: string
    created_at: string
    updated_at: string | null
  }
  ```
- [ ] Create `StripeSubscriptionTransaction` interface
- [ ] Create `SubscriptionPeriod` interface (for subscription periods)
- [ ] Create API request/response types:
  - `SubscribeRequest`, `SubscribeResponse`
  - `CancelSubscriptionRequest`, `CancelSubscriptionResponse`
  - `GetSubscriptionResponse`, `GetPlansResponse`

**Estimated Time**: 30-45 minutes

---

### Task 1.2: Update Supabase Types

**File**: `src/types/Supabase.ts`

- [ ] Regenerate Supabase types OR manually add new table types:
  - `billing_plans` table type
  - `billing_plan_providers` table type
  - `stripe_subscriptions` table type
  - `stripe_subscription_transactions` table type
- [ ] Update `subscriptions` table type to include:
  - `billing_plan_id: string | null`
  - `status: SubscriptionStatus`
  - `transaction_id: string | null`
  - `updated_at: string | null`
- [ ] Update `transactions` table type to include:
  - `provider: PaymentProvider | null`

**Note**: If using Supabase CLI, run `supabase gen types typescript --project-id <your-project-id> > src/types/Supabase.ts`

**Estimated Time**: 15-20 minutes

---

## Phase 2: Database Layer - Helper Functions

### Task 2.1: Billing Plans Helpers

**File**: `src/utils/database.ts`

- [ ] Create `getBillingPlans()` function:

  - Query `billing_plans` table
  - Return all plans
  - Handle errors

- [ ] Create `getBillingPlanById(planId: string)` function:

  - Query single plan by ID
  - Return plan or null

- [ ] Create `getBillingPlanProviders()` function:

  - Query `billing_plan_providers` table
  - Optionally filter by provider
  - Return providers with plan details (join with billing_plans)

- [ ] Create `getBillingPlanProvider(planId: string, provider: PaymentProvider)` function:
  - Get provider mapping for a specific plan
  - Return provider_product_id

**Estimated Time**: 45-60 minutes

---

### Task 2.2: Stripe Subscription Helpers

**File**: `src/utils/database.ts`

- [ ] Create `createStripeSubscription()` function:

  - Insert into `stripe_subscriptions` table
  - Parameters: account_address, stripe_subscription_id, stripe_customer_id, billing_plan_id
  - Return created record

- [ ] Create `getStripeSubscriptionByAccount(accountAddress: string)` function:

  - Query by account_address
  - Return active Stripe subscription or null

- [ ] Create `getStripeSubscriptionById(stripeSubscriptionId: string)` function:

  - Query by stripe_subscription_id
  - Return subscription or null

- [ ] Create `updateStripeSubscription()` function:

  - Update stripe_subscriptions record
  - Handle status updates

- [ ] Create `linkTransactionToStripeSubscription()` function:
  - Insert into `stripe_subscription_transactions` table
  - Link transaction_id to stripe_subscription_id

**Estimated Time**: 45-60 minutes

---

### Task 2.3: Subscription Period Helpers

**File**: `src/utils/database.ts`

- [ ] Create `createSubscriptionPeriod()` function:

  - Insert into `subscriptions` table
  - Parameters: owner_account, billing_plan_id, status, expiry_time, transaction_id
  - Set registered_at = NOW()
  - Return created subscription period

- [ ] Create `getActiveSubscriptionPeriod(accountAddress: string)` function:

  - Query subscriptions where:
    - owner_account = accountAddress
    - status = 'active'
    - expiry_time > NOW()
  - Return most recent active subscription or null

- [ ] Create `getSubscriptionPeriodsByAccount(accountAddress: string)` function:

  - Get all subscription periods for account (history)
  - Order by registered_at DESC
  - Return array of subscription periods

- [ ] Create `updateSubscriptionPeriodStatus()` function:
  - Update subscription status (active → expired, active → cancelled, etc.)
  - Update updated_at timestamp

**Estimated Time**: 60-75 minutes

---

### Task 2.4: Update Subscription Manager

**File**: `src/utils/subscription_manager.ts`

- [ ] Update `isProAccount(accountAddress: string)` function:

  - Check for active domain subscriptions (existing logic)
  - Check for active billing subscription periods (new logic)
  - Return true if either exists

- [ ] Update `getActiveProSubscription(accountAddress: string)` function:

  - Check domain subscriptions (existing logic)
  - Check billing subscription periods (new logic)
  - Return subscription info (domain or billing)

- [ ] Create `hasActiveBillingSubscription(accountAddress: string)` helper:
  - Check if account has active billing subscription period
  - Return boolean

**Estimated Time**: 45-60 minutes

---

## Phase 3: Stripe Integration - API Endpoints

### Task 3.1: Get Plans Endpoint

**File**: `src/pages/api/secure/billing/plans.ts`

- [ ] Create GET endpoint
- [ ] Fetch billing plans from database
- [ ] Fetch provider mappings (Stripe product IDs)
- [ ] Return plans with provider info
- [ ] Add authentication/authorization
- [ ] Handle errors

**Estimated Time**: 30-45 minutes

---

### Task 3.2: Get Subscription Endpoint

**File**: `src/pages/api/secure/billing/subscription.ts`

- [ ] Create GET endpoint
- [ ] Get active subscription period for account
- [ ] Get Stripe subscription details if applicable
- [ ] Return subscription info with plan details
- [ ] Handle no subscription case
- [ ] Add authentication/authorization

**Estimated Time**: 30-45 minutes

---

### Task 3.3: Subscribe Endpoint (Stripe)

**File**: `src/pages/api/secure/billing/subscribe.ts`

- [ ] Create POST endpoint
- [ ] Validate request body (billing_plan_id)
- [ ] Get billing plan from database
- [ ] Get Stripe product ID from billing_plan_providers
- [ ] Query Stripe API for price ID: `stripe.prices.list({ product: productId, active: true })`
- [ ] Get or create Stripe customer:
  - Check if customer exists for account
  - Create customer if doesn't exist
- [ ] Create Stripe Checkout Session:
  - `mode: 'subscription'`
  - `line_items` with price_id
  - `customer` ID
  - `success_url` and `cancel_url`
  - `metadata` with account_address and billing_plan_id
- [ ] Return Checkout session URL
- [ ] Handle errors (Stripe errors, database errors)

**Estimated Time**: 90-120 minutes

---

### Task 3.4: Cancel Subscription Endpoint

**File**: `src/pages/api/secure/billing/cancel.ts`

- [ ] Create PATCH endpoint
- [ ] Get active Stripe subscription for account
- [ ] Cancel subscription via Stripe API: `stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true })`
- [ ] Update stripe_subscriptions record
- [ ] Update current subscription period status to 'cancelled'
- [ ] Return success response
- [ ] Handle errors (no subscription, already cancelled, etc.)

**Estimated Time**: 45-60 minutes

---

## Phase 4: Stripe Webhooks

### Task 4.1: Update Stripe Webhook Handler

**File**: `src/pages/api/integrations/stripe/webhook.ts`

- [ ] Review existing webhook structure
- [ ] Add subscription event handlers:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `customer.subscription.trial_will_end` (optional)

**Estimated Time**: 30 minutes (setup)

---

### Task 4.2: Implement Subscription Created Handler

**File**: `src/pages/api/integrations/stripe/webhook.ts` or `src/utils/services/stripe.helper.ts`

- [ ] Create `handleSubscriptionCreated()` function:
  - Extract account_address from metadata
  - Extract billing_plan_id from metadata
  - Create stripe_subscriptions record
  - Create transaction record (meeting_type_id = NULL, provider = 'stripe')
  - Link transaction to Stripe subscription
  - Create first subscription period:
    - Calculate expiry_time (1 month or 1 year from now)
    - Set status = 'active'
    - Link transaction_id
  - Handle errors

**Estimated Time**: 60-75 minutes

---

### Task 4.3: Implement Invoice Payment Succeeded Handler

**File**: `src/utils/services/stripe.helper.ts`

- [ ] Create `handleInvoicePaymentSucceeded()` function:
  - Get Stripe subscription from invoice
  - Find stripe_subscriptions record by stripe_subscription_id
  - Create transaction record:
    - amount from invoice
    - status = 'confirmed'
    - provider = 'stripe'
    - meeting_type_id = NULL
    - provider_reference_id = invoice.id
  - Link transaction to Stripe subscription
  - Mark previous subscription period as 'expired' (if exists)
  - Create new subscription period:
    - Calculate expiry_time based on billing cycle
    - Set status = 'active'
    - Link transaction_id
  - Handle errors

**Estimated Time**: 75-90 minutes

---

### Task 4.4: Implement Other Webhook Handlers

**File**: `src/utils/services/stripe.helper.ts`

- [ ] Create `handleSubscriptionUpdated()` function:

  - Update stripe_subscriptions record if needed
  - Handle status changes (cancelled, etc.)

- [ ] Create `handleSubscriptionDeleted()` function:

  - Mark stripe_subscriptions as cancelled/expired
  - Update current subscription period status to 'expired'

- [ ] Create `handleInvoicePaymentFailed()` function:
  - Update subscription status
  - Send notification (optional)

**Estimated Time**: 45-60 minutes

---

## Phase 5: Feature Access Control

### Task 5.1: Meeting Type Limits

**Files**: Meeting type creation API files

- [ ] Find meeting type creation endpoint
- [ ] Add subscription check before creation:
  - If not pro: check current meeting type count
  - If count >= 1: return error "Free tier allows only 1 meeting type"
  - If pro: allow unlimited
- [ ] Update error messages to include upgrade prompt

**Estimated Time**: 30-45 minutes

---

### Task 5.2: Scheduling Groups Limits

**Files**: Group creation API files

- [ ] Find group creation endpoint
- [ ] Add subscription check:
  - If not pro: check current group count
  - If count >= 5: return error "Free tier allows only 5 scheduling groups"
  - If pro: allow unlimited

**Estimated Time**: 30-45 minutes

---

### Task 5.3: Calendar Integration Limits

**Files**: Calendar integration API files

- [ ] Find calendar integration creation endpoint
- [ ] Add subscription check:
  - If not pro: check current integration count
  - If count >= 1: return error "Free tier allows only 1 calendar integration"
  - If pro: allow unlimited

**Estimated Time**: 30-45 minutes

---

### Task 5.4: QuickPoll Limits

**Files**: QuickPoll creation API files

- [ ] Find QuickPoll creation endpoint
- [ ] Add subscription check:
  - If not pro: check active poll count
  - If count >= 2: return error "Free tier allows only 2 active polls"
  - If pro: allow unlimited

**Estimated Time**: 30-45 minutes

---

### Task 5.5: Calendar Sync Limits

**Files**: Calendar sync API files

- [ ] Find calendar sync creation endpoint
- [ ] Add subscription check:
  - If not pro: check current sync count
  - If count >= 1: return error "Free tier allows only 1 calendar sync"
  - If pro: allow unlimited

**Estimated Time**: 30-45 minutes

---

## Phase 6: User Interface

### Task 6.1: Billing Page Component

**File**: `src/pages/dashboard/billing.tsx` or similar

- [ ] Create billing page component
- [ ] Fetch current subscription (use `/api/secure/billing/subscription`)
- [ ] Display subscription status
- [ ] Display plan details (monthly/yearly)
- [ ] Display expiry date
- [ ] Display payment method
- [ ] Add "Cancel Subscription" button (if active Stripe subscription)
- [ ] Add "Upgrade" or "Change Plan" buttons
- [ ] Handle loading and error states

**Estimated Time**: 90-120 minutes

---

### Task 6.2: Subscription Selection Component

**File**: `src/components/billing/SubscriptionSelection.tsx` or similar

- [ ] Create subscription selection component
- [ ] Fetch available plans (use `/api/secure/billing/plans`)
- [ ] Display monthly ($8/month) and yearly ($80/year) options
- [ ] Add plan toggle/selection
- [ ] Add payment method selection (Stripe Card / Crypto)
- [ ] Show payment summary
- [ ] Handle plan selection
- [ ] Redirect to Stripe Checkout on "Subscribe" click

**Estimated Time**: 90-120 minutes

---

### Task 6.3: Payment Success/Cancel Pages

**Files**: `src/pages/billing/success.tsx`, `src/pages/billing/cancel.tsx`

- [ ] Create success page:
  - Show confirmation message
  - Display subscription details
  - Link to billing page
- [ ] Create cancel page:
  - Show cancellation message
  - Link back to billing page

**Estimated Time**: 30-45 minutes

---

### Task 6.4: Navigation Updates

**Files**: Navigation components

- [ ] Add "Billing" link to dashboard navigation
- [ ] Update "Account Plans & Billing" section to show billing subscriptions
- [ ] Update "Go Pro" button to link to billing page

**Estimated Time**: 30-45 minutes

---

## Phase 7: Testing & Verification

### Task 7.1: Test Stripe Subscription Flow

- [ ] Test subscription creation (monthly plan)
- [ ] Test subscription creation (yearly plan)
- [ ] Verify Stripe Checkout redirects correctly
- [ ] Test webhook events (use Stripe CLI or test mode)
- [ ] Verify database records are created correctly
- [ ] Test subscription cancellation
- [ ] Verify subscription status updates

**Estimated Time**: 60-90 minutes

---

### Task 7.2: Test Feature Limits

- [ ] Test meeting type limit (free tier)
- [ ] Test scheduling groups limit (free tier)
- [ ] Test calendar integration limit (free tier)
- [ ] Test QuickPoll limit (free tier)
- [ ] Test calendar sync limit (free tier)
- [ ] Verify pro users have unlimited access

**Estimated Time**: 45-60 minutes

---

### Task 7.3: Test Edge Cases

- [ ] Test expired subscription handling
- [ ] Test cancelled subscription handling
- [ ] Test webhook retries
- [ ] Test error handling (Stripe API errors, database errors)
- [ ] Test with existing domain subscriptions (backward compatibility)

**Estimated Time**: 60-90 minutes

---

## Phase 8: Documentation & Cleanup

### Task 8.1: Code Documentation

- [ ] Add JSDoc comments to all new functions
- [ ] Document API endpoints
- [ ] Document webhook events
- [ ] Update README if needed

**Estimated Time**: 30-45 minutes

---

### Task 8.2: Environment Variables

- [ ] Document required Stripe environment variables
- [ ] Document Stripe webhook secret
- [ ] Update `.env.example` if needed

**Estimated Time**: 15-20 minutes

---

## Total Estimated Time: ~25-30 hours

## Priority Order:

1. **Phase 1** (Types) - Foundation, must be done first
2. **Phase 2** (Database) - Core data layer, needed for everything else
3. **Phase 3** (API Endpoints) - Backend functionality
4. **Phase 4** (Webhooks) - Critical for subscription renewals
5. **Phase 5** (Feature Limits) - Business logic enforcement
6. **Phase 6** (UI) - User-facing features
7. **Phase 7** (Testing) - Quality assurance
8. **Phase 8** (Documentation) - Maintenance

## Notes:

- Work sequentially through phases
- Test each phase before moving to the next
- Use Stripe test mode for all development
- Keep Stripe webhook secret in environment variables
- Test webhooks using Stripe CLI: `stripe listen --forward-to localhost:3000/api/integrations/stripe/webhook`
