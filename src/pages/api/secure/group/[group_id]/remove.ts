import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { RemoveGroupMemberPayload } from '@/types/Group'
import { deleteGroup, getGroup, initDB, removeMember } from '@/utils/database'
import {
  GroupNotExistsError,
  IsGroupAdminError,
  IsGroupMemberError,
  NotGroupAdminError,
  NotGroupMemberError,
} from '@/utils/errors'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    initDB()
    const account_address = req.session.account!.address
    if (!account_address) {
      return res.status(401).send('Unauthorized')
    }
    const group_id = req.query.group_id as string
    if (req.method === 'DELETE') {
      const { member_id, invite_pending } = req.body as RemoveGroupMemberPayload
      await removeMember(group_id, account_address, member_id, invite_pending)
      return res.status(200).json({
        success: true,
      })
    }
  } catch (error) {
    if (error instanceof IsGroupAdminError) {
      return res.status(403).json({ error: error.message })
    }
    if (error instanceof NotGroupMemberError) {
      return res.status(403).json({ error: error.message })
    }
    if (error instanceof NotGroupAdminError) {
      return res.status(403).json({ error: error.message })
    }
    if (error instanceof GroupNotExistsError) {
      return res.status(404).json({ error: error.message })
    }
    return res.status(500).send(error)
  }
  return res.status(405).send('Method not allowed')
}
export default withSessionRoute(handle)
