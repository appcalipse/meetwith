import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { InviteGroupMember } from '@/types/Contacts'
import {
  addContactInvite,
  countContactsAddedThisMonth,
  getGroupMembersOrInvite,
  initDB,
  isProAccountAsync,
  isUserContact,
} from '@/utils/database'
import {
  CantInviteYourself,
  ContactAlreadyExists,
  ContactInviteAlreadySent,
  ContactLimitExceededError,
  MemberDoesNotExist,
} from '@/utils/errors'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    initDB()
    const account_address = req.session.account!.address
    if (!req.session.account) {
      return res.status(401).send('Unauthorized')
    }
    try {
      const { address, groupId, state } = req.body as InviteGroupMember
      if (address === account_address) {
        throw new CantInviteYourself()
      }
      const isContact = await isUserContact(account_address, address)
      if (isContact) {
        throw new ContactAlreadyExists()
      }

      const isPro = await isProAccountAsync(account_address)

      if (!isPro) {
        const contactsAddedThisMonth = await countContactsAddedThisMonth(
          account_address
        )
        if (contactsAddedThisMonth >= 3) {
          throw new ContactLimitExceededError()
        }
      }

      const member = await getGroupMembersOrInvite(groupId, address, state)
      if (!member) {
        throw new MemberDoesNotExist()
      }
      await addContactInvite(account_address, address)
      return res.status(200).json({
        message: 'contact added',
        success: true,
      })
    } catch (e) {
      if (e instanceof ContactAlreadyExists) {
        return res.status(400).send(e.message)
      }
      if (e instanceof CantInviteYourself) {
        return res.status(403).send(e.message)
      }
      if (e instanceof ContactInviteAlreadySent) {
        return res.status(409).send(e.message)
      } else if (e instanceof MemberDoesNotExist) {
        return res.status(404).send(e.message)
      }
      if (e instanceof ContactLimitExceededError) {
        return res.status(403).send(e.message)
      }

      console.error('Error sending contact invite:', e)
      return res.status(500).send('Could not send contact invite')
    }
  }
  return res.status(405).send('Method not allowed')
}
export default withSessionRoute(handle)
