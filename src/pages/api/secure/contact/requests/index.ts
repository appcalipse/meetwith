import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { NotificationChannel } from '@/types/AccountNotifications'
import { ContactInvite } from '@/types/Contacts'
import { getContactInvites, initDB } from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    initDB()
    const account_address = req.session.account!.address
    if (!account_address) {
      return res.status(401).send('Unauthorized')
    }
    try {
      const dbResults = await getContactInvites(
        account_address,
        req.query.q as string,
        req.query.limit ? Number(req.query.limit as string) : undefined,
        req.query.offset ? Number(req.query.offset as string) : undefined
      )
      const results: Array<ContactInvite> = dbResults.result || []
      return res.status(200).json(results)
    } catch (e) {
      return res.status(500).send(e)
    }
  }
  return res.status(405).send('Method not allowed')
}
export default withSessionRoute(handle)
