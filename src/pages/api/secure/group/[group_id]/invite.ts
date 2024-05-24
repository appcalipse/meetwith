import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { GroupInvite, GroupInvitePayload } from '@/types/Group'
import { inviteUsersToGroup } from '@/utils/api_helper'
import {
  addUserToGroupInvites,
  createGroupInvite,
  getAccountFromDB,
  getAccountNotificationSubscriptions,
  getGroupById,
  getGroupInviteByDiscordId,
  getGroupInviteByEmail,
  isUserAdminOfGroup,
  updateGroupInviteUserId,
} from '@/utils/database'
import { sendInvitationEmail } from '@/utils/email_helper'
import { getAccountDisplayName } from '@/utils/user_manager'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { invitees, message = '' } = req.body as GroupInvitePayload
  const groupId = req.query.group_id as string | undefined
  const session = req.session

  if (!session || !session.account || !groupId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    console.log('Received payload:', invitees, 'Message:', message)

    const currentUserAddress = session.account.address

    const isAdmin = await isUserAdminOfGroup(groupId, currentUserAddress)
    if (!isAdmin) {
      return res.status(403).json({ error: 'User is not a group admin' })
    }
    const inviterName = getAccountDisplayName(session.account)
    const group = await getGroupById(groupId)

    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    const groupName = group.name

    for (const invitee of invitees) {
      if (!invitee.email && !invitee.address) {
        console.error('Invitee email or address is undefined')
        continue
      }

      let account = null
      try {
        if (invitee.email) {
          account = await getAccountFromDB(invitee.email)
        } else if (invitee.address) {
          account = await getAccountFromDB(invitee.address)
        }
        if (!account) {
          console.error(
            `Account with identifier ${
              invitee.email || invitee.address
            } not found`
          )
        }
      } catch (error) {
        console.error(
          `Account with identifier ${
            invitee.email || invitee.address
          } not found`,
          error
        )
      }

      let groupInvite: GroupInvite | null = null
      if (invitee.email) {
        groupInvite = await getGroupInviteByEmail(invitee.email)
      } else if (invitee.userId) {
        groupInvite = await getGroupInviteByDiscordId(invitee.userId)
      }

      if (groupInvite) {
        if (invitee.userId) {
          try {
            await updateGroupInviteUserId(groupInvite.id, invitee.userId)
          } catch (error) {
            console.error('Error updating group invite user ID:', error)
          }
        } else {
          console.warn(
            'Invitee userId is undefined, continuing with the invite'
          )
        }
      } else {
        try {
          await addUserToGroupInvites(
            groupId,
            invitee.email,
            invitee.address,
            account?.id || invitee.userId
          )
        } catch (error) {
          console.error('Error creating group invite:', error)
        }
      }

      if (invitee.email) {
        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite-accept?groupId=${groupId}&email=${invitee.email}`
        try {
          await sendInvitationEmail(
            invitee.email,
            inviterName,
            groupName,
            `${message} Click here to join: ${inviteLink}`,
            groupId
          )
        } catch (error) {
          console.error('Error sending invitation email:', error)
        }
      }
    }

    return res
      .status(200)
      .json({ success: true, message: 'Invitations sent successfully.' })
  } catch (error) {
    console.error('An error occurred during invitation:', error)
    return res.status(500).json({ error: 'Failed to send invitation' })
  }
}

export default withSessionRoute(handle)
