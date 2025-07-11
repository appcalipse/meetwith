import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { ContactInvite } from '@/types/Contacts'
import {
  acceptContactInvite,
  getContactInviteById,
  initDB,
  rejectContactInvite,
} from '@/utils/database'
import { ContactAlreadyExists, ContactInviteNotFound } from '@/utils/errors'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    initDB()
    const invite_id = req.query.id as string
    const account_address = req.session.account!.address
    if (!account_address) {
      return res.status(401).send('Unauthorized')
    }
    if (req.method === 'GET') {
      const invite = await getContactInviteById(invite_id)
      if (!invite) {
        return res.status(404).send('Not found')
      }
      const data: ContactInvite = {
        id: invite.id,
        address: invite.account_owner_address,
        calendar_exists: invite.account.calendars_exist.length > 0,
        email_address:
          invite.account.account_notifications?.notification_types?.find(
            n => n.channel === 'email' && !n.disabled
          )?.destination,
        ...invite.account.preferences,
      }
      return res.status(200).json(data)
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
    if (error instanceof ContactAlreadyExists) {
      return res.status(400).send(error.message)
    } else if (error instanceof ContactInviteNotFound) {
      return res.status(404).send(error.message)
    }
    return res.status(500).send(error.message)
  }
  return res.status(405).send('Method not allowed')
}
export default withSessionRoute(handle)
