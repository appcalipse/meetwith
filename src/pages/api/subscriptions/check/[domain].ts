import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { getSubscription } from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const rawDomain = req.query.domain
    const domain = Array.isArray(rawDomain) ? rawDomain[0] : rawDomain
    const subscription = await getSubscription(domain as string)
    if (subscription) {
      return res.status(200).json(subscription)
    }
  }

  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
