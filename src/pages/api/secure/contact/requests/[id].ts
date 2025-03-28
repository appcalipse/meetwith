import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  acceptContactInvite,
  initDB,
  rejectContactInvite,
} from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    initDB()
    const invite_id = req.query.id as string
    const account_address = req.session.account!.address
    if (!account_address) {
      return res.status(401).send('Unauthorized')
    }
    if (req.method === 'POST') {
      await acceptContactInvite(invite_id, account_address)
      return res.status(200).json({ success: true })
    }
    if (req.method === 'DELETE') {
      await rejectContactInvite(invite_id, account_address)
      return res.status(200).json({ success: true })
    }
  } catch (e: unknown) {
    const error = e as Error
    return res.status(500).send(error.message)
  }
  return res.status(405).send('Method not allowed')
}
export default withSessionRoute(handle)
