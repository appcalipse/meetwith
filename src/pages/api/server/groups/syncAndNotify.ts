import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { GroupInviteNotifyRequest } from '@/types/Requests'
import { notifyForGroupInviteJoinOrReject } from '@/utils/notification_helper'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const request = req.body as GroupInviteNotifyRequest
    try {
      await notifyForGroupInviteJoinOrReject(
        request.accountsToNotify,
        request.group_id,
        request.notifyType
      )
    } catch (error) {
      Sentry.captureException(error)
    }
    return res.status(200).send(true)
  }
  return res.status(404).send('Not found')
}

export default handle
