import * as Sentry from '@sentry/nextjs'
import {
  getRawBody,
  handleChargeFailed,
  handleChargeSucceeded,
} from '@utils/services/stripe.helper'
import { StripeService } from '@utils/services/stripe.service'
import { NextApiRequest, NextApiResponse } from 'next'
import posthog from 'posthog-js'
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
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET_CONNECT || ''
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
        default:
          // eslint-disable-next-line no-restricted-syntax
          console.error(`Unhandled event type: ${event.type}`)
      }
      return res.status(200).json({
        success: true,
      })
    } catch (e) {
      console.error(e)
      posthog.captureException(e, {
        extra: {
          requestBody: req.body,
          requestHeaders: req.headers,
        },
      })
      Sentry.captureException(e, {
        extra: {
          requestBody: req.body,
          requestHeaders: req.headers,
        },
      })
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
