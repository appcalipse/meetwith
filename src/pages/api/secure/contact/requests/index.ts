import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { NotificationChannel } from '@/types/AccountNotifications'
import { ContactInvite, Contacts } from '@/types/Contacts'
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
        req.query.limit ? Number(req.query.limit as string) : undefined,
        req.query.offset ? Number(req.query.offset as string) : undefined
      )
      const results: Array<ContactInvite> = dbResults.map(result => ({
        id: result.id,
        account_owner_address: result.account_owner_address,
        ...result.account.preferences,
        calendar_exists: result.account.calendars_exist.length > 0,
        email_address:
          result.account.account_notifications?.notification_types?.find(
            n => n.channel === NotificationChannel.EMAIL && !n.disabled
          )?.destination,
      }))
      return res.status(200).json(results)
    } catch (e) {
      return res.status(500).send(e)
    }
  }
  return res.status(405).send('Method not allowed')
}
export default withSessionRoute(handle)
