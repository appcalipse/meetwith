import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { getAccountFromDBPublic } from '@/utils/database'

const getAccount = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { identifier } = req.query

    try {
      const account = await getAccountFromDBPublic(identifier as string)
      return res.status(200).json(account)
    } catch (_e) {
      return res.status(404).send('Not found')
    }
  }
  return res.status(404).send('Not found')
}

export default withSessionRoute(getAccount)
