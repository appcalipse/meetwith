import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { getGroupFromDB, initDB } from '@/utils/database'
import { GroupNotExistsError, NotGroupMemberError } from '@/utils/errors'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    initDB()
    const account_address = req.session.account!.address
    if (!account_address) {
      return res.status(401).send('Unauthorized')
    }
    try {
      const group_id = req.query.group_id as string
      const group = await getGroupFromDB(group_id, account_address)
      return res.status(200).json(group)
    } catch (error) {
      console.log(error)
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
