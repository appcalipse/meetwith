import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { getTransactionsStatusById } from '@/utils/database'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const rawId = req.query.id
    const id = Array.isArray(rawId) ? rawId[0] : rawId
    if (!id) {
      return res.status(404).send('Id parameter required')
    }
    try {
      const status = await getTransactionsStatusById(id)
      return res.status(200).json(status)
    } catch (err) {
      Sentry.captureException(err)
      return res.status(404).send('Not found')
    }
  }

  return res.status(404).send('Not found')
}

export default handler
