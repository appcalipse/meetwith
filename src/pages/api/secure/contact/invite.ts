import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { InviteContact } from '@/types/Contacts'
import { appUrl } from '@/utils/constants'
import {
  getAccountNotificationSubscriptionEmail,
  getOrCreateContactInvite,
  initDB,
  isUserContact,
  updateContactInviteCooldown,
} from '@/utils/database'
import { sendContactInvitationEmail } from '@/utils/email_helper'
import { ContactAlreadyExists, ContactInviteAlreadySent } from '@/utils/errors'
import { getAccountDisplayName } from '@/utils/user_manager'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    initDB()
    const account_address = req.session.account!.address
    if (!req.session.account) {
      return res.status(401).send('Unauthorized')
    }
    try {
      const { address, email } = req.body as InviteContact

      let userEmail = email
      if (address) {
        const isContact = await isUserContact(account_address, address)
        if (isContact) {
          throw new ContactAlreadyExists()
        }

        const accountEmail = await getAccountNotificationSubscriptionEmail(
          address
        )
        if (accountEmail) {
          userEmail = accountEmail
        }
      }
      const invite = await getOrCreateContactInvite(
        account_address,
        address,
        userEmail
      )
      if (invite.last_invited) {
        const expires_at = new Date(invite.last_invited)
        if (expires_at.getTime() > Date.now()) {
          throw new ContactInviteAlreadySent()
        }
      }
      const invitationLink = `${appUrl}/contact/invite-accept?identifier=${invite.id}`
      const inviterName = getAccountDisplayName(req.session.account)
      try {
        if (userEmail) {
          await sendContactInvitationEmail(
            userEmail || '',
            inviterName,
            invitationLink
          )
          await updateContactInviteCooldown(invite.id)
        }
      } catch (e) {
        console.error('Error sending contact invitation email:', e)
      }
      return res.status(200).json({
        message: 'Invitation sent',
        success: true,
      })
    } catch (e) {
      if (e instanceof ContactAlreadyExists) {
        return res.status(400).send(e.message)
      }
      if (e instanceof ContactInviteAlreadySent) {
        return res.status(409).send(e.message)
      }

      return res.status(500).send(e)
    }
  }
  return res.status(405).send('Method not allowed')
}
export default withSessionRoute(handle)
