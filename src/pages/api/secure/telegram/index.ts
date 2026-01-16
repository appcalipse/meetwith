import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { createTgConnection, getTgConnection } from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (!req.session.account || !req.session.account.address) {
    return res.status(401).send('Unauthorized')
  }
  if (req.method === 'POST') {
    let data = await getTgConnection(req.session.account.address)
    if (data) res.status(200).json({ data })
    if (!data) {
      data = await createTgConnection(req.session.account.address)
    }
    res.status(201).json({ data })
  } else if (req.method === 'GET') {
    const data = await getTgConnection(req.session.account.address)
    return res.status(200).json({ data })
  }
  return res.status(405).send('Method Not Allowed')
}

export default withSessionRoute(handle)
