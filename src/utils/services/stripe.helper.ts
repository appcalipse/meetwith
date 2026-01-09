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
  createStripeSubscription,
  createSubscriptionPeriod,
  createSubscriptionTransaction,
  findSubscriptionPeriodByPlanAndExpiry,
  getActiveSubscriptionPeriod,
  getBillingEmailAccountInfo,
  getBillingPlanById,
  getBillingPlanIdFromStripeProduct,
  getPaymentAccountByProviderId,
  getStripeSubscriptionById,
  getSubscriptionPeriodsByAccount,
  handleUpdateTransactionStatus,
  linkTransactionToStripeSubscription,
  updatePaymentAccount,
  updateStripeSubscription,
  updateSubscriptionPeriodStatus,
  updateSubscriptionPeriodTransaction,
} from '@utils/database'
import { StripeService } from '@utils/services/stripe.service'
import { addMonths, addYears } from 'date-fns'
import { NextApiRequest } from 'next'
import Stripe from 'stripe'

import {
  BillingEmailPlan,
  PaymentProvider as BillingPaymentProvider,
} from '@/types/Billing'
import { TablesInsert } from '@/types/Supabase'
import {
  sendSubscriptionCancelledEmailForAccount,
  sendSubscriptionConfirmationEmailForAccount,
} from '@/utils/email_helper'
import { EmailQueue } from '@/utils/workers/email.queue'

const emailQueue = new EmailQueue()

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
  const metadata = eventObject.metadata as ICheckoutMetadata
  if (metadata.environment !== process.env.NEXT_PUBLIC_ENV_CONFIG) {
    return
  }
  await confirmFiatTransaction(
    eventObject.id,
    metadata,
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

export const handleSubscriptionCreated = async (
  event: Stripe.CustomerSubscriptionCreatedEvent
) => {
  const subscription = event.data.object

  const accountAddress = (
    subscription.metadata?.account_address as string | undefined
  )?.toLowerCase()
  const billingPlanId =
    (subscription.metadata?.billing_plan_id as string | undefined) || null
  const handle =
    (subscription.metadata?.handle as string | undefined) || undefined

  if (!accountAddress || !billingPlanId) {
    return
  }

  const stripeSubscriptionId = subscription.id
  const stripeCustomerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id

  if (!stripeCustomerId) {
    return
  }

  // Create stripe_subscriptions record (idempotent)
  // NOTE: We do NOT create transaction or subscription period here because:
  // 1. customer.subscription.created fires when subscription object is created, but payment may not have succeeded yet
  // 2. invoice.payment_succeeded with billing_reason: 'subscription_create' is the authoritative event for payment confirmation
  // 3. The transaction and subscription period should be created in handleInvoicePaymentSucceeded
  try {
    await createStripeSubscription(
      accountAddress,
      stripeSubscriptionId,
      stripeCustomerId,
      billingPlanId
    )
  } catch (error) {
    Sentry.captureException(error)
  }

  // If this subscription starts with a trial, create a trial subscription period now
  // so the user has access during the trial. When the first paid invoice succeeds,
  // a new paid period will be created via invoice.payment_succeeded.
  const trialEnd = subscription.trial_end
  const isTrialingNow =
    subscription.status === 'trialing' &&
    trialEnd !== null &&
    trialEnd !== undefined &&
    trialEnd * 1000 > Date.now()

  if (isTrialingNow) {
    try {
      const createdPeriod = await createSubscriptionPeriod(
        accountAddress,
        billingPlanId,
        'active',
        new Date(trialEnd * 1000).toISOString(),
        null,
        handle
      )

      // Send trial started email (non-blocking, queued)
      try {
        const billingPlan = await getBillingPlanById(billingPlanId)
        if (billingPlan) {
          const emailPlan: BillingEmailPlan = {
            id: billingPlan.id,
            name: billingPlan.name,
            price: billingPlan.price,
            billing_cycle: billingPlan.billing_cycle,
          }

          emailQueue.add(async () => {
            try {
              await sendSubscriptionConfirmationEmailForAccount(
                accountAddress,
                emailPlan,
                createdPeriod.registered_at,
                createdPeriod.expiry_time,
                BillingPaymentProvider.STRIPE,
                undefined,
                true // isTrial
              )
              return true
            } catch (error) {
              Sentry.captureException(error)
              return false
            }
          })
        }
      } catch (error) {
        Sentry.captureException(error)
      }
    } catch (error) {
      Sentry.captureException(error)
    }
  }
}

export const handleSubscriptionUpdated = async (
  event: Stripe.CustomerSubscriptionUpdatedEvent
) => {
  const subscription = event.data.object
  const stripeSubscriptionId = subscription.id
  const previousAttributes = event.data.previous_attributes || {}

  // Find stripe_subscriptions record
  const stripeSubscription = await getStripeSubscriptionById(
    stripeSubscriptionId
  )

  if (!stripeSubscription) {
    return
  }

  const accountAddress = stripeSubscription.account_address.toLowerCase()

  let actualCancelAt: number | null | undefined = subscription.cancel_at
  try {
    const stripe = new StripeService()
    const fullSubscription = await stripe.subscriptions.retrieve(
      stripeSubscriptionId
    )
    actualCancelAt = fullSubscription.cancel_at
  } catch (error) {
    Sentry.captureException(error)
  }

  // Handle cancellation detection
  // Using flexible billing mode: cancel_at (timestamp) indicates cancellation
  const cancelAt = subscription.cancel_at
  const previousCancelAt = previousAttributes.cancel_at

  // Check if "cancel_at" timestamp was just set (changed from null to a timestamp)
  const isJustCancelled =
    cancelAt !== null &&
    cancelAt !== undefined &&
    (previousCancelAt === null || previousCancelAt === undefined)

  // Check if cancellation was just removed (cancel_at changed from timestamp to null)
  const isJustReactivated =
    cancelAt === null &&
    previousCancelAt !== null &&
    previousCancelAt !== undefined

  // Determine if subscription should be cancelled
  const shouldCancel =
    (cancelAt !== null && cancelAt !== undefined) ||
    (actualCancelAt !== null && actualCancelAt !== undefined) ||
    isJustCancelled

  // Handle cancellation (cancel_at timestamp set)
  if (shouldCancel) {
    // Update all active subscription periods to 'cancelled' status
    try {
      const allSubscriptions = await getSubscriptionPeriodsByAccount(
        accountAddress
      )

      // Update all active subscriptions that haven't expired yet
      const now = new Date()
      let mostRecentPeriod: (typeof allSubscriptions)[0] | null = null
      for (const sub of allSubscriptions) {
        if (
          sub.status === 'active' &&
          new Date(sub.expiry_time) > now &&
          sub.billing_plan_id // Only update billing subscriptions
        ) {
          await updateSubscriptionPeriodStatus(sub.id, 'cancelled')
        }

        // Find the most recent active/cancelled period (by expiry_time) for email
        // Include both active and cancelled periods that haven't expired
        if (
          new Date(sub.expiry_time) > now &&
          sub.billing_plan_id &&
          (!mostRecentPeriod ||
            new Date(sub.expiry_time) > new Date(mostRecentPeriod.expiry_time))
        ) {
          mostRecentPeriod = sub
        }
      }

      // Send subscription cancellation email (non-blocking, queued)
      if (mostRecentPeriod && mostRecentPeriod.billing_plan_id) {
        const billingPlanId = mostRecentPeriod.billing_plan_id
        try {
          // Get billing plan details
          const billingPlan = await getBillingPlanById(billingPlanId)

          if (billingPlan) {
            const emailPlan: BillingEmailPlan = {
              id: billingPlan.id,
              name: billingPlan.name,
              price: billingPlan.price,
              billing_cycle: billingPlan.billing_cycle,
            }

            emailQueue.add(async () => {
              try {
                await sendSubscriptionCancelledEmailForAccount(
                  accountAddress,
                  emailPlan,
                  mostRecentPeriod!.registered_at,
                  mostRecentPeriod!.expiry_time,
                  BillingPaymentProvider.STRIPE
                )
                return true
              } catch (error) {
                Sentry.captureException(error)
                return false
              }
            })
          }
        } catch (error) {
          Sentry.captureException(error)
        }
      }
    } catch (error) {
      Sentry.captureException(error)
    }
  } else if (isJustReactivated) {
    // Subscription was reactivated (cancel_at timestamp was removed)
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
        // Update stripe_subscriptions record with new plan
        await updateStripeSubscription(stripeSubscriptionId, {
          billing_plan_id: newBillingPlanId,
        })

        // Create new subscription period for plan change
        try {
          const newBillingPlan = await getBillingPlanById(newBillingPlanId)
          if (!newBillingPlan) {
            return
          }

          // Fetch full subscription from Stripe API to get current_period_end
          // Note: For flexible billing mode subscriptions, current_period_end is in subscription.items.data[0]
          let currentPeriodEnd: number | undefined
          try {
            const stripe = new StripeService()
            const fullSubscription = await stripe.subscriptions.retrieve(
              stripeSubscriptionId
            )

            // For flexible billing mode, period info is in items.data[0]
            // For standard subscriptions, it's at the top level
            const subscriptionItems = fullSubscription.items?.data
            if (subscriptionItems && subscriptionItems.length > 0) {
              const firstItem = subscriptionItems[0] as unknown as {
                current_period_end?: number
                current_period_start?: number
              }
              currentPeriodEnd = firstItem.current_period_end
            }

            // Fallback: Try top-level (for standard subscriptions)
            if (!currentPeriodEnd) {
              const subscriptionWithPeriod = fullSubscription as unknown as {
                current_period_end?: number
                current_period_start?: number
              }
              currentPeriodEnd = subscriptionWithPeriod.current_period_end
            }

            // If still missing, calculate from current_period_start + billing cycle
            if (!currentPeriodEnd) {
              const subscriptionItems = fullSubscription.items?.data
              let periodStart: number | undefined

              if (subscriptionItems && subscriptionItems.length > 0) {
                const firstItem = subscriptionItems[0] as unknown as {
                  current_period_start?: number
                }
                periodStart = firstItem.current_period_start
              }

              if (!periodStart) {
                const subscriptionWithPeriod = fullSubscription as unknown as {
                  current_period_start?: number
                }
                periodStart = subscriptionWithPeriod.current_period_start
              }

              if (periodStart) {
                const periodStartDate = new Date(periodStart * 1000)
                if (newBillingPlan.billing_cycle === 'monthly') {
                  currentPeriodEnd = Math.floor(
                    addMonths(periodStartDate, 1).getTime() / 1000
                  )
                } else {
                  // yearly
                  currentPeriodEnd = Math.floor(
                    addYears(periodStartDate, 1).getTime() / 1000
                  )
                }
              }
            }
          } catch (error) {
            Sentry.captureException(error)
            return
          }

          if (!currentPeriodEnd || typeof currentPeriodEnd !== 'number') {
            Sentry.captureException(
              new Error(
                `Stripe subscription ${stripeSubscriptionId} missing current_period_end after API fetch`
              )
            )
            return
          }

          const newExpiryTime = new Date(currentPeriodEnd * 1000).toISOString()

          // Validate the date is valid
          if (isNaN(new Date(newExpiryTime).getTime())) {
            Sentry.captureException(
              new Error(
                `Invalid expiry time for subscription ${stripeSubscriptionId}: ${newExpiryTime}`
              )
            )
            return
          }

          // Get existing active subscription to check if we need to mark it as expired
          const existingSubscription = await getActiveSubscriptionPeriod(
            accountAddress
          )

          // Mark existing subscription periods as expired if they're before the new expiry
          if (existingSubscription) {
            const existingExpiry = new Date(existingSubscription.expiry_time)
            const newExpiry = new Date(newExpiryTime)

            // If the new expiry is later, mark old periods that end before it as expired
            if (newExpiry > existingExpiry) {
              const allSubscriptions = await getSubscriptionPeriodsByAccount(
                accountAddress
              )
              const now = new Date()

              for (const sub of allSubscriptions) {
                if (
                  new Date(sub.expiry_time) < newExpiry &&
                  new Date(sub.expiry_time) > now &&
                  sub.billing_plan_id
                ) {
                  await updateSubscriptionPeriodStatus(sub.id, 'expired')
                }
              }
            }
          }
        } catch (error) {
          Sentry.captureException(error)
        }
      } else if (newBillingPlanId === null) {
        // Product ID not found in our billing_plan_providers table
        Sentry.captureException(
          new Error(
            `Stripe product ID ${stripeProductId} not found in billing_plan_providers`
          )
        )
      }
    } else {
      // No subscription items or price/product information available
      // This shouldn't happen in normal operation, but we handle it gracefully
      // Skip plan change detection for this webhook event
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
    Sentry.captureException(error)
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
        new Date(sub.expiry_time) > now &&
        sub.billing_plan_id // Only update billing subscriptions
      ) {
        await updateSubscriptionPeriodStatus(sub.id, 'expired')
      }
    }
  } catch (error) {
    Sentry.captureException(error)
  }
}

export const handleInvoicePaymentSucceeded = async (
  event: Stripe.InvoicePaymentSucceededEvent
) => {
  const invoice = event.data.object

  // Get subscription ID from invoice
  const invoiceData = invoice as unknown as {
    subscription?: string | Stripe.Subscription | null
    lines?: {
      data?: Array<{
        subscription?: string | Stripe.Subscription | null
      }>
    }
  }

  let subscriptionIdOrObject = invoiceData.subscription

  // If subscription is not at top level, try to get it from invoice lines
  if (
    !subscriptionIdOrObject &&
    invoiceData.lines?.data &&
    invoiceData.lines.data.length > 0
  ) {
    subscriptionIdOrObject = invoiceData.lines.data[0].subscription
  }

  let stripeSubscriptionId =
    typeof subscriptionIdOrObject === 'string'
      ? subscriptionIdOrObject
      : subscriptionIdOrObject?.id

  if (!stripeSubscriptionId) {
    // Try fetching full invoice from Stripe API with expand to retrieve subscription
    try {
      const stripe = new StripeService()
      const fullInvoice = await stripe.invoices.retrieve(invoice.id, {
        expand: ['subscription', 'lines.data.subscription'],
      })

      // Attempt extraction again after expand
      const fullInvoiceData = fullInvoice as unknown as {
        subscription?: string | Stripe.Subscription | null
        lines?: {
          data?: Array<{
            subscription?: string | Stripe.Subscription | null
          }>
        }
      }

      let fullSubscriptionIdOrObject = fullInvoiceData.subscription
      if (
        !fullSubscriptionIdOrObject &&
        fullInvoiceData.lines?.data &&
        fullInvoiceData.lines.data.length > 0
      ) {
        fullSubscriptionIdOrObject = fullInvoiceData.lines.data[0].subscription
      }

      stripeSubscriptionId =
        typeof fullSubscriptionIdOrObject === 'string'
          ? fullSubscriptionIdOrObject
          : fullSubscriptionIdOrObject?.id
    } catch (error) {
      Sentry.captureException(error)
    }
  }

  // Final fallback: For subscription_update invoices, the subscription field might not be included
  // Use customer ID to find the active subscription from Stripe
  if (!stripeSubscriptionId) {
    const customerId = (invoice as unknown as { customer?: string }).customer

    if (customerId && typeof customerId === 'string') {
      try {
        // Get customer's active subscriptions from Stripe
        const stripe = new StripeService()
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: 'active',
          limit: 1,
        })

        if (subscriptions.data && subscriptions.data.length > 0) {
          stripeSubscriptionId = subscriptions.data[0].id
        }
      } catch (error) {
        Sentry.captureException(error)
      }
    }
  }

  if (!stripeSubscriptionId) {
    return
  }

  // Find stripe_subscriptions record by stripe_subscription_id
  const stripeSubscription = await getStripeSubscriptionById(
    stripeSubscriptionId
  )

  if (!stripeSubscription) {
    return
  }

  const accountAddress = stripeSubscription.account_address.toLowerCase()
  const billingPlanId = stripeSubscription.billing_plan_id

  if (!billingPlanId) {
    return
  }

  // Get billing plan to determine billing cycle
  const billingPlan = await getBillingPlanById(billingPlanId)
  if (!billingPlan) {
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
    Sentry.captureException(error)
    // continue; not fatal for subsequent steps
  }

  // Check invoice billing_reason to determine the flow
  const invoiceBillingReason = (
    invoice as unknown as { billing_reason?: string }
  ).billing_reason
  const invoicePeriodEnd = new Date(invoice.period_end * 1000).toISOString()

  // Handle subscription_create invoices: Create transaction and subscription period
  // This is the authoritative event for new subscription payment confirmation
  // NOTE: handleSubscriptionCreated only creates the stripe_subscriptions record,
  // so we always create the transaction and subscription period here
  if (invoiceBillingReason === 'subscription_create') {
    // For subscription_create, invoice.period_end might be the same as period_start
    // We need to get the actual subscription's current_period_end from Stripe API
    let calculatedExpiryTime: Date

    let handle: string | undefined

    try {
      const stripe = new StripeService()
      const fullSubscription = await stripe.subscriptions.retrieve(
        stripeSubscriptionId
      )

      handle =
        (fullSubscription.metadata?.handle as string | undefined) || undefined

      // Get current_period_end from subscription (not invoice)
      // For flexible billing mode, period info is in items.data[0]
      // For standard subscriptions, it's at the top level
      const subscriptionItems = fullSubscription.items?.data
      let currentPeriodEnd: number | undefined

      if (subscriptionItems && subscriptionItems.length > 0) {
        const firstItem = subscriptionItems[0] as unknown as {
          current_period_end?: number
          current_period_start?: number
        }
        currentPeriodEnd = firstItem.current_period_end
      }

      // Fallback: Try top-level (for standard subscriptions)
      if (!currentPeriodEnd) {
        const subscriptionWithPeriod = fullSubscription as unknown as {
          current_period_end?: number
          current_period_start?: number
        }
        currentPeriodEnd = subscriptionWithPeriod.current_period_end
      }

      // If still missing, calculate from billing plan
      if (!currentPeriodEnd || typeof currentPeriodEnd !== 'number') {
        const now = new Date()
        if (billingPlan.billing_cycle === 'monthly') {
          calculatedExpiryTime = addMonths(now, 1)
        } else {
          calculatedExpiryTime = addYears(now, 1)
        }
      } else {
        calculatedExpiryTime = new Date(currentPeriodEnd * 1000)
      }
    } catch (error) {
      Sentry.captureException(error)

      // Fallback: Calculate from billing plan
      const now = new Date()
      if (billingPlan.billing_cycle === 'monthly') {
        calculatedExpiryTime = addMonths(now, 1)
      } else {
        calculatedExpiryTime = addYears(now, 1)
      }
    }

    // Create subscription period with invoice transaction
    try {
      const createdPeriod = await createSubscriptionPeriod(
        accountAddress,
        billingPlanId,
        'active',
        calculatedExpiryTime.toISOString(),
        transactionId,
        handle
      )

      // Send subscription confirmation email (non-blocking, queued)
      const emailPlan: BillingEmailPlan = {
        id: billingPlan.id,
        name: billingPlan.name,
        price: billingPlan.price,
        billing_cycle: billingPlan.billing_cycle,
      }

      emailQueue.add(async () => {
        try {
          await sendSubscriptionConfirmationEmailForAccount(
            accountAddress,
            emailPlan,
            createdPeriod.registered_at,
            createdPeriod.expiry_time,
            BillingPaymentProvider.STRIPE,
            { amount: amountPaid, currency: currency || 'USD' }
          )
          return true
        } catch (error) {
          Sentry.captureException(error)
          return false
        }
      })

      return // Don't proceed to renewal flow
    } catch (error) {
      Sentry.captureException(error)
      return // Don't create duplicate period
    }
  }

  // Handle subscription_update invoices (plan changes): Link transaction to existing subscription period
  // created during handleSubscriptionUpdated
  if (invoiceBillingReason === 'subscription_update') {
    // Check if there's an existing subscription period with this billing_plan_id and expiry_time but no transaction_id
    const existingPeriodForPlanChange =
      await findSubscriptionPeriodByPlanAndExpiry(
        accountAddress,
        billingPlanId,
        invoicePeriodEnd
      )

    if (existingPeriodForPlanChange) {
      // This is a plan change invoice - link the transaction to the existing subscription period
      try {
        await updateSubscriptionPeriodTransaction(
          existingPeriodForPlanChange.id,
          transactionId
        )

        // Send subscription confirmation email for plan update (non-blocking, queued)
        const emailPlan: BillingEmailPlan = {
          id: billingPlan.id,
          name: billingPlan.name,
          price: billingPlan.price,
          billing_cycle: billingPlan.billing_cycle,
        }

        emailQueue.add(async () => {
          try {
            await sendSubscriptionConfirmationEmailForAccount(
              accountAddress,
              emailPlan,
              existingPeriodForPlanChange.registered_at,
              existingPeriodForPlanChange.expiry_time,
              BillingPaymentProvider.STRIPE,
              { amount: amountPaid, currency: currency || 'USD' }
            )
            return true
          } catch (error) {
            Sentry.captureException(error)
            return false
          }
        })

        return // Don't create a new subscription period
      } catch (error) {
        Sentry.captureException(error)
      }
    }
  }

  // For subscription_update (plan change) without a pre-created period: derive expiry from subscription current_period_end
  const deriveCurrentPeriodEnd = (
    subscriptionObj?: Stripe.Subscription | null
  ): number | undefined => {
    if (!subscriptionObj) {
      return undefined
    }

    const topLevel =
      subscriptionObj?.pending_update?.subscription_items
        ?.sort((a, b) => a.current_period_end - b.current_period_end)
        .at(-1)?.current_period_end ||
      subscriptionObj?.pending_update?.expires_at
    if (typeof topLevel === 'number') {
      return topLevel
    }

    const items = subscriptionObj?.items?.data
    if (Array.isArray(items) && items.length > 0) {
      const first = items[0]
      if (typeof first?.current_period_end === 'number') {
        return first.current_period_end
      }
    }

    return undefined
  }

  if (invoiceBillingReason === 'subscription_update') {
    try {
      let fullSubscription: Stripe.Subscription | null = null

      // Try to use expanded subscription on invoice first
      const invoiceSubscription =
        invoice.parent?.subscription_details?.subscription
      if (invoiceSubscription && typeof invoiceSubscription !== 'string') {
        fullSubscription = invoiceSubscription as Stripe.Subscription
      }

      if (!fullSubscription && stripeSubscriptionId) {
        const stripe = new StripeService()
        fullSubscription = await stripe.subscriptions.retrieve(
          stripeSubscriptionId
        )
      }

      const currentPeriodEnd = deriveCurrentPeriodEnd(fullSubscription)

      if (currentPeriodEnd && typeof currentPeriodEnd === 'number') {
        const calculatedExpiryTime = new Date(currentPeriodEnd * 1000)
        const createdPeriod = await createSubscriptionPeriod(
          accountAddress,
          billingPlanId,
          'active',
          calculatedExpiryTime.toISOString(),
          transactionId
        )

        // Send subscription confirmation email for plan update (non-blocking, queued)
        const emailPlan: BillingEmailPlan = {
          id: billingPlan.id,
          name: billingPlan.name,
          price: billingPlan.price,
          billing_cycle: billingPlan.billing_cycle,
        }

        emailQueue.add(async () => {
          try {
            await sendSubscriptionConfirmationEmailForAccount(
              accountAddress,
              emailPlan,
              createdPeriod.registered_at,
              createdPeriod.expiry_time,
              BillingPaymentProvider.STRIPE,
              { amount: amountPaid, currency: currency || 'USD' }
            )
            return true
          } catch (error) {
            Sentry.captureException(error)
            return false
          }
        })

        return
      }
    } catch (error) {
      Sentry.captureException(error)
    }
  }

  // For subscription_cycle (renewals) or fallback: Create new subscription period
  let calculatedExpiryTime: Date
  let existingDomain: string | null | undefined

  if (invoiceBillingReason === 'subscription_cycle') {
    // Renewal flow - use extension logic
    const existingSubscription = await getActiveSubscriptionPeriod(
      accountAddress
    )

    if (existingSubscription) {
      // Extension: Add duration to existing farthest expiry
      const existingExpiry = new Date(existingSubscription.expiry_time)
      if (billingPlan.billing_cycle === 'monthly') {
        calculatedExpiryTime = addMonths(existingExpiry, 1)
      } else {
        // yearly
        calculatedExpiryTime = addYears(existingExpiry, 1)
      }
      existingDomain = existingSubscription.domain
    } else {
      // No existing subscription - use invoice period_end
      calculatedExpiryTime = new Date(invoice.period_end * 1000)
    }
  } else {
    // subscription_create (fallback) or other - use invoice period_end (authoritative from Stripe)
    calculatedExpiryTime = new Date(invoice.period_end * 1000)
  }

  // Create new subscription period with calculated expiry_time
  try {
    await createSubscriptionPeriod(
      accountAddress,
      billingPlanId,
      'active',
      calculatedExpiryTime.toISOString(),
      transactionId,
      existingDomain
    )
  } catch (error) {
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
    return
  }

  // Find stripe_subscriptions record
  const stripeSubscription = await getStripeSubscriptionById(
    stripeSubscriptionId
  )

  if (!stripeSubscription) {
    return
  }

  // Note: Stripe automatically sends payment failure emails to customers when invoice.payment_failed events occur.
  // Stripe will also automatically retry payment attempts, so we don't immediately expire subscriptions.
  // We handle this webhook event primarily for logging/monitoring purposes, not for sending duplicate notifications.
  Sentry.captureException(new Error('Stripe invoice payment failed'))
}
