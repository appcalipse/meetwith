import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { getGroupsEmpty, initDB } from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    initDB()
    const account_address = req.session.account!.address
    if (!account_address) {
      return res.status(401).send('Unauthorized')
    }
    try {
      const groups = await getGroupsEmpty(account_address)
      return res.status(200).json(groups)
    } catch (e) {
      return res.status(500).send(e)
    }
  }
}
export default withSessionRoute(handle)
