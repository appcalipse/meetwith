import {
  CreateMeetingTypeRequest,
  DeleteMeetingTypeRequest,
  UpdateMeetingTypeRequest,
} from '@meta/Requests'
import { SessionType } from '@utils/constants/meeting-types'
import { isProAccountAsync } from '@utils/database'
import {
  LastMeetingTypeError,
  MeetingSlugAlreadyExists,
  MeetingTypeLimitExceededError,
  PaidMeetingTypeNotAllowedError,
} from '@utils/errors'
import { extractQuery } from '@utils/generic_utils'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  countMeetingTypes,
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
      const allMeetingTypes = await getMeetingTypes(
        account_id,
        limit ? Number(limit) : undefined,
        offset ? Number(offset) : undefined
      )

      // Check subscription status for filtering
      const isPro = await isProAccountAsync(account_id)

      if (!isPro) {
        // Free tier: return only first 1 FREE meeting type, hide all PAID
        const freeMeetingTypes = allMeetingTypes.filter(
          mt => mt.type === SessionType.FREE
        )
        const paidMeetingTypes = allMeetingTypes.filter(
          mt => mt.type === SessionType.PAID
        )

        const limitedMeetingTypes = freeMeetingTypes.slice(0, 1)

        return res.status(200).json({
          meetingTypes: limitedMeetingTypes,
          total: allMeetingTypes.length,
          hidden: allMeetingTypes.length - limitedMeetingTypes.length,
          paidHidden: paidMeetingTypes.length,
          upgradeRequired:
            allMeetingTypes.length >= 1 || paidMeetingTypes.length >= 0,
        })
      }

      // Pro: return all meeting types
      return res.status(200).json({
        meetingTypes: allMeetingTypes,
        total: allMeetingTypes.length,
        hidden: 0,
        paidHidden: 0,
        upgradeRequired: false,
      })
    }
    if (req.method === 'POST') {
      const meetingTypePayload = req.body as CreateMeetingTypeRequest

      // Check subscription status
      const isPro = await isProAccountAsync(account_id)

      if (!isPro) {
        // Free tier restrictions:
        // 1. Only FREE meeting types allowed (no paid meetings)
        if (meetingTypePayload.type === SessionType.PAID) {
          throw new PaidMeetingTypeNotAllowedError()
        }

        // 2. Maximum 1 meeting type
        const meetingTypeCount = await countMeetingTypes(account_id)
        if (meetingTypeCount >= 1) {
          throw new MeetingTypeLimitExceededError()
        }
      }

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
    } else if (e instanceof MeetingTypeLimitExceededError) {
      return res.status(403).send(e.message)
    } else if (e instanceof PaidMeetingTypeNotAllowedError) {
      return res.status(403).send(e.message)
    } else if (e instanceof Error) {
      console.error('Error in meetings/type API:', e.message)
      return res
        .status(500)
        .send('An error occurred while processing your request.')
    }
  }
}

export default withSessionRoute(handle)
