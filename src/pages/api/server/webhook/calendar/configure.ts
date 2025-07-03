import { NextApiRequest, NextApiResponse } from 'next'

import { TimeSlotSource } from '@/types/Meeting'
import { syncWebhooks } from '@/utils/database'

export default async function recurrenceSync(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      await syncWebhooks(TimeSlotSource.GOOGLE)
      return res.status(200).json('OK')
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message })
    }
  }

  return res.status(404).send('Not found')
}
