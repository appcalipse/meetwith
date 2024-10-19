import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { NotificationChannel } from '@/types/AccountNotifications'
import { GroupInvitePayload, MemberType } from '@/types/Group'
import { appUrl } from '@/utils/constants'
import {
  addUserToGroupInvites,
  getAccountFromDB,
  getAccountNotificationSubscriptions,
  getGroup,
  getGroupUsersInternal,
  isUserAdminOfGroup,
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
    const users = await getGroupUsersInternal(groupId)
    const existingMembersAndInvites = users
      .map(user =>
        (user.member_id || user.user_id || user.email)?.toLowerCase()
      )
      .filter(Boolean)
    const alreadyInvitedUsers = invitees.filter(val =>
      existingMembersAndInvites.includes(
        (val.address || val.email)?.toLowerCase()
      )
    )
    if (alreadyInvitedUsers.length > 0) {
      const invitedUsersConcatenated = alreadyInvitedUsers
        .map(val => val.address || val.email)
        .join(', ')
      return res.status(400).json({
        error: `${invitedUsersConcatenated} has already been invited to group.`,
        alreadyInvitedUsers,
      })
    }

    for (const invitee of invitees) {
      if (!invitee.email && !invitee.address) {
        console.error('Invitee email or address is undefined')
        continue
      }

      let userEmail: string | undefined
      if (invitee.email) {
        userEmail = invitee.email
      } else if (invitee.address) {
        try {
          const account = await getAccountFromDB(invitee.address)
          if (account) {
            const notifications = await getAccountNotificationSubscriptions(
              invitee.address
            )
            userEmail = notifications?.notification_types.find(
              n => n.channel === NotificationChannel.EMAIL
            )?.destination
          }
        } catch (error) {
          console.warn(
            `Account with address ${invitee.address} not found. Proceeding with invite creation.`
          )
        }
      }

      try {
        await addUserToGroupInvites(
          groupId,
          invitee.role,
          invitee.email,
          invitee.address
        )
      } catch (error) {
        console.error('Error creating group invite:', error)
      }
      if (userEmail) {
        const inviteLink = `${appUrl}/invite-accept?groupId=${groupId}${
          invitee.email && `&email=${invitee.email}`
        }`
        try {
          await sendInvitationEmail(
            userEmail,
            inviterName,
            message ||
              `Come join our scheduling group "${group.name}" on Meet With Wallet!`,
            groupId,
            group,
            inviteLink
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
