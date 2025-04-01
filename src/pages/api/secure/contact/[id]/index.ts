import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { NotificationChannel } from '@/types/AccountNotifications'
import { Contact } from '@/types/Contacts'
import { getContactById, initDB, removeContact } from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  const account_address = req.session.account!.address
  if (!account_address) {
    return res.status(401).send('Unauthorized')
  }
  if (req.method === 'GET') {
    initDB()
    try {
      const dbResult = await getContactById(
        account_address,
        typeof req.query.id === 'string' ? req.query.id : ''
      )
      if (!dbResult) {
        return res.status(404).send('Contact not found')
      }
      const result: Contact = {
        id: dbResult.id,
        address: dbResult.contact_address,
        status: dbResult.status,
        ...dbResult.account.preferences,
        calendar_exists: dbResult.account.calendars_exist.length > 0,
        email_address:
          dbResult.account.account_notifications?.notification_types?.find(
            n => n.channel === NotificationChannel.EMAIL && !n.disabled
          )?.destination,
      }
      return res.status(200).json(result)
    } catch (e) {
      return res.status(500).send(e)
    }
  }
  if (req.method === 'DELETE') {
    try {
      await removeContact(
        account_address,
        // id in this instance is the account address
        typeof req.query.id === 'string' ? req.query.id : ''
      )
      return res.status(200).json({
        success: true,
      })
    } catch (e) {
      return res.status(500).send(e)
    }
  }
  return res.status(405).send('Method not allowed')
}
export default withSessionRoute(handle)
