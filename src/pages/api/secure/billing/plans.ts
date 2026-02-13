import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  BillingCycle,
  GetPlansResponse,
  PaymentProvider,
} from '@/types/Billing'
import { getBillingPlanProviders, getBillingPlans } from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      if (!req.session.account?.address) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      // Fetch billing plans and Stripe provider mappings in parallel
      const [plans, stripeProviders] = await Promise.all([
        getBillingPlans(),
        getBillingPlanProviders(PaymentProvider.STRIPE),
      ])

      // Create a map of plan_id -> provider_product_id for quick lookup
      const providerMap = new Map<string, string>()
      stripeProviders.forEach(provider => {
        providerMap.set(provider.billing_plan_id, provider.provider_product_id)
      })

      // Combine plans with provider info
      const plansWithProvider: GetPlansResponse['plans'] = plans.map(plan => ({
        billing_cycle: plan.billing_cycle as BillingCycle,
        created_at: plan.created_at,
        id: plan.id,
        name: plan.name,
        price: Number(plan.price),
        provider_product_id: providerMap.get(plan.id),
        updated_at: plan.updated_at,
      }))

      return res.status(200).json({ plans: plansWithProvider })
    } catch (error) {
      console.error('Error fetching billing plans:', error)
      Sentry.captureException(error)
      return res.status(500).json({ error: 'Failed to fetch billing plans' })
    }
  }
  return res.status(405).json({ error: 'Method not allowed' })
}

export default withSessionRoute(handle)
