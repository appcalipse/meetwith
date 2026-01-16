import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { GuestMeetingCancelRequest } from '@/types/Requests'
import {
  deleteMeetingFromDB,
  getSlotByMeetingIdAndAccount,
} from '@/utils/database'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const meeting_id = req.query.id as string
  if (!meeting_id) {
    return res.status(404).send('Id parameter required')
  }
  if (req.method === 'GET') {
    try {
      const slot = await getSlotByMeetingIdAndAccount(
        meeting_id,
        req.session.account?.address
      )
      return res.status(200).json(slot)
    } catch (err) {
      Sentry.captureException(err)
      return res.status(404).send('Not found')
    }
  }
  if (req.method === 'DELETE') {
    const request = req.body as GuestMeetingCancelRequest
    const name =
      request.meeting.participants.find(
        p => p.guest_email?.toLowerCase() === request.guest_email.toLowerCase()
      )?.name || 'Guest'

    const guestsToRemove = request.meeting.participants.filter(
      p => p.guest_email
    )
    await deleteMeetingFromDB(
      {
        guest_email: request.guest_email,
        name,
      },
      request.meeting.related_slot_ids,
      guestsToRemove,
      request.meeting.meeting_id,
      request.currentTimezone,
      undefined,
      request.meeting?.title
    )
    return res.status(200).json({ removed: request.meeting.related_slot_ids })
  }
  return res.status(404).send('Not found')
}

export default withSessionRoute(handler)
