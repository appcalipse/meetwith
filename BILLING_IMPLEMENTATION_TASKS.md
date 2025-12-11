# Billing Feature Implementation - Sequential Task List

## ✅ Completed Setup

- [x] Database tables created (billing_plans, billing_plan_providers, stripe_subscriptions, stripe_subscription_transactions)
- [x] Subscriptions and transactions tables updated
- [x] Stripe products and prices created in Stripe Dashboard
- [x] Product IDs added to billing_plan_providers table

---

## Phase 1: Foundation - Types & Enums (Start Here)

### Task 1.1: Create Billing Types File ✅

**File**: `src/types/Billing.ts`

- [x] Create `BillingCycle` enum: `'monthly' | 'yearly'`
- [x] Create `SubscriptionStatus` enum: `'active' | 'cancelled' | 'expired'`
- [x] Create `PaymentProvider` enum: `'stripe'` (for now)
- [x] Create `BillingPlan` interface
- [x] Create `BillingPlanProvider` interface
- [x] Create `StripeSubscription` interface
- [x] Create `StripeSubscriptionTransaction` interface
- [x] Create `SubscriptionPeriod` interface (for subscription periods)
- [x] Create API request/response types:
  - `SubscribeRequest`, `SubscribeResponse`
  - `CancelSubscriptionRequest`, `CancelSubscriptionResponse`
  - `GetSubscriptionResponse`, `GetPlansResponse`
  - `GetSubscriptionHistoryResponse` (bonus)
- [x] Added helper types: `BillingPlanWithProvider`, `ActiveSubscription`, webhook types

**Status**: ✅ Completed

---

### Task 1.2: Update Supabase Types ✅

**File**: `src/types/Supabase.ts`

- [x] Added new enum types:
  - `BillingCycle: 'monthly' | 'yearly'`
  - `SubscriptionStatus: 'active' | 'cancelled' | 'expired'`
- [x] Added new table types:
  - `billing_plans` table type (Row, Insert, Update, Relationships)
  - `billing_plan_providers` table type (Row, Insert, Update, Relationships)
  - `stripe_subscriptions` table type (Row, Insert, Update, Relationships)
  - `stripe_subscription_transactions` table type (Row, Insert, Update, Relationships)
- [x] Updated `subscriptions` table type to include:
  - `billing_plan_id: string | null`
  - `status: SubscriptionStatus`
  - `transaction_id: string | null`
  - `updated_at: string | null`
  - Made legacy fields nullable: `chain`, `domain`, `plan_id`
  - Added foreign key relationships for billing_plan_id and transaction_id
- [x] Updated `transactions` table type to include:
  - `provider: PaymentProvider | null`

**Note**: Manually added types to maintain consistency with existing codebase structure

**Estimated Time**: 15-20 minutes  
**Status**: ✅ Completed

---

## Phase 2: Database Layer - Helper Functions

### Task 2.1: Billing Plans Helpers ✅

**File**: `src/utils/database.ts`

- [x] Create `getBillingPlans()` function:

  - Query `billing_plans` table
  - Return all plans ordered by billing_cycle
  - Handle errors with Sentry
  - Returns `BillingPlan[]`

- [x] Create `getBillingPlanById(planId: string)` function:

  - Query single plan by ID
  - Return plan or null (handles not found gracefully)
  - Handle errors with Sentry
  - Returns `BillingPlan | null`

- [x] Create `getBillingPlanProviders()` function:

  - Query `billing_plan_providers` table
  - Join with `billing_plans` to get plan details
  - Optionally filter by provider
  - Return providers with plan details as `BillingPlanWithProvider[]`
  - Handle errors with Sentry

- [x] Create `getBillingPlanProvider(planId: string, provider: PaymentProvider)` function:

  - Get provider mapping for a specific plan
  - Return provider_product_id or null
  - Handle errors with Sentry
  - Returns `string | null`

- [x] Added imports for Billing types
- [x] Added functions to exports list

**Estimated Time**: 45-60 minutes  
**Status**: ✅ Completed

---

### Task 2.2: Stripe Subscription Helpers ✅

**File**: `src/utils/database.ts`

- [x] Create `createStripeSubscription()` function:

  - Insert into `stripe_subscriptions` table
  - Parameters: account_address, stripe_subscription_id, stripe_customer_id, billing_plan_id
  - Return created record as `StripeSubscription`
  - Handle errors with Sentry

- [x] Create `getStripeSubscriptionByAccount(accountAddress: string)` function:

  - Query by account_address (lowercased)
  - Return most recent Stripe subscription or null
  - Order by created_at DESC, limit 1
  - Handle errors with Sentry

- [x] Create `getStripeSubscriptionById(stripeSubscriptionId: string)` function:

  - Query by stripe_subscription_id
  - Return subscription or null (handles not found gracefully)
  - Handle errors with Sentry

- [x] Create `updateStripeSubscription()` function:

  - Update stripe_subscriptions record
  - Parameters: stripeSubscriptionId, updates (billing_plan_id, stripe_customer_id)
  - Automatically updates updated_at timestamp
  - Handle errors with Sentry

- [x] Create `linkTransactionToStripeSubscription()` function:

  - Insert into `stripe_subscription_transactions` table
  - Link transaction_id to stripe_subscription_id
  - Return created record as `StripeSubscriptionTransaction`
  - Handle errors with Sentry

- [x] Added imports for StripeSubscription and StripeSubscriptionTransaction types
- [x] Added all functions to exports list

**Estimated Time**: 45-60 minutes  
**Status**: ✅ Completed

---

### Task 2.3: Subscription Period Helpers ✅

**File**: `src/utils/database.ts`

- [x] Create `createSubscriptionPeriod()` function:

  - Insert into `subscriptions` table
  - Parameters: owner_account, billing_plan_id, status, expiry_time, transaction_id
  - Set registered_at = NOW()
  - Return created subscription period

- [x] Create `getActiveSubscriptionPeriod(accountAddress: string)` function:

  - Query subscriptions where:
    - owner_account = accountAddress
    - status = 'active'
    - expiry_time > NOW()
  - Order by `expiry_time DESC` to get subscription with farthest expiry
  - Return subscription with latest expiry_time or null
  - **Extension Support**: When users extend subscriptions, new entries are created while old ones remain active. This function finds the subscription with the farthest expiry_time to determine current subscription status.

- [x] Create `getSubscriptionPeriodsByAccount(accountAddress: string)` function:

  - Get all subscription periods for account (history)
  - Order by registered_at DESC
  - Return array of subscription periods

- [x] Create `updateSubscriptionPeriodStatus()` function:

  - Update subscription status (active → expired, active → cancelled, etc.)
  - Update updated_at timestamp

- [x] Added all functions to exports list
- [x] Used proper Supabase types (`Tables<'subscriptions'>`)
- [x] Used `.maybeSingle()` for queries that might not return results
- [x] Used `.single()` for inserts/updates
- [x] Added proper error handling with Sentry
- [x] No unnecessary type casting

**Estimated Time**: 60-75 minutes  
**Status**: ✅ Completed

---

### Task 2.4: Update Subscription Manager ✅

**File**: `src/utils/subscription_manager.ts`

- [x] Create `hasActiveBillingSubscription(accountAddress: string)` helper:

  - Check if account has active billing subscription period
  - Return boolean
  - Uses `getActiveSubscriptionPeriod` from database helpers

- [x] Update `isProAccount()` function:

  - Kept existing sync version for backward compatibility (checks domain subscriptions from Account object)
  - Added async version `isProAccountAsync(accountAddress: string)`:
    - Check for active billing subscription periods (new logic)
    - Check for active domain subscriptions (existing logic)
    - Return true if either exists

- [x] Update `getActiveProSubscription()` function:

  - Kept existing sync version for backward compatibility (checks domain subscriptions from Account object)
  - Added async version `getActiveProSubscriptionAsync(accountAddress: string)`:
    - Check billing subscription periods (new logic) - priority
    - Check domain subscriptions (existing logic) - fallback
    - Return subscription info (billing or domain)
    - Converts billing subscription period to Subscription format

- [x] Updated `Subscription` interface in `src/types/Subscription.ts`:

  - Made `plan_id`, `chain`, `domain`, `config_ipfs_hash` nullable to support billing subscriptions
  - Added optional `billing_plan_id`, `status`, `transaction_id` fields for billing subscriptions

- [x] Added proper error handling with Sentry
- [x] Maintained backward compatibility with existing sync functions
- [x] Used existing database helpers (`getActiveSubscriptionPeriod`, `getSubscriptionFromDBForAccount`)

**Estimated Time**: 45-60 minutes  
**Status**: ✅ Completed

---

## Phase 3: Stripe Integration - API Endpoints

### Task 3.1: Get Plans Endpoint ✅

**File**: `src/pages/api/secure/billing/plans.ts`

- [x] Create GET endpoint
- [x] Fetch billing plans from database using `getBillingPlans()`
- [x] Fetch provider mappings (Stripe product IDs) using `getBillingPlanProviders('stripe')`
- [x] Combine plans with provider info to create `BillingPlanWithProvider[]`
- [x] Return plans with provider info in `GetPlansResponse` format
- [x] Add authentication/authorization using `withSessionRoute`
- [x] Handle errors with proper status codes and Sentry logging
- [x] Follow existing API endpoint patterns

**Estimated Time**: 30-45 minutes  
**Status**: ✅ Completed

---

### Task 3.2: Get Subscription Endpoint ✅

**File**: `src/pages/api/secure/billing/subscription.ts`

- [x] Create GET endpoint
- [x] Get active subscription period for account using `getActiveSubscriptionPeriod()`
- [x] Get billing plan details if subscription has `billing_plan_id`
- [x] Get Stripe subscription details if applicable using `getStripeSubscriptionByAccount()`
- [x] Determine payment provider from transaction using `getTransactionsById()`
- [x] Return subscription info with plan details in `GetSubscriptionResponse` format
- [x] Handle no subscription case (returns null values with `is_active: false`)
- [x] Add authentication/authorization using `withSessionRoute`
- [x] Security: Validate query parameter matches session account
- [x] Check actual subscription status (status='active' AND expiry_time > now)

**Additional**: Created `/api/secure/billing/subscription/active.ts` endpoint for `hasActiveBillingSubscription` helper

**Estimated Time**: 30-45 minutes  
**Status**: ✅ Completed

---

### Task 3.3: Subscribe Endpoint (Stripe) ✅

**File**: `src/pages/api/secure/billing/subscribe.ts`

- [x] Create POST endpoint
- [x] Validate request body (billing_plan_id)
- [x] Get billing plan from database using `getBillingPlanById()`
- [x] Get Stripe product ID from billing_plan_providers using `getBillingPlanProvider()`
- [x] Query Stripe API for price ID: `stripe.prices.list({ product: productId, active: true })`
- [x] Get or create Stripe customer:
  - Check if customer exists via `getStripeSubscriptionByAccount()` (uses existing `stripe_customer_id` if found)
  - Create customer if doesn't exist using `stripe.customers.create()` with metadata
- [x] **Extension Logic**: Check if user has existing active subscription:
  - If yes: Get subscription with farthest expiry_time using `getActiveSubscriptionPeriod()`
  - Calculate new expiry_time = existing_farthest_expiry + plan_duration (using `addMonths` or `addYears`)
  - Example: If existing subscription expires Dec 25th and user extends by 1 month, new expiry = Jan 25th
  - If no: Calculate expiry_time = now + plan_duration
  - Pass calculated_expiry_time in metadata for reference (webhook will recalculate based on actual state)
- [x] Create Stripe Checkout Session:
  - `mode: 'subscription'`
  - `line_items` with price_id (from Stripe API query)
  - `customer` ID (existing or newly created)
  - `success_url`: Redirect to `/dashboard/details?checkout=success&session_id={CHECKOUT_SESSION_ID}#subscriptions`
  - `cancel_url`: Redirect to `/dashboard/details?checkout=cancel#subscriptions`
  - `metadata` with account_address, billing_plan_id, and calculated_expiry_time
  - **Note**: Using hash fragment `#subscriptions` to navigate to subscriptions section, query params for status
- [x] Return Checkout session URL in `SubscribeResponse` format
- [x] Handle errors (Stripe errors with proper error types, database errors, validation errors)
- [x] Follow existing API endpoint patterns
- [x] Use proper TypeScript types

**Note**: When extending subscriptions, we create a new subscription entry. The old subscription remains active with its original expiry_time. The system determines subscription status by finding the subscription with the farthest expiry_time among all active subscriptions. The calculated_expiry_time in metadata is for reference; the webhook will recalculate based on actual subscription state when payment succeeds.

**Estimated Time**: 90-120 minutes  
**Status**: ✅ Completed

---

### Task 3.4: Manage Subscription Endpoint (Stripe Customer Portal) ✅

**File**: `src/pages/api/secure/billing/manage.ts`

- [x] Create GET endpoint
- [x] Get active Stripe subscription for account
- [x] Get Stripe customer ID from subscription (customer is created during subscribe, so we just retrieve it here)
- [x] Create Stripe Customer Portal session:
  - `customer` ID
  - `return_url`: `/dashboard/details?portal_success=true#subscriptions`
  - Portal features configured in Stripe Dashboard (subscription management, payment methods, billing history)
  - **Note**: Using hash fragment `#subscriptions` to navigate to subscriptions section, query param for success status
- [x] Return portal session URL
- [x] Handle errors (no subscription, no customer, Stripe API errors)

**Note**: Users will manage subscriptions (cancel, update payment method, view invoices) through Stripe's Customer Portal interface. Webhooks will handle database updates when users make changes. Portal features are configured in Stripe Dashboard (Settings → Billing → Customer Portal).

**Estimated Time**: 30-45 minutes  
**Status**: ✅ Completed

---

## Phase 4: Stripe Webhooks

### Task 4.1: Update Stripe Webhook Handler ✅

**File**: `src/pages/api/integrations/stripe/webhook.ts`

- [x] Review existing webhook structure
- [x] Add subscription event handlers to switch statement:
  - `customer.subscription.created` → `handleSubscriptionCreated()`
  - `customer.subscription.updated` → `handleSubscriptionUpdated()`
  - `customer.subscription.deleted` → `handleSubscriptionDeleted()`
  - `invoice.payment_succeeded` → `handleInvoicePaymentSucceeded()`
  - `invoice.payment_failed` → `handleInvoicePaymentFailed()`
  - `customer.subscription.trial_will_end` → `handleSubscriptionTrialWillEnd()` (optional)
- [x] Create placeholder handler functions in `stripe.helper.ts`:
  - Added all handler functions with proper TypeScript event types
  - Added TODO comments indicating which task will implement each handler
  - Added console logging for debugging (will be replaced with actual logic)

**Note**: Handler functions are placeholders that log events. Actual implementation will be done in Tasks 4.2, 4.3, and 4.4.

**Estimated Time**: 30 minutes (setup)  
**Status**: ✅ Completed

---

### Task 4.2: Implement Subscription Created Handler ✅

**File**: `src/pages/api/integrations/stripe/webhook.ts` / `src/utils/services/stripe.helper.ts`

- [x] Create `handleSubscriptionCreated()` function:
  - Extract `account_address` and `billing_plan_id` from metadata
  - Ensure `stripe_subscriptions` record exists (idempotent)
  - Create transaction record (meeting_type_id = NULL, provider = 'stripe', status = pending)
  - Link transaction to Stripe subscription
  - Create first subscription period:
    - Calculate expiry_time (now + 1 month/year based on plan)
    - Set status = 'active'
    - Link transaction_id
  - Handle errors with Sentry and log missing metadata

**Note**: Handler implemented; payment success/failure handling and status updates will be refined in Tasks 4.3 and 4.4.

**Estimated Time**: 60-75 minutes  
**Status**: ✅ Completed

---

### Task 4.3: Implement Invoice Payment Succeeded Handler ✅

**File**: `src/utils/services/stripe.helper.ts`

- [x] Create `handleInvoicePaymentSucceeded()` function:
  - [x] Get Stripe subscription ID from invoice (handles both string and object types)
  - [x] Find stripe_subscriptions record by stripe_subscription_id using `getStripeSubscriptionById()`
  - [x] Get billing plan to determine billing cycle
  - [x] Create transaction record:
    - amount from invoice (converted from cents)
    - status = 'completed'
    - provider = 'stripe'
    - meeting_type_id = NULL
    - provider_reference_id = invoice.id
    - confirmed_at = current timestamp
  - [x] Link transaction to Stripe subscription using `linkTransactionToStripeSubscription()`
  - [x] **Extension Logic**: Check for existing active subscription with farthest expiry_time:
    - If exists: Calculate new expiry_time = existing_farthest_expiry + billing_cycle_duration
    - Example: If existing subscription expires Dec 25th and renewal is 1 month, new expiry = Jan 25th
    - If not: Calculate expiry_time = now + billing_cycle_duration
  - [x] Create new subscription period:
    - Use calculated expiry_time (supports extensions)
    - Set status = 'active'
    - Link transaction_id
  - [x] **Note**: Do NOT mark previous subscription as expired. Old subscriptions remain active. System determines status by finding subscription with farthest expiry_time.
  - [x] Handle errors with proper logging and Sentry exception capture

**Estimated Time**: 75-90 minutes  
**Status**: ✅ Completed

---

### Task 4.4: Implement Other Webhook Handlers ✅

**File**: `src/utils/services/stripe.helper.ts`

- [x] Create `handleSubscriptionUpdated()` function:

  - [x] Find stripe_subscriptions record by stripe_subscription_id
  - [x] Handle `cancel_at_period_end` changes:
    - When `cancel_at_period_end` is set to true:
      - Update all active subscription periods to 'cancelled' status
      - Only updates billing subscriptions (checks for billing_plan_id)
      - Only updates subscriptions that haven't expired yet
    - When subscription is reactivated (`cancel_at_period_end` set to false):
      - Update cancelled subscription periods back to 'active' if still within expiry_time
      - Only updates billing subscriptions
  - [x] Update stripe_subscriptions record (placeholder for future enhancements like plan changes)
  - [x] Handle errors with proper logging and Sentry exception capture

- [x] Create `handleSubscriptionDeleted()` function:

  - [x] Find stripe_subscriptions record by stripe_subscription_id
  - [x] Update all active/cancelled subscription periods to 'expired' status
  - [x] Only updates billing subscriptions that haven't expired yet
  - [x] Maintains stripe_subscriptions record for historical reference (doesn't delete)
  - [x] Handle errors with proper logging and Sentry exception capture

- [x] Create `handleInvoicePaymentFailed()` function:
  - [x] Get subscription ID from invoice
  - [x] Find stripe_subscriptions record
  - [x] Log payment failure with relevant details (invoice ID, amount, currency)
  - [x] Note: Stripe handles payment retries automatically, so we don't immediately expire subscriptions
  - [x] Placeholder for future enhancements (tracking failure count, sending notifications)
  - [x] Handle errors with proper logging and Sentry exception capture

**Note**: These handlers are critical for keeping our database in sync when users make changes through Stripe Customer Portal (cancel, reactivate, update payment method, etc.). All handlers include proper error handling and maintain data integrity.

**Estimated Time**: 45-60 minutes  
**Status**: ✅ Completed

---

## Phase 5: Feature Access Control

### Task 5.1: Meeting Type Limits ✅

**Files**: `src/pages/api/secure/meetings/type.ts`, `src/utils/database.ts`, `src/utils/errors.ts`

- [x] Find meeting type creation endpoint (`/api/secure/meetings/type.ts` POST handler)
- [x] Create `countMeetingTypes()` helper function in `database.ts`
- [x] Create custom error classes:
  - `MeetingTypeLimitExceededError` - for exceeding 1 meeting type limit
  - `PaidMeetingTypeNotAllowedError` - for attempting to create paid meetings on free tier
- [x] Add subscription check before creation:
  - Check if user is pro using `isProAccountAsync()`
  - If not pro:
    - Check if attempting to create PAID meeting type → throw `PaidMeetingTypeNotAllowedError`
    - Check current meeting type count using `countMeetingTypes()`
    - If count >= 1: throw `MeetingTypeLimitExceededError`
  - If pro: allow unlimited
- [x] Update error handling in API endpoint to return appropriate status codes (403 for limit errors)
- [x] Error messages include upgrade prompt

**Note**: Free tier restrictions:

- Maximum 1 meeting type
- Only FREE meeting types allowed (no paid meetings)

**Estimated Time**: 30-45 minutes  
**Status**: ✅ Completed

---

### Task 5.2: Scheduling Groups Limits ✅

**Files**: `src/pages/api/secure/group/index.ts`, `src/utils/database.ts`, `src/utils/errors.ts`

- [x] Find group creation endpoint (`/api/secure/group/index.ts` POST handler)
- [x] Create `countGroups()` helper function in `database.ts`:
  - Counts groups where user is a member (via `group_members` table)
  - Uses Supabase count query for efficiency
  - Exported for use in API endpoints
- [x] Create custom error class:
  - `SchedulingGroupLimitExceededError` - for exceeding 5 scheduling groups limit
- [x] Add subscription check before group creation:
  - Check if user is pro using `isProAccountAsync()`
  - If not pro:
    - Check current group count using `countGroups()`
    - If count >= 5: throw `SchedulingGroupLimitExceededError`
  - If pro: allow unlimited
- [x] Update error handling in API endpoint to return appropriate status codes (403 for limit errors)
- [x] Error messages include upgrade prompt

**Note**: Free tier restriction:

- Maximum 5 scheduling groups

**Estimated Time**: 30-45 minutes  
**Status**: ✅ Completed

---

### Task 5.3: Calendar Integration Limits ✅

**Files**:

- `src/pages/api/secure/calendar_integrations/google/callback.ts`
- `src/pages/api/secure/calendar_integrations/office365/callback.ts`
- `src/pages/api/secure/calendar_integrations/icloud.ts`
- `src/pages/api/secure/calendar_integrations/webdav.ts`
- `src/utils/database.ts`
- `src/utils/errors.ts`

- [x] Find calendar integration creation endpoints (all 4 integration types)
- [x] Create `countCalendarIntegrations()` helper function in `database.ts`:
  - Counts all calendar integrations for an account (from `connected_calendars` table)
  - Uses Supabase count query for efficiency
  - Exported for use in API endpoints
- [x] Create custom error class:
  - `CalendarIntegrationLimitExceededError` - for exceeding 1 calendar integration limit
- [x] Add subscription check before integration creation in all endpoints:
  - Google OAuth callback
  - Office365 OAuth callback
  - iCloud integration
  - WebDAV integration
  - Check if user is pro using `isProAccountAsync()`
  - If not pro:
    - Check if integration already exists (using `connectedCalendarExists()`)
    - If it's a new integration (doesn't exist) and count >= 1: throw error
    - If updating existing integration: allow (no limit check)
  - If pro: allow unlimited
- [x] Update error handling in all endpoints:
  - Google/Office365: Redirect with error message in query parameter
  - iCloud/WebDAV: Return 403 status with error message
- [x] Error messages include upgrade prompt

**Note**: Free tier restriction:

- Maximum 1 calendar integration (total, regardless of provider)
- Updates to existing integrations are allowed (no limit check)

**Estimated Time**: 30-45 minutes  
**Status**: ✅ Completed

---

### Task 5.4: QuickPoll Limits ✅

**Files**:

- `src/pages/api/secure/quickpoll/index.ts`
- `src/utils/database.ts`
- `src/utils/errors.ts`

- [x] Find QuickPoll creation endpoint (`/api/secure/quickpoll/index.ts` POST handler)
- [x] Create `countActiveQuickPolls()` helper function in `database.ts`:
  - Finds all polls where user is scheduler (owner) via `quick_poll_participants` table
  - Counts polls with status = `ONGOING` and `expires_at > NOW()`
  - Uses Supabase count query for efficiency
  - Exported for use in API endpoints
- [x] Create custom error class:
  - `QuickPollLimitExceededError` - for exceeding 2 active polls limit
- [x] Add subscription check before QuickPoll creation:
  - Check if user is pro using `isProAccountAsync()`
  - If not pro:
    - Check active poll count using `countActiveQuickPolls()`
    - If count >= 2: throw `QuickPollLimitExceededError`
  - If pro: allow unlimited
- [x] Update error handling in API endpoint to return appropriate status codes (403 for limit errors)
- [x] Error messages include upgrade prompt

**Note**: Free tier restriction:

- Maximum 2 active polls (polls with status = ONGOING and not expired)
- Only counts polls where user is the scheduler/owner

**Estimated Time**: 30-45 minutes  
**Status**: ✅ Completed

---

### Task 5.5: Calendar Sync Limits ✅

**Files**:

- `src/pages/api/secure/calendar_integrations/index.ts`
- `src/utils/database.ts`
- `src/utils/errors.ts`

- [x] Find calendar sync update endpoint (`/api/secure/calendar_integrations/index.ts` PUT handler)
- [x] Create `countCalendarSyncs()` helper function in `database.ts`:
  - Counts calendars with `sync: true` across all connected calendar integrations
  - Optionally excludes a specific integration (when updating that integration)
  - Iterates through all integrations and counts calendars with `sync: true`
  - Exported for use in API endpoints
- [x] Create custom error class:
  - `CalendarSyncLimitExceededError` - for exceeding 1 calendar sync limit
- [x] Add subscription check before updating calendar sync settings:
  - Check if user is pro using `isProAccountAsync()`
  - If not pro:
    - Count existing sync calendars in other integrations (excluding current one being updated)
    - Count sync calendars in the new calendars array
    - If `existingSyncCount + newSyncCount > 1`: throw `CalendarSyncLimitExceededError`
  - If pro: allow unlimited
- [x] Update error handling in API endpoint to return appropriate status codes (403 for limit errors)
- [x] Error messages include upgrade prompt

**Note**: Free tier restriction:

- Maximum 1 calendar sync total (across all calendar integrations)
- Only counts calendars with `sync: true` (calendars that receive events created)
- When updating an integration, excludes that integration from the count to allow proper updates

**Estimated Time**: 30-45 minutes  
**Status**: ✅ Completed

---

## Phase 6: User Interface

### Task 6.1: Update Existing Billing Component

**File**: `src/components/profile/AccountPlansAndBilling.tsx` (update existing component)

- [ ] Integrate new billing subscription API:
  - Fetch current subscription using `/api/secure/billing/subscription`
  - Display billing subscription status alongside existing domain subscriptions
  - Show billing plan details (monthly/yearly) if billing subscription exists
- [ ] Update subscription card display:
  - Show "Active" badge for active billing subscriptions (like screenshot)
  - Display expiry date: "Your current plan is valid until [DATE] ([PLAN] Plan)"
  - Show plan name (e.g., "Pro – $8/month" or "Pro – $80/year")
- [ ] Add "Extend Plan" button (if active subscription):
  - Opens subscription selection dialog
  - Allows extending current subscription
- [ ] Update "Cancel Subscription" button:
  - Change to "Manage Subscription" button (if Stripe subscription)
  - Calls `/api/secure/billing/manage` to get Stripe Customer Portal URL
  - Redirects user to Stripe Customer Portal
- [ ] Add "Subscribe" button (if no active subscription):
  - Opens subscription selection dialog
- [ ] Display subscription history (optional, for future):
  - Table/list of all subscription periods
- [ ] Handle loading and error states
- [ ] Update component to work with both billing and domain subscriptions

**Note**: We're updating the existing `AccountPlansAndBilling` component, not creating a new page. The component already exists at `/dashboard/details#subscriptions`.

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

### Task 6.3: Handle Stripe Checkout Redirects (No New Pages)

**File**: `src/components/profile/AccountPlansAndBilling.tsx` (update existing component)

- [ ] Handle Stripe Checkout redirects in existing component:
  - Check for `checkout=success` query parameter in `useEffect`
  - Check for `checkout=cancel` query parameter
  - Extract `session_id` from query if present (for future verification if needed)
- [ ] Show success toast when `checkout=success`:
  - Message: "Subscription successful! Welcome to Pro!"
  - Auto-dismiss after 5-10 seconds
  - Refetch subscription status after showing toast
- [ ] Show cancel toast when `checkout=cancel`:
  - Message: "Payment cancelled. You can try again anytime."
  - Auto-dismiss after 5 seconds
- [ ] Refetch subscription data:
  - Call subscription API endpoint after successful checkout
  - Update subscription card state to reflect new subscription
  - Update "Active" badge and expiry date display
- [ ] Clean up query parameters:
  - Remove `checkout` and `session_id` from URL after handling
  - Keep hash fragment `#subscriptions` to stay on subscriptions section

**Note**: No new pages needed. We use the existing `/dashboard/details#subscriptions` page with query parameters for status. The hash fragment navigates to the subscriptions section, and toasts provide user feedback.

**Estimated Time**: 30-45 minutes

---

### Task 6.4: Customer Portal Return Handler

**File**: `src/components/profile/AccountPlansAndBilling.tsx` (update existing component)

- [ ] Handle Customer Portal return redirect:
  - Check for `?portal_success=true` query parameter in URL
  - Show success toast: "Subscription updated successfully"
  - Refresh subscription data to reflect changes made in Stripe Portal
  - Clear query parameter from URL (keep `#subscriptions` hash)
- [ ] Handle different portal actions (via query params if Stripe provides them):
  - Subscription cancelled: Show appropriate message
  - Payment method updated: Show confirmation
  - Subscription reactivated: Show confirmation
- [ ] Update subscription card state after portal return:
  - Refetch subscription status
  - Update "Active" badge if subscription was cancelled/reactivated
  - Update expiry date if subscription was extended

**Note**: Customer Portal redirects back to the return_url we configure. We'll use `/dashboard/details?portal_success=true#subscriptions` as the return URL.

**Estimated Time**: 30-45 minutes

---

### Task 6.5: Navigation Updates

**Files**: Navigation components

- [ ] Add "Billing" link to dashboard navigation
- [ ] Update "Account Plans & Billing" section to show billing subscriptions
- [ ] Update "Go Pro" button to link to `/dashboard/details#subscriptions` (already exists in `Pricing.tsx`)

**Estimated Time**: 30-45 minutes

---

## Phase 7: Testing & Verification

### Task 7.1: Test Stripe Subscription Flow

- [ ] Test subscription creation (monthly plan)
- [ ] Test subscription creation (yearly plan)
- [ ] Verify Stripe Checkout redirects correctly
- [ ] Test webhook events (use Stripe CLI or test mode)
- [ ] Verify database records are created correctly
- [ ] Test Stripe Customer Portal:
  - Verify "Manage Subscription" button creates portal session
  - Test cancellation through Customer Portal
  - Test payment method update through Customer Portal
  - Test subscription reactivation through Customer Portal
  - Verify webhooks update database correctly
  - Verify return redirect shows success toast
  - Verify subscription card state updates
- [ ] Verify subscription status updates

**Estimated Time**: 90-120 minutes

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
- [ ] Test cancelled subscription handling (via Customer Portal)
- [ ] Test subscription reactivation (via Customer Portal)
- [ ] Test webhook retries
- [ ] Test error handling (Stripe API errors, database errors)
- [ ] Test Customer Portal edge cases:
  - User cancels subscription in portal, then reactivates
  - User updates payment method in portal
  - User views invoices in portal
  - Portal session expiration
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
- **Stripe Customer Portal**: Users manage subscriptions through Stripe's interface. We handle redirects and show success toasts. Webhooks keep our database in sync.
- **No Custom Cancellation UI**: All subscription management (cancel, update payment, view invoices) happens in Stripe Customer Portal
- **Customer Portal Return**: Handle `?portal_success=true` query parameter to show success toast and refresh subscription state
- **No Success/Cancel Pages**: We use existing `/dashboard/details#subscriptions` page with query parameters and toasts instead of building new pages
- **Hash Fragment Support**: Stripe redirects support hash fragments. We use `#subscriptions` to navigate to the subscriptions section, and query parameters (`?checkout=success`, `?portal_success=true`) for status

## Subscription Extension Flow:

**Key Design Decision**: When users extend their subscription, we create a new subscription entry while keeping all existing active subscriptions unchanged.

**How it works:**

1. User extends subscription (e.g., adds 1 month to existing subscription)
2. System checks for existing active subscription with farthest `expiry_time`
3. New subscription entry is created with:
   - `expiry_time` = existing_farthest_expiry + extension_duration
   - Example: If existing subscription expires Dec 25th and user extends by 1 month, new expiry = Jan 25th
   - `status` = 'active'
   - Original subscription entries remain active with their original expiry_times
   - **Note**: Since we only query active subscriptions where `expiry_time > NOW()`, the existing expiry is guaranteed to be in the future, so we can safely add duration to it
4. When checking subscription status:
   - Query all subscriptions where `status = 'active' AND expiry_time > NOW()`
   - Order by `expiry_time DESC`
   - Return subscription with farthest expiry_time
   - This determines the user's current subscription status

**Benefits:**

- Immutable subscription history (audit trail)
- Supports multiple extensions without losing original subscription records
- Simple logic: always use the subscription with farthest expiry_time
- No need to update/expire old subscriptions when extending
