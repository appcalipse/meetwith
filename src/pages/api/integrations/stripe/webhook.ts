import * as Sentry from '@sentry/nextjs'
import {
  getRawBody,
  handleAccountUpdate,
  handleInvoicePaymentFailed,
  handleInvoicePaymentSucceeded,
  handleSubscriptionCreated,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from '@utils/services/stripe.helper'
import { StripeService } from '@utils/services/stripe.service'
import { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'

import { extractQuery } from '@/utils/generic_utils'

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
        case 'account.updated':
          await handleAccountUpdate(event)
          break
        case 'customer.subscription.created':
          await handleSubscriptionCreated(event)
          break
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event)
          break
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event)
          break
        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(event)
          break
        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event)
          break
        default:
          break
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

export default handle

export const config = {
  api: {
    bodyParser: false,
  },
}
