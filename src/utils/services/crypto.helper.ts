import * as Sentry from '@sentry/nextjs'
import { addMonths, addYears } from 'date-fns'
import { WebhookPayload } from 'thirdweb/dist/types/bridge'
import { formatUnits } from 'viem'

import {
  BillingEmailPlan,
  PaymentProvider as BillingPaymentProvider,
  SubscriptionType,
} from '@/types/Billing'
import { getSupportedChainFromId } from '@/types/chains'
import { TablesInsert } from '@/types/Supabase'
import {
  OnchainFeeData,
  OnchainTransactionData,
  OnrampTransactionData,
  TransactionData,
} from '@/types/Thirdweb'
import { ISubscriptionData } from '@/types/Transactions'
import {
  PaymentDirection,
  PaymentStatus,
  PaymentType,
  TokenType,
} from '@/utils/constants/meeting-types'
import {
  createSubscriptionPeriod,
  createSubscriptionTransaction,
  getActiveSubscriptionPeriod,
  getBillingPlanById,
  getStripeSubscriptionByAccount,
  getSubscriptionPeriodsByAccount,
  updateSubscriptionPeriodStatus,
} from '@/utils/database'
import { sendSubscriptionConfirmationEmailForAccount } from '@/utils/email_helper'
import { EmailQueue } from '@/utils/workers/email.queue'

const emailQueue = new EmailQueue()
import {
  BillingPlanNotFoundError,
  MissingSubscriptionMetadataError,
} from '@/utils/errors'
import { Currency } from '@/utils/services/onramp.money'

/**
 * Handle crypto subscription payment from Thirdweb webhook
 * Creates transaction and subscription period for crypto subscriptions
 */
export const handleCryptoSubscriptionPayment = async (
  payload: WebhookPayload,
  subscriptionData: ISubscriptionData
) => {
  const {
    billing_plan_id,
    subscription_type,
    account_address,
    subscription_channel,
  } = subscriptionData

  // Validate required subscription metadata
  if (!billing_plan_id || !account_address) {
    const error = new MissingSubscriptionMetadataError()
    Sentry.captureException(error, {
      extra: { subscriptionData, payloadType: payload.type },
    })
    throw error
  }

  // Get billing plan details
  const billingPlan = await getBillingPlanById(billing_plan_id)
  if (!billingPlan) {
    const error = new BillingPlanNotFoundError(billing_plan_id)
    Sentry.captureException(error, {
      extra: { billing_plan_id },
    })
    throw error
  }

  // Extract transaction details from payload based on type
  const isOnramp = payload.type === 'pay.onramp-transaction'

  // Type-safe extraction based on payload type
  let transactionData: TransactionData

  if (isOnramp) {
    const onrampData = payload.data as OnrampTransactionData
    transactionData = {
      chainId: onrampData.token.chainId,
      transactionHash: onrampData.transactionHash,
      amount: onrampData.amount,
      decimals: onrampData.token.decimals,
      tokenAddress: onrampData.token.address,
      fiatEquivalent: onrampData.currencyAmount,
      providerReferenceId: onrampData.id,
    }
  } else {
    const onchainData = payload.data as OnchainTransactionData

    // Find transaction hash for onchain transactions
    let transactionHash: string | null = null
    if (onchainData.transactions) {
      const matchingTransaction = onchainData.transactions
        .filter(val => val.chainId === onchainData.destinationToken.chainId)
        .at(-1)
      transactionHash =
        matchingTransaction?.transactionHash ||
        onchainData.transactions.at(-1)?.transactionHash ||
        null
    }

    if (!transactionHash) {
      const error = new Error('Transaction hash not found in payload')
      Sentry.captureException(error, {
        extra: { payloadType: payload.type },
      })
      throw error
    }

    const parsedAmount = parseFloat(
      formatUnits(
        onchainData.destinationAmount,
        onchainData.destinationToken.decimals
      )
    )

    transactionData = {
      chainId: onchainData.destinationToken.chainId,
      transactionHash,
      amount: onchainData.destinationAmount,
      decimals: onchainData.destinationToken.decimals,
      tokenAddress: onchainData.destinationToken.address,
      fiatEquivalent: onchainData.destinationToken.priceUsd * parsedAmount,
      providerReferenceId: onchainData.transactionId || onchainData.paymentId,
    }
  }

  // Validate chain
  const chainInfo = getSupportedChainFromId(transactionData.chainId)
  if (!chainInfo) {
    const error = new Error(`Chain not found: ${transactionData.chainId}`)
    Sentry.captureException(error, {
      extra: { chainId: transactionData.chainId },
    })
    throw error
  }

  // Parse amount
  const parsedAmount = parseFloat(
    formatUnits(transactionData.amount, transactionData.decimals)
  )

  // Calculate fee breakdown (for onchain transactions only)
  let fee_breakdown: Record<string, number> | undefined
  let total_fee = 0

  if (!isOnramp) {
    const onchainData = payload.data as OnchainFeeData

    if (onchainData.originToken && onchainData.originAmount) {
      const originAmountParsed = parseFloat(
        formatUnits(onchainData.originAmount, onchainData.originToken.decimals)
      )
      fee_breakdown = {
        network:
          onchainData.originToken.priceUsd * originAmountParsed -
          transactionData.fiatEquivalent,
        developer:
          (transactionData.fiatEquivalent *
            (onchainData.developerFeeBps || 0)) /
          100 ** 2,
      }
      total_fee = Object.values(fee_breakdown).reduce(
        (acc, fee) => acc + fee,
        0
      )
    }
  }

  // Extension Logic
  const existingSubscription = await getActiveSubscriptionPeriod(
    account_address.toLowerCase()
  )
  let calculatedExpiryTime: Date

  if (
    existingSubscription &&
    subscription_type === SubscriptionType.EXTENSION
  ) {
    // Extension: Add duration to existing farthest expiry
    const existingExpiry = new Date(existingSubscription.expiry_time)
    if (billingPlan.billing_cycle === 'monthly') {
      calculatedExpiryTime = addMonths(existingExpiry, 1)
    } else {
      // yearly
      calculatedExpiryTime = addYears(existingExpiry, 1)
    }
  } else {
    // First-time subscription: Add duration from now
    const now = new Date()
    if (billingPlan.billing_cycle === 'monthly') {
      calculatedExpiryTime = addMonths(now, 1)
    } else {
      // yearly
      calculatedExpiryTime = addYears(now, 1)
    }
  }

  // Create transaction payload
  const transactionPayload: TablesInsert<'transactions'> = {
    method: PaymentType.CRYPTO,
    transaction_hash: transactionData.transactionHash.toLowerCase(),
    amount: parsedAmount,
    direction: PaymentDirection.CREDIT,
    chain_id: chainInfo.id,
    token_address: transactionData.tokenAddress,
    fiat_equivalent: transactionData.fiatEquivalent,
    meeting_type_id: null,
    initiator_address: account_address.toLowerCase(),
    status: PaymentStatus.COMPLETED,
    token_type: TokenType.ERC20,
    confirmed_at: new Date().toISOString(),
    provider_reference_id: transactionData.providerReferenceId,
    currency: Currency.USD,
    total_fee: total_fee || 0,
    fee_breakdown: fee_breakdown
      ? {
          gas_used: '0',
          fee_in_usd: total_fee,
          ...fee_breakdown,
        }
      : {
          gas_used: '0',
          fee_in_usd: 0,
        },
    metadata: {
      subscription_type,
      billing_plan_id,
      subscription_channel,
    },
  }

  // Create transaction
  let transaction
  try {
    transaction = await createSubscriptionTransaction(transactionPayload)
  } catch (error) {
    Sentry.captureException(error, {
      extra: {
        account_address,
        billing_plan_id,
        transaction_hash: transactionData.transactionHash,
      },
    })
    throw error
  }

  // Create subscription period
  let createdPeriod
  try {
    createdPeriod = await createSubscriptionPeriod(
      account_address.toLowerCase(),
      billing_plan_id,
      'active',
      calculatedExpiryTime.toISOString(),
      transaction.id
    )
  } catch (error) {
    Sentry.captureException(error, {
      extra: {
        account_address,
        billing_plan_id,
        transaction_id: transaction.id,
        expiry_time: calculatedExpiryTime.toISOString(),
      },
    })
    throw error
  }

  // Send subscription confirmation email
  const emailPlan: BillingEmailPlan = {
    id: billingPlan.id,
    name: billingPlan.name,
    price: billingPlan.price,
    billing_cycle: billingPlan.billing_cycle,
  }

  // Send subscription confirmation email (non-blocking, queued)
  emailQueue.add(async () => {
    try {
      await sendSubscriptionConfirmationEmailForAccount(
        account_address.toLowerCase(),
        emailPlan,
        createdPeriod.registered_at,
        createdPeriod.expiry_time,
        BillingPaymentProvider.CRYPTO,
        {
          amount: transactionData.fiatEquivalent,
          currency: 'USD',
        }
      )
      return true
    } catch (error) {
      Sentry.captureException(error)
      return false
    }
  })

  return {
    transaction,
    subscription_type,
    billing_plan_id,
    expiry_time: calculatedExpiryTime.toISOString(),
  }
}

export const cancelCryptoSubscription = async (
  accountAddress: string
): Promise<void> => {
  try {
    // Fetch all subscription periods and Stripe subscription in parallel
    const [allSubscriptions, stripeSubscription] = await Promise.all([
      getSubscriptionPeriodsByAccount(accountAddress.toLowerCase()),
      getStripeSubscriptionByAccount(accountAddress.toLowerCase()),
    ])

    const now = new Date()

    // Update all active crypto subscription periods to 'cancelled'
    for (const sub of allSubscriptions) {
      // Only update billing subscriptions (has billing_plan_id)
      if (!sub.billing_plan_id) {
        continue
      }

      // Only update active subscriptions that haven't expired yet
      if (sub.status === 'active' && new Date(sub.expiry_time) > now) {
        // Check if this is a Stripe subscription
        const isStripeSubscription =
          stripeSubscription &&
          stripeSubscription.billing_plan_id === sub.billing_plan_id &&
          stripeSubscription.account_address.toLowerCase() ===
            accountAddress.toLowerCase()

        // Only cancel if it's NOT a Stripe subscription
        if (!isStripeSubscription) {
          await updateSubscriptionPeriodStatus(sub.id, 'cancelled')
        }
      }
    }
  } catch (error) {
    Sentry.captureException(error, {
      extra: {
        account_address: accountAddress,
      },
    })
    throw error
  }
}
