import { PaymentAccountStatus, PaymentProvider } from '@meta/PaymentAccount'
import { ICheckoutMetadata } from '@meta/Transactions'
import * as Sentry from '@sentry/nextjs'
import {
  PaymentDirection,
  PaymentStatus,
  PaymentType,
} from '@utils/constants/meeting-types'
import {
  confirmFiatTransaction,
  createSubscriptionTransaction,
  getPaymentAccountByProviderId,
  handleUpdateTransactionStatus,
  updatePaymentAccount,
} from '@utils/database'
import {
  createStripeSubscription,
  createSubscriptionPeriod,
  getActiveSubscriptionPeriod,
  getBillingPlanById,
  getBillingPlanIdFromStripeProduct,
  getStripeSubscriptionById,
  getSubscriptionPeriodsByAccount,
  linkTransactionToStripeSubscription,
  updateStripeSubscription,
  updateSubscriptionPeriodStatus,
} from '@utils/database'
import { StripeService } from '@utils/services/stripe.service'
import { addMonths, addYears } from 'date-fns'
import { NextApiRequest } from 'next'
import Stripe from 'stripe'

import { PaymentProvider as BillingPaymentProvider } from '@/types/Billing'
import { TablesInsert } from '@/types/Supabase'

export const getRawBody = async (req: NextApiRequest): Promise<Buffer> => {
  const chunks: Buffer[] = []
  return new Promise((resolve, reject) => {
    req.on('data', chunk => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    })
    req.on('end', () => {
      resolve(Buffer.concat(chunks as unknown as ReadonlyArray<Uint8Array>))
    })
    req.on('error', reject)
  })
}
export const handleAccountUpdate = async (
  event: Stripe.AccountUpdatedEvent
) => {
  const eventObject = event.data.object
  const accountId = eventObject.id
  const provider = await getPaymentAccountByProviderId(accountId)
  if (!provider) {
    return null
  }
  const stripe = new StripeService()
  const account = await stripe.accounts.retrieve(accountId)

  if (account.details_submitted) {
    await updatePaymentAccount(provider.id, provider.owner_account_address, {
      status: PaymentAccountStatus.CONNECTED,
    })
    return
  } else if (account) {
    await updatePaymentAccount(provider.id, provider.owner_account_address, {
      status: PaymentAccountStatus.PENDING,
    })
    return
  } else {
    await updatePaymentAccount(provider.id, provider.owner_account_address, {
      status: PaymentAccountStatus.FAILED,
    })
    return
  }
}
export const handleChargeSucceeded = async (
  event: Stripe.ChargeSucceededEvent
) => {
  const eventObject = event.data.object
  await confirmFiatTransaction(
    eventObject.id,
    eventObject.metadata as ICheckoutMetadata,
    (eventObject.application_fee_amount || 0) / 100,
    {
      provider: PaymentProvider.STRIPE,
      destination: event.account || event.context || '',
      receipt_url: eventObject.receipt_url || '',
      payment_method: `${eventObject.payment_method_details?.type || ''}`,
      currency: eventObject.currency,
      amount_received: eventObject.amount / 100,
    }
  )
}
export const handleChargeFailed = async (
  event: Stripe.ChargeFailedEvent | Stripe.CheckoutSessionExpiredEvent
) => {
  const eventObject = event.data.object
  const metadata = eventObject.metadata as ICheckoutMetadata
  await handleUpdateTransactionStatus(
    metadata.transaction_id,
    PaymentStatus.FAILED
  )
}

export const handleFeeCollected = async (
  event: Stripe.ApplicationFeeCreatedEvent
) => {
  const stripe = new StripeService()
  const eventObject = event.data.object
  const charge =
    typeof eventObject.charge === 'string'
      ? eventObject.charge
      : eventObject.charge.id
  const accountId =
    typeof eventObject.account === 'string'
      ? eventObject.account
      : eventObject.account.id
  const chargeObj = await stripe.charges.retrieve(charge, {
    stripeAccount: accountId,
  })
  await confirmFiatTransaction(
    chargeObj.id,
    chargeObj.metadata as ICheckoutMetadata,
    (chargeObj.application_fee_amount || 0) / 100,
    {
      provider: PaymentProvider.STRIPE,
      receipt_url: chargeObj.receipt_url || '',
      payment_method: `${chargeObj.payment_method_details?.type || ''}`,
      currency: chargeObj.currency,
      amount_received: chargeObj.amount / 100,
      destination: accountId,
    }
  )
}

// Subscription event handlers (to be implemented in Tasks 4.2, 4.3, 4.4)

export const handleSubscriptionCreated = async (
  event: Stripe.CustomerSubscriptionCreatedEvent
) => {
  const subscription = event.data.object

  const accountAddress = (
    subscription.metadata?.account_address as string | undefined
  )?.toLowerCase()
  const billingPlanId =
    (subscription.metadata?.billing_plan_id as string | undefined) || null

  if (!accountAddress || !billingPlanId) {
    // eslint-disable-next-line no-restricted-syntax
    console.warn(
      '[Stripe webhook] subscription.created missing account_address or billing_plan_id in metadata',
      { accountAddress, billingPlanId, subscriptionId: subscription.id }
    )
    return
  }

  const stripeSubscriptionId = subscription.id
  const stripeCustomerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id

  if (!stripeCustomerId) {
    // eslint-disable-next-line no-restricted-syntax
    console.warn(
      '[Stripe webhook] subscription.created missing customer id',
      subscription.id
    )
    return
  }

  // 1) Ensure stripe_subscriptions record exists (idempotent)
  try {
    await createStripeSubscription(
      accountAddress,
      stripeSubscriptionId,
      stripeCustomerId,
      billingPlanId
    )
  } catch (error) {
    // Likely already exists (unique constraint). Log and continue.
    // eslint-disable-next-line no-restricted-syntax
    console.warn(
      '[Stripe webhook] createStripeSubscription skipped/failed',
      error
    )
  }

  // 2) Create a transaction for the initial period
  const firstItem = subscription.items?.data?.[0]
  const unitAmount = firstItem?.price?.unit_amount ?? null
  const currency = firstItem?.price?.currency ?? null

  const transactionPayload: TablesInsert<'transactions'> = {
    method: PaymentType.FIAT,
    status: PaymentStatus.COMPLETED,
    meeting_type_id: null,
    amount: unitAmount ? unitAmount / 100 : null,
    fiat_equivalent: unitAmount ? unitAmount / 100 : null,
    currency: currency ? currency.toUpperCase() : null,
    direction: PaymentDirection.CREDIT,
    initiator_address: accountAddress,
    metadata: {
      source: 'stripe.webhook.subscription.created',
      stripe_subscription_id: stripeSubscriptionId,
      stripe_customer_id: stripeCustomerId,
      billing_plan_id: billingPlanId,
    },
    provider: BillingPaymentProvider.STRIPE,
    provider_reference_id: stripeSubscriptionId,
    transaction_hash: null,
    total_fee: unitAmount ? unitAmount / 100 : 0,
    confirmed_at: new Date().toISOString(),
  }

  let transactionId: string
  try {
    const transaction = await createSubscriptionTransaction(transactionPayload)
    transactionId = transaction.id
  } catch (error) {
    // eslint-disable-next-line no-restricted-syntax
    console.error(
      '[Stripe webhook] Failed to create transaction for subscription.created',
      error
    )
    Sentry.captureException(error)
    return
  }

  // 3) Link transaction to stripe subscription (mapping table)
  try {
    await linkTransactionToStripeSubscription(
      stripeSubscriptionId,
      transactionId
    )
  } catch (error) {
    // eslint-disable-next-line no-restricted-syntax
    console.error(
      '[Stripe webhook] Failed to link transaction to stripe subscription',
      error
    )
    Sentry.captureException(error)
    // continue; not fatal for subsequent steps
  }

  // 4) Create first subscription period (active) with calculated expiry
  try {
    const plan = await getBillingPlanById(billingPlanId)
    if (!plan) {
      // eslint-disable-next-line no-restricted-syntax
      console.warn(
        '[Stripe webhook] billing plan not found for subscription.created',
        billingPlanId
      )
      return
    }

    const now = new Date()
    const expiry =
      plan.billing_cycle === 'monthly' ? addMonths(now, 1) : addYears(now, 1)

    await createSubscriptionPeriod(
      accountAddress,
      billingPlanId,
      'active',
      expiry.toISOString(),
      transactionId
    )
  } catch (error) {
    // eslint-disable-next-line no-restricted-syntax
    console.error(
      '[Stripe webhook] Failed to create subscription period for subscription.created',
      error
    )
    Sentry.captureException(error)
  }
}

export const handleSubscriptionUpdated = async (
  event: Stripe.CustomerSubscriptionUpdatedEvent
) => {
  const subscription = event.data.object
  const stripeSubscriptionId = subscription.id

  // Find stripe_subscriptions record
  const stripeSubscription = await getStripeSubscriptionById(
    stripeSubscriptionId
  )

  if (!stripeSubscription) {
    // eslint-disable-next-line no-restricted-syntax
    console.warn(
      '[Stripe webhook] subscription.updated stripe subscription not found',
      { stripeSubscriptionId }
    )
    return
  }

  const accountAddress = stripeSubscription.account_address.toLowerCase()

  // Handle cancel_at_period_end changes
  const cancelAtPeriodEnd = subscription.cancel_at_period_end

  if (cancelAtPeriodEnd === true) {
    // Subscription is scheduled to cancel at period end
    // Update all active subscription periods to 'cancelled' status
    try {
      const activeSubscriptions = await getSubscriptionPeriodsByAccount(
        accountAddress
      )

      // Update all active subscriptions that haven't expired yet
      const now = new Date()
      for (const sub of activeSubscriptions) {
        if (
          sub.status === 'active' &&
          new Date(sub.expiry_time) > now &&
          sub.billing_plan_id // Only update billing subscriptions
        ) {
          await updateSubscriptionPeriodStatus(sub.id, 'cancelled')
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-restricted-syntax
      console.error(
        '[Stripe webhook] Failed to update subscription periods for cancellation',
        error
      )
      Sentry.captureException(error)
    }
  } else if (cancelAtPeriodEnd === false) {
    // Subscription was reactivated (cancel_at_period_end set to false)
    // Update cancelled subscription periods back to 'active' if still within expiry_time
    try {
      const allSubscriptions = await getSubscriptionPeriodsByAccount(
        accountAddress
      )

      const now = new Date()
      for (const sub of allSubscriptions) {
        if (
          sub.status === 'cancelled' &&
          new Date(sub.expiry_time) > now &&
          sub.billing_plan_id // Only update billing subscriptions
        ) {
          await updateSubscriptionPeriodStatus(sub.id, 'active')
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-restricted-syntax
      console.error(
        '[Stripe webhook] Failed to reactivate subscription periods',
        error
      )
      Sentry.captureException(error)
    }
  }

  // Detect and handle plan changes (e.g., user switches plans through Customer Portal)
  // Extract current Stripe product ID from subscription
  try {
    const subscriptionItem = subscription.items?.data?.[0]
    const price = subscriptionItem?.price
    const stripeProductId =
      typeof price?.product === 'string'
        ? price.product
        : (price?.product as Stripe.Product | undefined)?.id

    if (stripeProductId) {
      // Look up corresponding billing_plan_id
      const newBillingPlanId = await getBillingPlanIdFromStripeProduct(
        stripeProductId
      )

      if (
        newBillingPlanId &&
        newBillingPlanId !== stripeSubscription.billing_plan_id
      ) {
        // Plan change detected - update stripe_subscriptions record
        // eslint-disable-next-line no-restricted-syntax
        console.log('[Stripe webhook] Plan change detected', {
          stripeSubscriptionId,
          oldBillingPlanId: stripeSubscription.billing_plan_id,
          newBillingPlanId,
          stripeProductId,
        })

        await updateStripeSubscription(stripeSubscriptionId, {
          billing_plan_id: newBillingPlanId,
        })
      } else if (newBillingPlanId === null) {
        // Product ID not found in our billing_plan_providers table
        // This could happen if a product was deleted or not properly configured
        // eslint-disable-next-line no-restricted-syntax
        console.warn(
          '[Stripe webhook] Stripe product ID not found in billing_plan_providers',
          {
            stripeSubscriptionId,
            stripeProductId,
            currentBillingPlanId: stripeSubscription.billing_plan_id,
          }
        )
        Sentry.captureException(
          new Error(
            `Stripe product ID ${stripeProductId} not found in billing_plan_providers`
          )
        )
      }
      // If newBillingPlanId === stripeSubscription.billing_plan_id, no update needed
    } else {
      // No subscription items or price/product information available
      // This shouldn't happen in normal operation, but we handle it gracefully
      // Skip plan change detection for this webhook event
      // eslint-disable-next-line no-restricted-syntax
      console.warn(
        '[Stripe webhook] Could not extract product ID from subscription',
        {
          stripeSubscriptionId,
          hasItems: !!subscription.items,
          itemsCount: subscription.items?.data?.length || 0,
        }
      )
      Sentry.captureException(
        new Error(
          `Could not extract product ID from Stripe subscription: ${stripeSubscriptionId}`
        ),
        {
          tags: {
            webhook_event: 'customer.subscription.updated',
            stripe_subscription_id: stripeSubscriptionId,
          },
          extra: {
            hasItems: !!subscription.items,
            itemsCount: subscription.items?.data?.length || 0,
          },
        }
      )
    }
  } catch (error) {
    // eslint-disable-next-line no-restricted-syntax
    console.error(
      '[Stripe webhook] Failed to detect/update plan changes',
      error
    )
    Sentry.captureException(error)
    // continue; not fatal - subscription status updates still proceed
  }
}

export const handleSubscriptionDeleted = async (
  event: Stripe.CustomerSubscriptionDeletedEvent
) => {
  const subscription = event.data.object
  const stripeSubscriptionId = subscription.id

  // Find stripe_subscriptions record
  const stripeSubscription = await getStripeSubscriptionById(
    stripeSubscriptionId
  )

  if (!stripeSubscription) {
    // eslint-disable-next-line no-restricted-syntax
    console.warn(
      '[Stripe webhook] subscription.deleted stripe subscription not found',
      { stripeSubscriptionId }
    )
    return
  }

  const accountAddress = stripeSubscription.account_address.toLowerCase()

  // Update all active subscription periods to 'expired' status
  try {
    const activeSubscriptions = await getSubscriptionPeriodsByAccount(
      accountAddress
    )

    const now = new Date()
    for (const sub of activeSubscriptions) {
      if (
        (sub.status === 'active' || sub.status === 'cancelled') &&
        new Date(sub.expiry_time) > now &&
        sub.billing_plan_id // Only update billing subscriptions
      ) {
        await updateSubscriptionPeriodStatus(sub.id, 'expired')
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-restricted-syntax
    console.error(
      '[Stripe webhook] Failed to expire subscription periods',
      error
    )
    Sentry.captureException(error)
  }

  // Note: We intentionally don't update or delete the stripe_subscriptions record
  // The record remains for historical reference and traceability
  // The subscription periods being marked as 'expired' is sufficient to revoke access
  // In the future, we could add a status field to stripe_subscriptions table if needed
}

export const handleInvoicePaymentSucceeded = async (
  event: Stripe.InvoicePaymentSucceededEvent
) => {
  const invoice = event.data.object

  // Get subscription ID from invoice
  // In webhook events, invoice.subscription is typically a string (subscription ID)
  // TypeScript types may not include it, so we access it safely
  const subscriptionIdOrObject = (
    invoice as unknown as { subscription?: string | Stripe.Subscription }
  ).subscription
  const stripeSubscriptionId =
    typeof subscriptionIdOrObject === 'string'
      ? subscriptionIdOrObject
      : subscriptionIdOrObject?.id

  if (!stripeSubscriptionId) {
    // eslint-disable-next-line no-restricted-syntax
    console.warn(
      '[Stripe webhook] invoice.payment_succeeded missing subscription',
      { invoiceId: invoice.id }
    )
    return
  }

  // Find stripe_subscriptions record by stripe_subscription_id
  const stripeSubscription = await getStripeSubscriptionById(
    stripeSubscriptionId
  )

  if (!stripeSubscription) {
    // eslint-disable-next-line no-restricted-syntax
    console.warn(
      '[Stripe webhook] invoice.payment_succeeded stripe subscription not found',
      { stripeSubscriptionId, invoiceId: invoice.id }
    )
    return
  }

  const accountAddress = stripeSubscription.account_address.toLowerCase()
  const billingPlanId = stripeSubscription.billing_plan_id

  if (!billingPlanId) {
    // eslint-disable-next-line no-restricted-syntax
    console.warn(
      '[Stripe webhook] invoice.payment_succeeded missing billing_plan_id',
      { stripeSubscriptionId, invoiceId: invoice.id }
    )
    return
  }

  // Get billing plan to determine billing cycle
  const billingPlan = await getBillingPlanById(billingPlanId)
  if (!billingPlan) {
    // eslint-disable-next-line no-restricted-syntax
    console.warn(
      '[Stripe webhook] invoice.payment_succeeded billing plan not found',
      { billingPlanId, invoiceId: invoice.id }
    )
    return
  }

  // Create transaction record for the invoice payment (renewal)
  const amountPaid = invoice.amount_paid / 100 // Convert from cents
  const currency = invoice.currency ? invoice.currency.toUpperCase() : null

  const transactionPayload: TablesInsert<'transactions'> = {
    method: PaymentType.FIAT,
    status: PaymentStatus.COMPLETED,
    meeting_type_id: null,
    amount: amountPaid,
    fiat_equivalent: amountPaid,
    currency: currency,
    direction: PaymentDirection.CREDIT,
    initiator_address: accountAddress,
    metadata: {
      source: 'stripe.webhook.invoice.payment_succeeded',
      stripe_subscription_id: stripeSubscriptionId,
      stripe_customer_id: stripeSubscription.stripe_customer_id,
      billing_plan_id: billingPlanId,
      invoice_id: invoice.id,
    },
    provider: BillingPaymentProvider.STRIPE,
    provider_reference_id: invoice.id,
    transaction_hash: null,
    total_fee: amountPaid,
    confirmed_at: new Date().toISOString(),
  }

  let transactionId: string
  try {
    const transaction = await createSubscriptionTransaction(transactionPayload)
    transactionId = transaction.id
  } catch (error) {
    // eslint-disable-next-line no-restricted-syntax
    console.error(
      '[Stripe webhook] Failed to create transaction for invoice.payment_succeeded',
      error
    )
    Sentry.captureException(error)
    return
  }

  // Link transaction to Stripe subscription
  try {
    await linkTransactionToStripeSubscription(
      stripeSubscriptionId,
      transactionId
    )
  } catch (error) {
    // eslint-disable-next-line no-restricted-syntax
    console.error(
      '[Stripe webhook] Failed to link transaction to stripe subscription',
      error
    )
    Sentry.captureException(error)
    // continue; not fatal for subsequent steps
  }

  // Extension Logic: Check for existing active subscription with farthest expiry_time
  const existingSubscription = await getActiveSubscriptionPeriod(accountAddress)
  let calculatedExpiryTime: Date

  if (existingSubscription) {
    // Extension: Add duration to existing farthest expiry
    const existingExpiry = new Date(existingSubscription.expiry_time)
    if (billingPlan.billing_cycle === 'monthly') {
      calculatedExpiryTime = addMonths(existingExpiry, 1)
    } else {
      // yearly
      calculatedExpiryTime = addYears(existingExpiry, 1)
    }
  } else {
    // First renewal: Add duration from now
    const now = new Date()
    if (billingPlan.billing_cycle === 'monthly') {
      calculatedExpiryTime = addMonths(now, 1)
    } else {
      // yearly
      calculatedExpiryTime = addYears(now, 1)
    }
  }

  // Create new subscription period with calculated expiry_time
  try {
    await createSubscriptionPeriod(
      accountAddress,
      billingPlanId,
      'active',
      calculatedExpiryTime.toISOString(),
      transactionId
    )
  } catch (error) {
    // eslint-disable-next-line no-restricted-syntax
    console.error(
      '[Stripe webhook] Failed to create subscription period for invoice.payment_succeeded',
      error
    )
    Sentry.captureException(error)
  }
}

export const handleInvoicePaymentFailed = async (
  event: Stripe.InvoicePaymentFailedEvent
) => {
  const invoice = event.data.object

  // Get subscription ID from invoice
  const subscriptionIdOrObject = (
    invoice as unknown as { subscription?: string | Stripe.Subscription }
  ).subscription
  const stripeSubscriptionId =
    typeof subscriptionIdOrObject === 'string'
      ? subscriptionIdOrObject
      : subscriptionIdOrObject?.id

  if (!stripeSubscriptionId) {
    // eslint-disable-next-line no-restricted-syntax
    console.warn(
      '[Stripe webhook] invoice.payment_failed missing subscription',
      { invoiceId: invoice.id }
    )
    return
  }

  // Find stripe_subscriptions record
  const stripeSubscription = await getStripeSubscriptionById(
    stripeSubscriptionId
  )

  if (!stripeSubscription) {
    // eslint-disable-next-line no-restricted-syntax
    console.warn(
      '[Stripe webhook] invoice.payment_failed stripe subscription not found',
      { stripeSubscriptionId, invoiceId: invoice.id }
    )
    return
  }

  const accountAddress = stripeSubscription.account_address.toLowerCase()

  // Update subscription status to reflect payment failure
  // Note: Stripe will retry payment attempts, so we don't immediately expire subscriptions
  // We could optionally mark subscription periods as 'cancelled' if payment fails multiple times
  // For now, we'll just log the failure - Stripe handles retries automatically
  try {
    // Optionally: Update subscription periods to 'cancelled' if this is a final failure
    // For now, we'll let Stripe handle retries and only update on subscription.deleted
    // This can be enhanced later to track payment failure count and handle accordingly

    // eslint-disable-next-line no-restricted-syntax
    console.warn('[Stripe webhook] Invoice payment failed', {
      invoiceId: invoice.id,
      stripeSubscriptionId,
      accountAddress,
      amount: invoice.amount_due / 100,
      currency: invoice.currency,
    })

    // TODO: Send notification to user about payment failure (optional)
    // This could be implemented later with email notifications
  } catch (error) {
    // eslint-disable-next-line no-restricted-syntax
    console.error(
      '[Stripe webhook] Failed to handle invoice payment failure',
      error
    )
    Sentry.captureException(error)
  }
}

export const handleSubscriptionTrialWillEnd = async (
  event: Stripe.CustomerSubscriptionTrialWillEndEvent
) => {
  // TODO: Optional - implement notification logic
  // eslint-disable-next-line no-restricted-syntax
  console.log('Subscription trial will end event received:', event.id)
  const subscription = event.data.object
  // eslint-disable-next-line no-restricted-syntax
  console.log('Subscription ID:', subscription.id)
}
