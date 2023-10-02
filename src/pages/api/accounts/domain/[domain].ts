import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { getSubscription } from '@/utils/database'

const getAccountByDomain = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  if (req.method === 'GET') {
    const { domain } = req.query
    try {
      const subscription = await getSubscription(domain as string)
      return res.status(200).json(subscription)
    } catch (e) {
      return res.status(404).send('Not found')
    }
  }
  return res.status(404).send('Not found')
}

export default withSessionRoute(withSentry(getAccountByDomain))
