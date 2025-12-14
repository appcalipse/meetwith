import * as Sentry from '@sentry/nextjs'
import { addMonths, addYears } from 'date-fns'
import { WebhookPayload } from 'thirdweb/dist/types/bridge'
import { formatUnits } from 'viem'

import { getSupportedChainFromId } from '@/types/chains'
import { TablesInsert } from '@/types/Supabase'
import {
  OnchainFeeData,
  OnchainTransactionData,
  OnrampTransactionData,
  TransactionData,
} from '@/types/Thirdweb'
import { IPurchaseData } from '@/types/Transactions'
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
} from '@/utils/database'
import { Currency } from '@/utils/services/onramp.money'

/**
 * Handle crypto subscription payment from Thirdweb webhook
 * Creates transaction and subscription period for crypto subscriptions
 */
export const handleCryptoSubscriptionPayment = async (
  payload: WebhookPayload,
  purchaseData: IPurchaseData
) => {
  const {
    billing_plan_id,
    subscription_type,
    account_address,
    message_channel,
  } = purchaseData

  // Validate required subscription metadata
  if (!billing_plan_id || !account_address) {
    const error = new Error(
      'Missing required subscription metadata: billing_plan_id or account_address'
    )
    Sentry.captureException(error, {
      extra: { purchaseData, payloadType: payload.type },
    })
    throw error
  }

  // Get billing plan details
  const billingPlan = await getBillingPlanById(billing_plan_id)
  if (!billingPlan) {
    const error = new Error(`Billing plan not found: ${billing_plan_id}`)
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

  if (existingSubscription && subscription_type === 'extension') {
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
      message_channel,
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
  try {
    await createSubscriptionPeriod(
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

  return {
    transaction,
    subscription_type,
    billing_plan_id,
    expiry_time: calculatedExpiryTime.toISOString(),
  }
}
