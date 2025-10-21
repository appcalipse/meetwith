import Stripe from 'stripe'

export class StripeService extends Stripe {
  constructor() {
    super(process.env.STRIPE_API_KEY)
  }
}
