import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { getAccountFromDB, initDB, isUserAdminOfGroup } from '@/utils/database'

// Endpoint to invite a user to a group, accessible only to group admins.
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 'email' is passed in from form input from create-group form, or independently
  // from 'Add new member' form
  const { userAddress, email } = req.body
  const groupId = req.query.group_id as string
  const session = req.session

  // Ensure the session and group ID are present.
  if (!session || !session.account || !groupId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const db = initDB()
    const currentUserAddress = session.account.address

    // Check if the current user is an admin of the group.
    const isAdmin = await isUserAdminOfGroup(groupId, currentUserAddress)
    if (!isAdmin) {
      return res.status(403).json({ error: 'User is not a group admin' })
    }

    // Check if the invited user exists.
    const invitedUser = await getAccountFromDB(userAddress)
    if (!invitedUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Add the user to the group as a member.
    const { error } = await db.supabase.from('group_members').insert({
      member_id: userAddress,
      group_id: groupId,
      role: 'member',
    })

    if (error) {
      console.error('Error inserting group invitation:', error)
      return res.status(500).json({ error: 'Failed to send invitation' })
    }

    // Optional: Send email notification to the invited user.
    // Implement email notification logic here if required.

    return res
      .status(200)
      .json({ success: true, message: 'Invitation sent successfully.' })
  } catch (error) {
    console.error('An error occurred during invitation:', error)
    return res.status(500).json({ error: 'Failed to send invitation' })
  }
}

export default withSessionRoute(handler)
