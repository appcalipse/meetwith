import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { GroupMember } from '@/types/Group'
import { getGroupUsers, initDB } from '@/utils/database'
import { GroupNotExistsError, NotGroupMemberError } from '@/utils/errors'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    initDB()
    const account_address = req.session.account!.address
    if (!account_address) {
      return res.status(401).send('Unauthorized')
    }
    const group_id = req.query.group_id as string
    try {
      const groups = await getGroupUsers(
        group_id,
        account_address,
        Number(req.query.limit as string),
        Number(req.query.offset as string)
      )
      const responseJson: Array<GroupMember> = groups
        .map(group => {
          return group.email
            ? {
                userId: group.id,
                role: group.role,
                invitePending: true,
                calendarConnected: false,
                displayName: group.email,
              }
            : group.group_members.length > 0
            ? {
                userId: group.group_members?.[0]?.id,
                displayName: group.preferences?.name,
                address: group.group_members?.[0]?.member_id as string,
                role: group.group_members?.[0].role,
                invitePending: false,
                calendarConnected: !!group.calendars[0]?.calendars?.length,
                domain: group.subscriptions?.find(
                  sub => new Date(sub.expiry_time) > new Date()
                )?.domain,
              }
            : {
                displayName: group.preferences?.name,
                address: (group.group_invites?.[0]?.user_id ||
                  group.group_invites?.[0]?.email) as string,
                userId: group.group_invites?.[0]?.id,
                role: group.group_invites?.[0].role,
                invitePending: true,
                calendarConnected: !!group.calendars[0]?.calendars?.length,
              }
        })
        .filter(Boolean)
      return res.status(200).json(responseJson)
    } catch (error: unknown) {
      if (error instanceof NotGroupMemberError) {
        return res.status(403).json({ error: error.message })
      }
      if (error instanceof GroupNotExistsError) {
        return res.status(404).json({ error: error.message })
      }
      if (error instanceof Error) {
        return res.status(500).send(error.message)
      }
      return res.status(500).send('Something went wrong')
    }
  }
  return res.status(405).send('Method not allowed')
}
export default withSessionRoute(handle)
