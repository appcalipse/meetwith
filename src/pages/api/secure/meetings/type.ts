import {
  CreateMeetingTypeRequest,
  DeleteMeetingTypeRequest,
  UpdateMeetingTypeRequest,
} from '@meta/Requests'
import { LastMeetingTypeError, MeetingSlugAlreadyExists } from '@utils/errors'
import { extractQuery } from '@utils/generic_utils'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  createMeetingType,
  deleteMeetingType,
  getMeetingTypes,
  updateMeetingType,
} from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const account_id = req.session.account!.address
    if (req.method === 'GET') {
      const limit = extractQuery(req.query, 'limit')
      const offset = extractQuery(req.query, 'offset')
      const meetingTypes = await getMeetingTypes(
        account_id,
        limit ? Number(limit) : undefined,
        offset ? Number(offset) : undefined
      )
      return res.status(200).json(meetingTypes)
    }
    if (req.method === 'POST') {
      const meetingTypePayload = req.body as CreateMeetingTypeRequest
      const meetingType = await createMeetingType(
        account_id,
        meetingTypePayload
      )
      res.status(200).json(meetingType)
    }
    if (req.method === 'PATCH') {
      const meetingTypePayload = req.body as UpdateMeetingTypeRequest
      const meetingType = await updateMeetingType(
        account_id,
        meetingTypePayload.id,
        meetingTypePayload
      )
      res.status(200).json(meetingType)
    } else if (req.method === 'DELETE') {
      const meetingTypePayload = req.body as DeleteMeetingTypeRequest
      await deleteMeetingType(account_id, meetingTypePayload.typeId)
      res.status(200).json({
        success: true,
      })
    }

    return res.status(404).send('Not found')
  } catch (e) {
    if (e instanceof MeetingSlugAlreadyExists) {
      return res.status(400).send(e.message)
    } else if (e instanceof LastMeetingTypeError) {
      return res.status(409).send(e.message)
    } else if (e instanceof Error) {
      console.error('Error in meetings/type API:', e.message)
      return res
        .status(500)
        .send('An error occurred while processing your request.')
    }
  }
}

export default withSessionRoute(handle)
