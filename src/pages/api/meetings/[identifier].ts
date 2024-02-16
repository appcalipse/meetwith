import { NextApiRequest, NextApiResponse } from 'next'

import { getSlotsForAccount, getSlotsForDashboard } from '@/utils/database'
import { AccountNotFoundError } from '@/utils/errors'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      let meetings
      if (req.query.upcoming === 'true') {
        meetings = await getSlotsForDashboard(
          req.query.identifier as string,
          new Date(Number(req.query.end as string)),
          Number(req.query.limit as string),
          Number(req.query.offset as string)
        )
      } else {
        meetings = await getSlotsForAccount(
          req.query.identifier as string,
          req.query.start !== 'undefined'
            ? new Date(Number(req.query.start as string))
            : undefined,
          req.query.end !== 'undefined'
            ? new Date(Number(req.query.end as string))
            : undefined,
          req.query.limit !== 'undefined'
            ? Number(req.query.limit as string)
            : undefined,
          req.query.offset !== 'undefined'
            ? Number(req.query.offset as string)
            : undefined
        )
      }

      return res.status(200).json(meetings)
    } catch (error) {
      if (error instanceof AccountNotFoundError) {
        return res.status(404).json({ error: error.message })
      }
    }
  }
  return res.status(404).send('Not found')
}

export default handler
