import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { getSubscription, initDB } from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    initDB()
    try {
      const subscription = await getSubscription(req.query.domain as string)

      if (subscription) {
        return res.status(200).json(subscription)
      }
    } catch (e) {
      console.error(e)
      return res.status(500).send('Internal Server Error')
    }
  }

  return res.status(404).send('Not found')
}

export default withSentry(withSessionRoute(handle))
