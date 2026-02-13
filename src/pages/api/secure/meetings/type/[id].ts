import * as Sentry from '@sentry/node'
import { MeetingTypeNotFound } from '@utils/errors'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { getMeetingTypeFromDB } from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const account_id = req.session.account!.address
    const { id } = req.query

    if (req.method === 'GET') {
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Meeting type ID is required' })
      }

      const meetingType = await getMeetingTypeFromDB(id)
      if (!meetingType) {
        throw new MeetingTypeNotFound()
      }

      // Verify the meeting type belongs to the current account
      if (meetingType?.account_owner_address !== account_id) {
        return res.status(403).json({ error: 'Access denied' })
      }

      return res.status(200).json(meetingType)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    console.error('Error in meetings/type/[id] API:', e)
    if (e instanceof MeetingTypeNotFound) {
      return res.status(404).send(e.message)
    } else if (e instanceof Error) {
      Sentry.captureException(e)
      return res
        .status(500)
        .send('An error occurred while processing your request.')
    }
  }
}

export default withSessionRoute(handle)
