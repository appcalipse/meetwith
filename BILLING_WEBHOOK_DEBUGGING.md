# Billing Webhook Debugging Guide

## How Database Records Are Created

**Important:** Database records are NOT created when the user is redirected back from Stripe Checkout. They are created by **Stripe webhooks** that Stripe sends to your server.

### The Flow:

1. **User clicks "Pay with Card"** → `/api/secure/billing/subscribe` creates a Stripe Checkout session
2. **User completes payment on Stripe** → Stripe processes the payment
3. **Stripe redirects user back** → User sees `?checkout=success` (this is just a redirect, no DB writes)
4. **Stripe sends webhooks** → Stripe sends events to `/api/integrations/stripe/webhook`:
   - `customer.subscription.created` → Creates `stripe_subscriptions`, `transactions`, and first `subscriptions` record
   - `invoice.payment_succeeded` → Creates transaction and extends subscription period

## Why Nothing Was Inserted

If no database records were created, it means **webhooks were not received or failed**. Common causes:

1. **Local Development:** Webhooks need to be forwarded using Stripe CLI
2. **Webhook Endpoint Not Configured:** Stripe doesn't know where to send webhooks
3. **Webhook Secret Mismatch:** Wrong `STRIPE_WEBHOOK_SECRET` in `.env.local`
4. **Webhook Handler Errors:** Handler received webhook but failed silently

## Debugging Steps

### Step 1: Check if Webhooks Are Being Received

**For Local Development (Using Stripe CLI):**

1. **Install Stripe CLI** (if not already installed):

   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. **Login to Stripe:**

   ```bash
   stripe login
   ```

3. **Forward webhooks to your local server:**

   ```bash
   stripe listen --forward-to localhost:3000/api/integrations/stripe/webhook
   ```

4. **Copy the webhook signing secret** (starts with `whsec_`) displayed in the terminal

5. **Add to `.env.local`:**

   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

6. **Restart your Next.js dev server** to load the new webhook secret

7. **Keep `stripe listen` running** in a separate terminal while testing

8. **Complete a test subscription** - you should see webhook events in the `stripe listen` terminal

**For Production/Test Mode (Stripe Dashboard):**

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Check if a webhook endpoint exists for: `https://yourdomain.com/api/integrations/stripe/webhook`
3. Verify the webhook secret matches your `STRIPE_WEBHOOK_SECRET` environment variable
4. Check webhook event logs for failed deliveries

### Step 2: Check Server Logs

After adding the debug logging, check your Next.js server console for:

- `[Webhook] Received event: customer.subscription.created`
- `[Webhook] Processing customer.subscription.created`
- `[Stripe webhook] handleSubscriptionCreated called`
- `[Stripe webhook] Created stripe_subscriptions record`
- `[Stripe webhook] Created transaction`
- `[Stripe webhook] Created subscription period`

**If you see these logs:** Webhooks are being received and processed successfully.

**If you DON'T see these logs:** Webhooks are not being received (see Step 1).

**If you see errors:** Check the error messages to identify the issue.

### Step 3: Check for Common Issues

#### Issue: "Missing stripe signature" error

**Cause:** Webhook secret is missing or incorrect.

**Fix:**

- Verify `STRIPE_WEBHOOK_SECRET` is set in `.env.local`
- For local development, use the secret from `stripe listen`
- For production, use the webhook signing secret from Stripe Dashboard

#### Issue: "Error verifying webhook signature"

**Cause:** Webhook secret doesn't match what Stripe is using.

**Fix:**

- For local: Make sure you're using the secret from the current `stripe listen` session
- For production: Verify the webhook secret in Stripe Dashboard matches your env variable

#### Issue: "subscription.created missing account_address or billing_plan_id in metadata"

**Cause:** Checkout session metadata wasn't set correctly.

**Fix:** Check `src/pages/api/secure/billing/subscribe.ts` - ensure metadata is being set:

```typescript
metadata: {
  account_address: accountAddress,
  billing_plan_id: billing_plan_id,
  calculated_expiry_time: calculatedExpiryTime.toISOString(),
}
```

#### Issue: Webhook received but handler fails silently

**Cause:** Error in handler function, caught but not logged properly.

**Fix:** Check server logs for `[Stripe webhook] Failed to...` messages. The enhanced logging should now show these.

### Step 4: Verify Database Records

After a successful webhook, check these tables:

1. **`stripe_subscriptions`** - Should have 1 record with:

   - `account_address` = your account
   - `stripe_subscription_id` = `sub_xxx`
   - `stripe_customer_id` = `cus_xxx`
   - `billing_plan_id` = your plan ID

2. **`transactions`** - Should have records with:

   - `meeting_type_id` = `NULL`
   - `provider` = `'stripe'`
   - `provider_reference_id` = subscription or invoice ID

3. **`subscriptions`** - Should have records with:

   - `owner_account` = your account
   - `billing_plan_id` = your plan ID
   - `status` = `'active'`
   - `transaction_id` = links to transaction

4. **`stripe_subscription_transactions`** - Should link transactions to subscriptions

### Step 5: Test Webhook Events Manually

If webhooks aren't firing automatically, you can trigger them manually:

**Using Stripe CLI (while `stripe listen` is running):**

```bash
# Trigger subscription.created event
stripe trigger customer.subscription.created

# Trigger invoice.payment_succeeded event
stripe trigger invoice.payment_succeeded
```

**Using Stripe Dashboard:**

1. Go to [Stripe Dashboard → Developers → Events](https://dashboard.stripe.com/test/events)
2. Find the event (e.g., `customer.subscription.created`)
3. Click "Send test webhook" → Select your endpoint

## Quick Checklist

- [ ] Stripe CLI installed and logged in
- [ ] `stripe listen` running and forwarding to localhost
- [ ] `STRIPE_WEBHOOK_SECRET` in `.env.local` matches `stripe listen` output
- [ ] Next.js dev server restarted after adding webhook secret
- [ ] Server logs show `[Webhook] Received event` messages
- [ ] No errors in server logs
- [ ] Database records exist after webhook processing

## Next Steps

1. **Set up Stripe CLI** (if local development)
2. **Run `stripe listen`** in a separate terminal
3. **Complete a test subscription** and watch both terminals:
   - Stripe CLI terminal: Should show webhook events
   - Next.js server terminal: Should show `[Webhook]` and `[Stripe webhook]` logs
4. **Check database** for new records
5. **If still not working:** Share the server logs and Stripe CLI output
