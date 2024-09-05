import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { getGroupName, initDB } from '@/utils/database'
import { GroupNotExistsError, NotGroupMemberError } from '@/utils/errors'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    initDB()
    try {
      const group_id = req.query.group_id as string
      const group = await getGroupName(group_id)
      return res.status(200).json(group)
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
  return res.status(405).send('Method not allowed')
}
export default withSessionRoute(handle)
