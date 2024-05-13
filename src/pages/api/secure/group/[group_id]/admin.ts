import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { GroupMember } from '@/types/Group'
import { getGroupUsers, initDB } from '@/utils/database'
import { GroupNotExistsError, NotGroupMemberError } from '@/utils/errors'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'PATCH') {
    initDB()
    const account_address = req.session.account!.address
    if (!account_address) {
      return res.status(401).send('Unauthorized')
    }
    const group_id = req.query.group_id as string
    try {
      // add logic for group patch here
    } catch (error: any) {
      if (error instanceof NotGroupMemberError) {
        return res.status(403).json({ error: error.message })
      }
      if (error instanceof GroupNotExistsError) {
        return res.status(404).json({ error: error.message })
      }
      return res.status(500).send(error.message)
    }
  }
  return res.status(405).send('Method not allowed')
}
export default withSessionRoute(handle)
