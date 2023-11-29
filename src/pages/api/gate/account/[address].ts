import { NextApiRequest, NextApiResponse } from 'next'

import { getGateConditionsForAccount } from '@/utils/database'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { address } = req.query

    const gateConditions = await getGateConditionsForAccount(address as string)
    return res.status(200).json(gateConditions)
  }
  return res.status(404).send('Not found')
}

export default handler
