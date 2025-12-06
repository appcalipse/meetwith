# Billing Experience Implementation Plan

## Overview

This document outlines the comprehensive implementation plan for building a new billing/subscription system for Meetwith. The system will support both monthly ($8/month) and yearly ($80/year) subscription plans, with payment processing via Stripe (fiat) and Thirdweb (crypto).

## Key Requirements

### Subscription Plans

- **Monthly Plan**: $8/month
- **Yearly Plan**: $80/year

### Payment Methods

- **Stripe**: Fiat payments with automatic recurring billing
- **Thirdweb**: Crypto payments (note: Thirdweb does not natively support recurring payments - manual renewal required)

### Free Tier Limitations

Users without active subscriptions should have:

- 1 Meeting type (FREE meetings only)
- 5 scheduling groups maximum
- Single integration with Google Calendar, iCloud, Office 365, or WebDAV
- Limited QuickPolls (max. 2 active polls at a time)
- Basic calendar sync (1 calendar sync only)

### Pro Tier Benefits

Users with active subscriptions get:

- Unlimited meeting types (Free & Paid)
- Unlimited scheduling groups
- Unlimited calendar integrations
- Unlimited QuickPolls
- Advanced calendar sync capabilities

## Database Schema

### Enums

```sql
CREATE TYPE billing_cycle AS ENUM ('monthly', 'yearly');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired');
CREATE TYPE payment_provider AS ENUM ('stripe');
```

### New Table: `billing_plans`

```sql
CREATE TABLE billing_plans (
  id VARCHAR PRIMARY KEY, -- 'monthly' or 'yearly'
  name VARCHAR NOT NULL, -- 'Monthly' or 'Yearly'
  price DECIMAL(10, 2) NOT NULL, -- Price in USD
  billing_cycle billing_cycle NOT NULL DEFAULT 'monthly',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- Insert default plans
INSERT INTO billing_plans (id, name, price, billing_cycle) VALUES
  ('monthly', 'Monthly', 8.00, 'monthly'),
  ('yearly', 'Yearly', 80.00, 'yearly');
```

### New Table: `billing_plan_providers`

```sql
CREATE TABLE billing_plan_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider payment_provider NOT NULL,
  billing_plan_id VARCHAR NOT NULL REFERENCES billing_plans(id),
  provider_product_id VARCHAR NOT NULL, -- Stripe product_id (not price_id)
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP,
  UNIQUE(provider, billing_plan_id)
);

CREATE INDEX idx_billing_plan_providers_provider ON billing_plan_providers(provider);
CREATE INDEX idx_billing_plan_providers_plan ON billing_plan_providers(billing_plan_id);
```

**Note:** This table maps billing plans to provider-specific product IDs. For Stripe, we store the `product_id` and query prices via API when needed. This design is provider-agnostic and allows for future payment providers.

### New Table: `stripe_subscriptions`

```sql
CREATE TABLE stripe_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_address VARCHAR NOT NULL REFERENCES accounts(address),
  stripe_subscription_id VARCHAR NOT NULL UNIQUE, -- Long-lived Stripe subscription ID (sub_xxx)
  stripe_customer_id VARCHAR NOT NULL,
  billing_plan_id VARCHAR NOT NULL REFERENCES billing_plans(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE INDEX idx_stripe_subscriptions_account ON stripe_subscriptions(account_address);
CREATE INDEX idx_stripe_subscriptions_stripe_id ON stripe_subscriptions(stripe_subscription_id);
```

**Note:** This table maps the account to the long-lived Stripe subscription object. One record per active Stripe subscription. Emphasis on account, not subscription period.

### New Table: `stripe_subscription_transactions`

```sql
CREATE TABLE stripe_subscription_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_subscription_id VARCHAR NOT NULL REFERENCES stripe_subscriptions(stripe_subscription_id),
  transaction_id UUID NOT NULL REFERENCES transactions(id) UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stripe_sub_trans_stripe_sub ON stripe_subscription_transactions(stripe_subscription_id);
CREATE INDEX idx_stripe_sub_trans_transaction ON stripe_subscription_transactions(transaction_id);
```

**Note:** This table maps each transaction to the Stripe subscription it belongs to. Provides traceability: all transactions for a Stripe subscription can be queried. One transaction belongs to one Stripe subscription.

### Modified Table: `subscriptions`

```sql
-- Add new columns to existing subscriptions table (all nullable for backward compatibility)
ALTER TABLE subscriptions ADD COLUMN billing_plan_id VARCHAR REFERENCES billing_plans(id);
ALTER TABLE subscriptions ADD COLUMN status subscription_status NOT NULL DEFAULT 'active';
ALTER TABLE subscriptions ADD COLUMN transaction_id UUID NOT NULL REFERENCES transactions(id);
ALTER TABLE subscriptions ADD COLUMN updated_at TIMESTAMP;

-- Make legacy fields nullable for new billing subscriptions
ALTER TABLE subscriptions ALTER COLUMN plan_id DROP NOT NULL;
ALTER TABLE subscriptions ALTER COLUMN chain DROP NOT NULL;
ALTER TABLE subscriptions ALTER COLUMN domain DROP NOT NULL;

-- Add indexes
CREATE INDEX idx_subscriptions_owner_account ON subscriptions(owner_account);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_expiry_time ON subscriptions(expiry_time);
CREATE INDEX idx_subscriptions_transaction ON subscriptions(transaction_id);
CREATE INDEX idx_subscriptions_owner_status ON subscriptions(owner_account, status);
```

**Note:**

- One subscription record per billing period (immutable model)
- Each billing period creates a new subscription record paired with its own transaction
- When the previous subscription expires, the newly created one becomes active
- This gives us clean subscription history and audit trail
- Legacy fields (`plan_id`, `chain`, `domain`, `config_ipfs_hash`) remain for backward compatibility with existing blockchain-based subscriptions

### Modified Table: `transactions`

```sql
-- Add provider column to existing transactions table
ALTER TABLE transactions ADD COLUMN provider payment_provider;

-- Note: meeting_type_id is already nullable and will be NULL for subscription payments
```

**Note:**

- The `transactions` table already supports `meeting_type_id` as NULL for subscription payments
- The `provider` field indicates the payment provider (Stripe, etc.)
- Payment method and provider-specific metadata are stored in the `transactions` table
- `provider_reference_id` stores Payment Intent IDs (`pi_xxx`) or Invoice IDs for Stripe, transaction hash for crypto

### Key Design Decisions

1. **One Subscription Record Per Billing Period (Immutable Model)**

   - Each billing period creates a new subscription record paired with its own transaction
   - When the previous subscription expires, the newly created one becomes active
   - This provides clean subscription history and audit trail
   - No updates to existing subscription records - only new records are created

2. **Provider-Agnostic Billing Plans**

   - `billing_plans` table stores plan information (price, cycle) without provider-specific details
   - `billing_plan_providers` table maps plans to provider-specific product IDs
   - For Stripe, we store `product_id` and query prices via API when needed
   - This design allows for future payment providers without schema changes

3. **Stripe Subscription Tracking**

   - `stripe_subscriptions`: Maps account to long-lived Stripe subscription object (account-level)
   - `stripe_subscription_transactions`: Links each transaction to its Stripe subscription
   - Provides traceability: all transactions for a Stripe subscription can be queried
   - Stripe subscription ID (`sub_xxx`) stays the same across billing periods

4. **Simplified Status Model**

   - Only three statuses: `active`, `cancelled`, `expired`
   - Stripe statuses map to our simplified model: trialing→active, past_due→expired, unpaid→expired
   - Stripe-specific statuses are only useful for notifications/grace periods, not for DB storage

5. **Backward Compatibility**

   - Existing `subscriptions` table is modified, not replaced
   - Legacy fields (`plan_id`, `chain`, `domain`, `config_ipfs_hash`) remain nullable
   - Existing blockchain-based domain subscriptions continue to work
   - New billing subscriptions use `billing_plan_id` and `transaction_id` fields

6. **Transaction-Centric Design**
   - Payment method, provider, and metadata are stored in `transactions` table
   - Each subscription period is linked to exactly one transaction
   - Provider-specific details (like Stripe customer ID) are in provider-specific tables

## Implementation Stages

### Stage 1: Database Setup and Core Types

#### 1.1 Create Database Tables

- [ ] Create `billing_cycle`, `subscription_status`, and `payment_provider` enums
- [ ] Create `billing_plans` table
- [ ] Create `billing_plan_providers` table
- [ ] Create `stripe_subscriptions` table
- [ ] Create `stripe_subscription_transactions` table
- [ ] Modify `subscriptions` table (add new columns, make legacy fields nullable)
- [ ] Modify `transactions` table (add `provider` column)
- [ ] Add database indexes for performance
- [ ] Insert default plan records

#### 1.2 TypeScript Types and Interfaces

- [ ] Create `BillingPlan` type
- [ ] Create `BillingPlanProvider` type
- [ ] Create `StripeSubscription` type
- [ ] Create `StripeSubscriptionTransaction` type
- [ ] Create `BillingCycle` enum
- [ ] Create `SubscriptionStatus` enum (active, cancelled, expired)
- [ ] Create `PaymentProvider` enum
- [ ] Update `Subscription` type in `src/types/Supabase.ts` to include new fields
- [ ] Update `Transaction` type in `src/types/Supabase.ts` to include `provider` field
- [ ] Create request/response types for billing APIs

#### 1.3 Database Helper Functions

- [ ] Create `getBillingPlans()` in `database.ts`
- [ ] Create `getBillingPlanProviders()` in `database.ts`
- [ ] Create `createStripeSubscription()` in `database.ts`
- [ ] Create `getStripeSubscriptionByAccount()` in `database.ts`
- [ ] Create `getStripeSubscriptionById()` in `database.ts`
- [ ] Create `linkTransactionToStripeSubscription()` in `database.ts`
- [ ] Create `createSubscriptionPeriod()` in `database.ts` (creates new subscription record for each billing period)
- [ ] Create `getActiveSubscriptionPeriod()` in `database.ts` (gets active subscription for account)
- [ ] Create `getSubscriptionPeriodsByAccount()` in `database.ts` (gets subscription history)
- [ ] Update `isProAccount()` in `subscription_manager.ts` to check new billing subscriptions
- [ ] Update `getActiveProSubscription()` in `subscription_manager.ts` to include billing subscriptions

### Stage 2: Stripe Subscription Integration

#### 2.1 Stripe Products and Prices Setup

- [ ] Create Stripe products for Monthly and Yearly plans in Stripe Dashboard
- [ ] Create Stripe prices for each plan (monthly and yearly)
- [ ] Store Stripe product IDs in `billing_plan_providers` table (not price IDs)
- [ ] Document Stripe product IDs for reference
- [ ] Note: Query Stripe API for prices when needed using `stripe.prices.list({ product: 'prod_xxx' })`

#### 2.2 Stripe Subscription Creation API

- [ ] Create `/api/secure/billing/subscribe` endpoint
- [ ] Implement Stripe customer creation (if doesn't exist)
- [ ] Query Stripe API for price ID using product ID from `billing_plan_providers`
- [ ] Implement Stripe subscription creation with `mode: 'subscription'`
- [ ] Handle billing address collection in Stripe Checkout
- [ ] Store long-lived Stripe subscription in `stripe_subscriptions` table
- [ ] Create transaction record with `meeting_type_id = NULL` and `provider = 'stripe'`
- [ ] Link transaction to Stripe subscription in `stripe_subscription_transactions` table
- [ ] Create first subscription period record in `subscriptions` table
- [ ] Return Stripe Checkout session URL

#### 2.3 Stripe Webhook Handler

- [ ] Update `/api/integrations/stripe/webhook.ts` to handle subscription events:
  - `customer.subscription.created` - Create `stripe_subscriptions` record and first subscription period
  - `customer.subscription.updated` - Update `stripe_subscriptions` record if needed
  - `customer.subscription.deleted` - Mark subscription as cancelled/expired
  - `invoice.payment_succeeded` - Create new transaction, link to Stripe subscription, create new subscription period
  - `invoice.payment_failed` - Handle payment failure, update subscription status
  - `customer.subscription.trial_will_end` - Send trial ending notification
- [ ] Implement `handleSubscriptionCreated()` helper
- [ ] Implement `handleSubscriptionUpdated()` helper
- [ ] Implement `handleSubscriptionDeleted()` helper
- [ ] Implement `handleInvoicePaymentSucceeded()` helper (creates new subscription period per billing cycle)
- [ ] Implement `handleInvoicePaymentFailed()` helper
- [ ] Update transaction status based on webhook events
- [ ] Ensure each renewal creates a new subscription period record (immutable model)

#### 2.4 Stripe Subscription Management

- [ ] Create `/api/secure/billing/cancel` endpoint
- [ ] Implement subscription cancellation via Stripe API (cancels at period end)
- [ ] Update `stripe_subscriptions` record when cancelled
- [ ] Update current subscription period status to 'cancelled' when cancelled
- [ ] Create `/api/secure/billing/resume` endpoint (if needed)
- [ ] Create `/api/secure/billing/update` endpoint (for plan changes)
- [ ] Handle immediate cancellation vs. end-of-period cancellation

### Stage 3: Crypto Payment Integration (Thirdweb)

#### 3.1 Crypto Subscription Payment Flow

- [ ] Research Thirdweb's payment capabilities for one-time payments
- [ ] Create `/api/secure/billing/subscribe-crypto` endpoint
- [ ] Implement one-time crypto payment processing
- [ ] Create transaction record with `meeting_type_id = NULL` and `provider = NULL` (crypto)
- [ ] Create subscription period record in `subscriptions` table (no `stripe_subscriptions` record for crypto)
- [ ] Handle payment confirmation via webhook or polling

#### 3.2 Thirdweb Webhook Integration

- [ ] Update `/api/integrations/thirdweb/webhook.ts` to handle subscription payments
- [ ] Identify subscription payments vs. meeting payments (check metadata or transaction type)
- [ ] On successful payment, create subscription period record in `subscriptions` table
- [ ] Update subscription status to 'active' on successful payment
- [ ] Handle payment failures

#### 3.3 Crypto Subscription Renewal

- [ ] Create renewal reminder system (email/notification)
- [ ] Create `/api/secure/billing/renew-crypto` endpoint for manual renewal
- [ ] Implement renewal payment flow (creates new transaction)
- [ ] On successful renewal, create new subscription period record (immutable model)
- [ ] Mark previous subscription period as 'expired'
- [ ] Handle expired subscriptions

### Stage 4: Subscription Status Management

#### 4.1 Subscription Status Logic

- [ ] Implement `isSubscriptionActive()` helper function (checks active subscription periods)
- [ ] Check subscription expiry dates (`expiry_time` field)
- [ ] Handle grace periods (if applicable)
- [ ] Update subscription period status based on payment status
- [ ] Map Stripe statuses to our simplified statuses: trialing→active, past_due→expired, unpaid→expired

#### 4.2 Subscription Sync

- [ ] Create `/api/secure/billing/sync` endpoint
- [ ] Sync Stripe subscription status with `stripe_subscriptions` table
- [ ] Sync subscription periods with Stripe invoice history
- [ ] Handle discrepancies between Stripe and database
- [ ] Implement periodic sync job (optional)

#### 4.3 Subscription Expiry Handling

- [ ] Create background job/cron to check expiring subscription periods
- [ ] Send expiry reminders (7 days, 3 days, 1 day before)
- [ ] Handle expired subscriptions (update status to 'expired', revoke access)
- [ ] Send expiry notifications
- [ ] For Stripe subscriptions, check if new period was created (via webhook) or if subscription was cancelled

### Stage 5: Feature Access Control

#### 5.1 Update Subscription Check Functions

- [ ] Update `isProAccount()` in `subscription_manager.ts` to check active subscription periods (billing or domain)
- [ ] Create `hasActiveBillingSubscription()` helper (checks for active subscription periods with `billing_plan_id`)
- [ ] Merge logic: check both domain subscriptions AND billing subscription periods
- [ ] Update `getActiveProSubscription()` to include billing subscription periods
- [ ] Query active subscription periods: `status = 'active' AND expiry_time > NOW()`

#### 5.2 Meeting Type Limits

- [ ] Update meeting type creation API to check subscription status
- [ ] Enforce 1 meeting type limit for free users
- [ ] Allow unlimited meeting types for pro users
- [ ] Update UI to show limits and upgrade prompts

#### 5.3 Scheduling Groups Limits

- [ ] Update group creation API to check subscription status
- [ ] Enforce 5 groups limit for free users
- [ ] Allow unlimited groups for pro users
- [ ] Update UI to show limits and upgrade prompts

#### 5.4 Calendar Integration Limits

- [ ] Update calendar integration API to check subscription status
- [ ] Enforce 1 integration limit for free users
- [ ] Allow unlimited integrations for pro users
- [ ] Update UI to show limits and upgrade prompts

#### 5.5 QuickPoll Limits

- [ ] Update QuickPoll creation API to check active poll count
- [ ] Enforce 2 active polls limit for free users
- [ ] Allow unlimited polls for pro users
- [ ] Update UI to show limits and upgrade prompts

#### 5.6 Calendar Sync Limits

- [ ] Update calendar sync logic to check subscription status
- [ ] Enforce 1 calendar sync limit for free users
- [ ] Allow unlimited calendar syncs for pro users
- [ ] Update UI to show limits and upgrade prompts

### Stage 6: User Interface

#### 6.1 Billing Page Component

- [ ] Create `/dashboard/billing` page or section
- [ ] Display current active subscription period status
- [ ] Show subscription plan details (monthly/yearly) from `billing_plan_id`
- [ ] Display subscription expiry date (`expiry_time`)
- [ ] Show payment method (derived from transaction `provider` field)
- [ ] Display subscription history (all subscription periods for the account)
- [ ] Add "Cancel Subscription" button (if active Stripe subscription)
- [ ] Add "Upgrade" or "Change Plan" buttons

#### 6.2 Subscription Selection UI

- [ ] Create subscription selection component
- [ ] Display monthly ($8/month) and yearly ($80/year) options
- [ ] Show billing address form (for Stripe)
- [ ] Add payment method selection (Stripe Card / Crypto)
- [ ] Implement plan toggle (monthly/yearly)
- [ ] Show payment summary (subtotal, tax if applicable, total)
- [ ] Remove tax section from UI (Stripe handles tax)

#### 6.3 Payment Processing UI

- [ ] Create Stripe Checkout redirect flow
- [ ] Create crypto payment flow (similar to existing crypto payment)
- [ ] Show payment processing status
- [ ] Handle payment success redirect
- [ ] Handle payment cancellation
- [ ] Display payment confirmation

#### 6.4 Subscription Management UI

- [ ] Create subscription details view
- [ ] Show subscription history (all subscription periods with their transactions)
- [ ] Display upcoming renewal date (for Stripe subscriptions, show next billing date)
- [ ] Show cancellation confirmation dialog
- [ ] Display cancellation effective date (when current period expires)
- [ ] Add "Resume Subscription" option (if canceled Stripe subscription)
- [ ] For crypto subscriptions, show manual renewal option

#### 6.5 Navigation Updates

- [ ] Add "Go Pro" button to landing page (already exists)
- [ ] Add "Billing" link in dashboard navigation
- [ ] Update "Account Plans & Billing" section to show billing subscriptions
- [ ] Add billing subscription status to account details

### Stage 7: API Endpoints

#### 7.1 Subscription Endpoints

- [ ] `GET /api/secure/billing/plans` - Get available plans from `billing_plans` table
- [ ] `GET /api/secure/billing/subscription` - Get current active subscription period
- [ ] `GET /api/secure/billing/subscription/periods` - Get all subscription periods (history)
- [ ] `POST /api/secure/billing/subscribe` - Create Stripe subscription
- [ ] `POST /api/secure/billing/subscribe-crypto` - Create crypto subscription
- [ ] `PATCH /api/secure/billing/cancel` - Cancel Stripe subscription (via Stripe API)
- [ ] `PATCH /api/secure/billing/resume` - Resume canceled Stripe subscription
- [ ] `PATCH /api/secure/billing/update` - Update subscription plan (change billing plan)
- [ ] `GET /api/secure/billing/history` - Get subscription history (all periods with transactions)

#### 7.2 Webhook Endpoints

- [ ] Update `/api/integrations/stripe/webhook.ts` (already exists)
- [ ] Update `/api/integrations/thirdweb/webhook.ts` (already exists)

### Stage 8: Testing

#### 8.1 Unit Tests

- [ ] Test subscription creation logic
- [ ] Test subscription status checks
- [ ] Test feature limit enforcement
- [ ] Test subscription cancellation
- [ ] Test webhook handlers

#### 8.2 Integration Tests

- [ ] Test Stripe subscription flow end-to-end
- [ ] Test crypto subscription flow end-to-end
- [ ] Test webhook event handling
- [ ] Test subscription expiry handling
- [ ] Test feature access control

#### 8.3 User Acceptance Testing

- [ ] Test subscription purchase flow
- [ ] Test subscription cancellation
- [ ] Test feature limits enforcement
- [ ] Test subscription renewal (Stripe)
- [ ] Test crypto payment flow

### Stage 9: Documentation and Deployment

#### 9.1 Documentation

- [ ] Document billing subscription system architecture
- [ ] Document API endpoints
- [ ] Document webhook events
- [ ] Document feature limits
- [ ] Create user-facing documentation

#### 9.2 Environment Variables

- [ ] Document required Stripe environment variables
- [ ] Document Stripe price IDs
- [ ] Document webhook secret keys

#### 9.3 Deployment

- [ ] Deploy database migrations
- [ ] Configure Stripe webhooks in production
- [ ] Configure Thirdweb webhooks in production
- [ ] Test in staging environment
- [ ] Deploy to production

## Key Considerations and Questions

### Questions to Resolve

1. **Thirdweb Recurring Payments**:

   - Thirdweb does not natively support recurring payments. Should we:
     - Option A: Implement manual renewal reminders and let users renew manually?
     - Option B: Use a smart contract-based subscription system?
     - Option C: Only support Stripe for recurring subscriptions and crypto for one-time payments?

2. **Tax Handling**:

   - Stripe handles tax automatically. Should we remove the tax section from the UI as mentioned?
   - For crypto payments, do we need to handle tax differently?

3. **Subscription Grace Period**:

   - Should there be a grace period after subscription expires before revoking access?
   - How long should the grace period be?

4. **Plan Changes**:

   - Should users be able to switch between monthly and yearly plans?
   - How should prorating be handled?

5. **Cancellation Policy**:

   - Should cancellations be immediate or at the end of the billing period?
   - Should users retain access until the end of the paid period?

6. **Free Trial**:

   - The pricing page mentions "14 days free trial". Should this be implemented?
   - How should the trial work with Stripe subscriptions?

7. **Existing Domain Subscriptions**:

   - How should existing blockchain-based domain subscriptions interact with billing subscriptions?
   - Should users with domain subscriptions automatically get pro features?
   - Should we migrate existing subscriptions or keep both systems?

8. **Billing Address**:

   - The design shows a billing address form. Should this be:
     - Collected in Stripe Checkout (recommended)?
     - Collected in our UI before redirecting to Stripe?

9. **Payment Method Storage**:

   - Should we store payment method details for Stripe (last 4 digits, card type)?
   - Should we allow users to update payment methods?

10. **Subscription History**:
    - Should we track all subscription changes (upgrades, downgrades, cancellations)?
    - Should we show transaction history for subscription payments?

## Technical Notes

### Stripe Subscription Flow

1. User selects plan (monthly/yearly)
2. Query `billing_plan_providers` to get Stripe product ID
3. Query Stripe API for price ID using product ID
4. Create Stripe Checkout session with `mode: 'subscription'`
5. User completes payment in Stripe Checkout
6. Stripe webhook fires `customer.subscription.created`
7. Create `stripe_subscriptions` record (account-level, long-lived)
8. Create transaction record with `meeting_type_id = NULL`, `provider = 'stripe'`
9. Link transaction to Stripe subscription in `stripe_subscription_transactions`
10. Create first subscription period in `subscriptions` table
11. Grant pro features access
12. On each renewal (`invoice.payment_succeeded`):
    - Create new transaction
    - Link to Stripe subscription
    - Create new subscription period (immutable model)
    - Mark previous period as expired

### Crypto Payment Flow

1. User selects plan and payment method (crypto)
2. Process one-time crypto payment (similar to existing crypto payment flow)
3. Create transaction record with `meeting_type_id = NULL`, `provider = NULL` (crypto)
4. On payment confirmation via webhook:
   - Create subscription period in `subscriptions` table with `status = 'active'`
   - Set `expiry_time` based on plan (1 month or 1 year from now)
   - Set `billing_plan_id` to selected plan
   - Link `transaction_id` to the transaction
5. Grant pro features access
6. Send renewal reminder before expiry (manual renewal required)
7. On manual renewal:
   - Create new transaction
   - Create new subscription period (immutable model)
   - Mark previous period as expired

### Feature Access Control Pattern

```typescript
// Check if user has active subscription (billing or domain)
// isProAccount() now checks both domain subscriptions and billing subscription periods
const hasProAccess = isProAccount(account)

// Enforce limits
if (!hasProAccess) {
  // Check free tier limits
  if (meetingTypesCount >= 1) {
    throw new LimitExceededError('Free tier allows only 1 meeting type')
  }
}

// Query active subscription period
const activeSubscription = await getActiveSubscriptionPeriod(accountAddress)
// Returns subscription with status='active' AND expiry_time > NOW()
// Can be billing subscription (has billing_plan_id) or domain subscription (has domain)
```

## Next Steps

1. **Review and Approve Plan**: Review this implementation plan and address the questions above
2. **Clarify Requirements**: Resolve any ambiguities or missing requirements
3. **Prioritize Stages**: Determine which stages should be implemented first
4. **Begin Implementation**: Start with Stage 1 (Database Setup) once plan is approved

## References

### Documentation

- **See `BILLING_DOCUMENTATION_REFERENCES.md`** for comprehensive documentation links, test environment setup, and testing guides

### Key Documentation Links

- Stripe Subscriptions: https://docs.stripe.com/billing/subscriptions/overview
- Stripe Checkout: https://docs.stripe.com/payments/checkout
- Stripe Webhooks: https://docs.stripe.com/webhooks
- Thirdweb Payments: https://portal.thirdweb.com/engine/v2/features/payments

### Test Environments

- **Stripe Test Mode**: https://dashboard.stripe.com/test
- **Thirdweb Dashboard**: https://thirdweb.com/dashboard
- See `BILLING_DOCUMENTATION_REFERENCES.md` for detailed test environment setup

### Existing Codebase Patterns

- Stripe payment flow: `src/pages/api/transactions/checkout.ts`
- Crypto payment flow: `src/pages/api/integrations/thirdweb/webhook.ts`
- Subscription manager: `src/utils/subscription_manager.ts`
- Database patterns: `src/utils/database.ts`
