import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  GroupInvitePayload,
  GroupInvitesResponse,
  MemberType,
} from '@/types/Group'
import { inviteUsers } from '@/utils/api_helper'
import { appUrl } from '@/utils/constants'
import {
  addUserToGroupInvites,
  createGroupInvite,
  getAccountFromDB,
  getAccountNotificationSubscriptions,
  getGroup,
  getGroupInvite,
  getGroupInvites,
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
    const currentUserAddress = session.account.address

    const isAdmin = await isUserAdminOfGroup(groupId, currentUserAddress)
    if (!isAdmin) {
      return res.status(403).json({ error: 'User is not a group admin' })
    }
    const inviterName = getAccountDisplayName(session.account)
    const group = await getGroup(groupId, currentUserAddress)

    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    for (const invitee of invitees) {
      if (!invitee.email && !invitee.address) {
        console.error('Invitee email or address is undefined')
        continue
      }

      let account = null
      if (invitee.email) {
        try {
          account = await getAccountFromDB(invitee.email)
        } catch (error) {
          console.warn(
            `Account with email ${invitee.email} not found. Proceeding with invite creation.`
          )
        }
      } else if (invitee.address) {
        try {
          account = await getAccountFromDB(invitee.address)
        } catch (error) {
          console.warn(
            `Account with address ${invitee.address} not found. Proceeding with invite creation.`
          )
        }
      }

      let groupInvite: GroupInvitesResponse | null = null
      if (invitee.email) {
        groupInvite = await getGroupInvite({ email: invitee.email })
      } else if (invitee.userId) {
        groupInvite = await getGroupInvite({ discordId: invitee.userId })
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
            invitee.role as MemberType,
            invitee.email,
            invitee.address
          )
        } catch (error) {
          console.error('Error creating group invite:', error)
        }
      }

      if (invitee.email) {
        const inviteLink = `${appUrl}/invite-accept?groupId=${groupId}&email=${invitee.email}`
        try {
          await sendInvitationEmail(
            invitee.email,
            inviterName,
            message ||
              `Come join our scheduling group "${group.name}" on Meet With Wallet!`,
            groupId,
            group
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
