import { NextApiRequest, NextApiResponse } from 'next'

import { updateAllRecurringSlots } from '@/utils/database'

export default async function recurrenceSync(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      await updateAllRecurringSlots()
      return res.status(200).json({
        success: true,
        message: 'recurring slot added successfully',
      })
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message })
    }
  }

  return res.status(404).send('Not found')
}
