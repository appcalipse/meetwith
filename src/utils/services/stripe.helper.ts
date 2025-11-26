import { PaymentAccountStatus, PaymentProvider } from '@meta/PaymentAccount'
import { ICheckoutMetadata } from '@meta/Transactions'
import { PaymentStatus } from '@utils/constants/meeting-types'
import {
  confirmFiatTransaction,
  getPaymentAccountByProviderId,
  handleUpdateTransactionStatus,
  updatePaymentAccount,
} from '@utils/database'
import { StripeService } from '@utils/services/stripe.service'
import { NextApiRequest } from 'next'
import Stripe from 'stripe'

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
