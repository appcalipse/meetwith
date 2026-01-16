import { NextApiRequest, NextApiResponse } from 'next'

import { isProduction } from '@/utils/constants'
import { handleWebhookEvent } from '@/utils/database'
export type ResourceState = 'sync' | 'exists'

export default async function recurrenceSync(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      if (isProduction) {
        return res
          .status(200)
          .json({ message: 'Webhook received in production, no action taken' })
      }
      const channelId = req.headers['x-goog-channel-id'] as string
      const resourceId = req.headers['x-goog-resource-id'] as string
      const resourceState = req.headers[
        'x-goog-resource-state'
      ] as ResourceState

      if (!channelId || !resourceId || !resourceState) {
        return res.status(400).json({ error: 'Missing required headers' })
      }
      const event = await handleWebhookEvent(
        channelId,
        resourceId,
        resourceState
      )
      if (!event) {
        return res.status(404).json({ error: 'Event not found' })
      }
      return res.status(200).json(event)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: (error as Error).message })
    }
  }

  return res.status(404).send('Not found')
}
