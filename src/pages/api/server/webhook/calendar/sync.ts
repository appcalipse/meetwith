import { NextApiRequest, NextApiResponse } from 'next'

import { handleWebhookEvent, updateAllRecurringSlots } from '@/utils/database'

export default async function recurrenceSync(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const channelId = req.headers['x-goog-channel-id'] as string
      const resourceId = req.headers['x-goog-resource-id'] as string
      const resourceState = req.headers['x-goog-resource-state'] as
        | 'sync'
        | 'exists'
      const event = await handleWebhookEvent(channelId, resourceId)
      if (!event) {
        return res.status(404).json({ error: 'Event not found' })
      }
      return res.status(200).json(event)
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message })
    }
  }

  return res.status(404).send('Not found')
}
