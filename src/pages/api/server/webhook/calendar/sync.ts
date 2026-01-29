import { NextApiRequest, NextApiResponse } from 'next'

import { handleWebhookEvent } from '@/utils/database'
export type ResourceState = 'sync' | 'exists'
const lastProcessedEvent = new Map<string, number>()
const WINDOW_DURATION = 10 * 1000
export default async function recurrenceSync(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const now = Date.now()
      const channelId = req.headers['x-goog-channel-id'] as string
      const resourceId = req.headers['x-goog-resource-id'] as string
      const resourceState = req.headers[
        'x-goog-resource-state'
      ] as ResourceState

      if (!channelId || !resourceId || !resourceState) {
        return res.status(400).json({ error: 'Missing required headers' })
      }
      // we don't want to process events that are too close together
      if (
        lastProcessedEvent.has(channelId) &&
        now - lastProcessedEvent.get(channelId)! < WINDOW_DURATION
      ) {
        console.info(`Skipping event for channel ${channelId} due to timeout.`)
        return res.status(200).json('OK')
      }
      lastProcessedEvent.set(channelId, now)
      await handleWebhookEvent(channelId, resourceId, resourceState)

      return res.status(200).json('OK')
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: (error as Error).message })
    }
  }

  return res.status(404).send('Not found')
}
