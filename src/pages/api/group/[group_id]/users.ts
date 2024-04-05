import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { GetGroupsResponse, GroupMember } from '@/types/Group'
import { getGroupUsers, getUserGroups, initDB } from '@/utils/database'
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
      const responseJson: Array<GroupMember> = groups.map(group => ({
        displayName: group.preferences.name,
        address: group.address,
        role: group.role,
        invitePending: group.invite_pending,
        calendarConnected: group.calendars.calendars?.length > 0,
      }))
      return res.status(200).json(responseJson)
    } catch (error) {
      if (error instanceof NotGroupMemberError) {
        return res.status(403).json({ error: error.message })
      }
      if (error instanceof GroupNotExistsError) {
        return res.status(404).json({ error: error.message })
      }
      return res.status(500).send(error)
    }
  }
}
export default withSessionRoute(handle)
