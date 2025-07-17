import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { Address } from '@/types/Transactions'
import { isSlotFree } from '@/utils/database'
import {
  AccountNotFoundError,
  AllMeetingSlotsUsedError,
  TransactionIsRequired,
} from '@/utils/errors'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const free = await isSlotFree(
        req.query.account_id as string,
        new Date(Number(req.query.start as string)),
        new Date(Number(req.query.end as string)),
        req.query.meetingTypeId as string,
        req.query.txHash as Address
      )

      return res.status(200).json({ isFree: free })
    } catch (e: unknown) {
      if (e instanceof AllMeetingSlotsUsedError) {
        return res.status(402).send(e)
      } else if (e instanceof TransactionIsRequired) {
        return res.status(400).send(e)
      } else if (e instanceof AccountNotFoundError) {
        return res.status(404).json({ error: e.message })
      }
      Sentry.captureException(e)
      return res.status(500).send('Server error')
    }
  }
  return res.status(404).send('Not found')
}

export default handler
