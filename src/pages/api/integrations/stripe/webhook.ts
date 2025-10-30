import { PaymentAccountStatus, PaymentProvider } from '@meta/PaymentAccount'
import * as Sentry from '@sentry/nextjs'
import { StripeService } from '@utils/services/stripe.service'
import { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { ICheckoutMetadata } from '@/types/Transactions'
import { PaymentStatus } from '@/utils/constants/meeting-types'
import {
  confirmFiatTransaction,
  getPaymentAccountByProviderId,
  handleUpdateTransactionStatus,
  updatePaymentAccount,
} from '@/utils/database'
import { extractQuery } from '@/utils/generic_utils'
const getRawBody = async (req: NextApiRequest): Promise<Buffer> => {
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

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const sig = extractQuery<string>(req.headers, 'stripe-signature')
      if (!sig) {
        return res.status(400).send('Missing stripe signature')
      }
      const rawBody = await getRawBody(req)
      const stripe = new StripeService()
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
      let event: Stripe.Event
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret)
      } catch (err) {
        console.error('Error verifying webhook signature:', err)
        if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
          return res.status(400).send(`Webhook Error: ${err.message}`)
        } else {
          return res.status(400).send('Webhook Error')
        }
      }
      switch (event.type) {
        case 'charge.succeeded':
          await handleChargeSucceeded(event)
          break
        case 'checkout.session.expired':
        case 'charge.failed':
          await handleChargeFailed(event)
          break
        case 'account.updated':
          await handleAccountUpdate(event)
          break
        default:
          // eslint-disable-next-line no-restricted-syntax
          console.log(`Unhandled event type: ${event.type}`)
      }
      return res.status(200).json({
        success: true,
      })
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
      return res.status(500).send('An unexpected error occurred.')
    }
  }
  // Handle all other HTTP methods
  res.setHeader('Allow', 'POST')
  return res.status(404).send('Not found')
}

const handleChargeSucceeded = async (event: Stripe.ChargeSucceededEvent) => {
  const eventObject = event.data.object
  await confirmFiatTransaction(
    eventObject.id,
    eventObject.metadata as ICheckoutMetadata,
    (eventObject.application_fee_amount || 0) / 100,
    {
      provider: PaymentProvider.STRIPE,
      destination: eventObject.transfer_data?.destination || '',
      receipt_url: eventObject.receipt_url || '',
      payment_method: `${eventObject.payment_method_details?.type || ''}`,
      currency: eventObject.currency,
      amount_received: eventObject.amount / 100,
    }
  )
}
const handleChargeFailed = async (
  event: Stripe.ChargeFailedEvent | Stripe.CheckoutSessionExpiredEvent
) => {
  const eventObject = event.data.object
  await handleUpdateTransactionStatus(eventObject.id, PaymentStatus.FAILED)
}
const handleAccountUpdate = async (event: Stripe.AccountUpdatedEvent) => {
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
export default withSessionRoute(handle)

export const config = {
  api: {
    bodyParser: false,
  },
}
