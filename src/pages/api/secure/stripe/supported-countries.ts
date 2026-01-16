import { StripeCountry } from '@meta/ConnectedAccounts'
import Sentry from '@sentry/nextjs'
import { StripeService } from '@utils/services/stripe.service'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const stripe = new StripeService()
      const countrySpecs = await stripe.countrySpecs.list({
        limit: 1000,
      })
      const names = new Intl.DisplayNames(['en'], { type: 'region' })
      const data = countrySpecs.data
        .map(spec => ({
          id: spec.id,
          name: names.of(spec.id),
        }))
        .filter((name): name is StripeCountry => !!name.id && !!name.name)
        .sort((a, b) => a.name.localeCompare(b.name))
      return res.status(200).json(data)
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
      return res.status(500).send('An unexpected error occurred.')
    }
  }
  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
