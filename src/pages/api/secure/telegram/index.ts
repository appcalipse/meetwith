import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { createTgConnection, getTgConnection } from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST' || req.method === 'GET') {
    if (!req.session.account || !req.session.account.address) {
      return res.status(401).send('Unauthorized')
    }
    const data = await getTgConnection(req.session.account.address)
    if (req.method === 'GET' || data) res.status(200).json({ data })

    res.status(201).json({ data })
  }
}

export default withSessionRoute(handle)
