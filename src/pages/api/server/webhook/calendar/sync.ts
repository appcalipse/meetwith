import { NextApiRequest, NextApiResponse } from 'next'
import { handleWebhookEvent } from '@/utils/database'

export type ResourceState = 'sync' | 'exists'
const channelLock = new Map<string, NodeJS.Timeout>()
// TODO: switch to a distributed lock via redlock
export default async function recurrenceSync(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    const channelId = req.headers['x-goog-channel-id'] as string
    const resourceId = req.headers['x-goog-resource-id'] as string
    const resourceState = req.headers['x-goog-resource-state'] as ResourceState
    try {
      if (!channelId || !resourceId || !resourceState) {
        return res.status(400).json({ error: 'Missing required headers' })
      }
      // we only want to process a single event fromn each channel at a time
      if (channelLock.has(channelId)) {
        console.info(
          `Skipping event for channel ${channelId} as an event update is already in progress.`
        )
        return res.status(200).json('OK')
      }
      // Set a timeout to automatically release the lock after a certain period
      const lockTimeout = setTimeout(() => channelLock.delete(channelId), 90000) // 90 seconds
      channelLock.set(channelId, lockTimeout)
      await handleWebhookEvent(channelId, resourceId, resourceState)

      return res.status(200).json('OK')
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: (error as Error).message })
    } finally {
      if (channelLock.has(channelId)) {
        clearTimeout(channelLock.get(channelId)!)
        channelLock.delete(channelId)
      }
    }
  }

  return res.status(404).send('Not found')
}
