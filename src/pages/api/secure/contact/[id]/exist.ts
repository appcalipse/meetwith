import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { checkContactExists, initDB } from '@/utils/database'
const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  const account_address = req.session.account!.address
  if (!account_address) {
    return res.status(401).send('Unauthorized')
  }
  if (req.method === 'GET') {
    initDB()
    try {
      const dbResult = await checkContactExists(
        account_address,
        typeof req.query.id === 'string' ? req.query.id : ''
      )
      return res.status(200).json(dbResult)
    } catch (e) {
      return res.status(500).send(e)
    }
  }
  return res.status(405).send('Method not allowed')
}
export default withSessionRoute(handle)
