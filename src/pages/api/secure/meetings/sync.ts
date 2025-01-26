import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { MeetingCancelSyncRequest } from '@/types/Meeting'
import { handleMeetingCancelSync } from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  const { decryptedMeetingData } = req.body as MeetingCancelSyncRequest
  if (req.method === 'PATCH') {
    await handleMeetingCancelSync(decryptedMeetingData)
    return res.status(200).send(true)
  }
  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
