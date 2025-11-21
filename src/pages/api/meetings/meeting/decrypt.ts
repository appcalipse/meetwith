import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { GuestSlot } from '@/types/Meeting'
import { decryptMeetingGuest } from '@/utils/calendar_manager'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    if (!req.body) {
      return res.status(404).send('meeting info required')
    }

    try {
      const meetingInfo = req.body as GuestSlot
      if (meetingInfo.meeting_info_encrypted) {
        const slot = await decryptMeetingGuest(meetingInfo)
        return res.status(200).json(slot)
      } else {
        return res.status(200).json(null)
      }
    } catch (err) {
      Sentry.captureException(err)
      return res.status(404).send('Not found')
    }
  }

  return res.status(404).send('Not found')
}

export default handler
