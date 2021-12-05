import { NextApiRequest, NextApiResponse } from 'next'
import { getSlotsForAccount, initDB } from '../../../utils/database'
import { AccountNotFoundError } from '../../../utils/errors'

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    initDB()

    try {
      const meetings = await getSlotsForAccount(
        req.query.identifier as string,
        req.query.start ? new Date(req.query.start as string) : undefined,
        req.query.end ? new Date(req.query.end as string) : undefined
      )

      res.status(200).json(meetings)
      return
    } catch (error) {
      if (error instanceof AccountNotFoundError) {
        res.status(404).json({ error: error.message })
      }
      console.error(error)
      return
    }
  }
  res.status(404).send('Not found')
}
