import { NextApiRequest, NextApiResponse } from 'next'

import { getAccountFromDB } from '@/utils/database'

const getAccount = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const rawIdentifier = req.query.identifier
    const identifier = Array.isArray(rawIdentifier) ? rawIdentifier[0] : rawIdentifier

    try {
      const account = await getAccountFromDB(identifier as string, true)
      return res.status(200).json(account ? { ...account } : null)
    } catch (_e) {
      return res.status(404).send('Not found')
    }
  }
  return res.status(404).send('Not found')
}

export default getAccount
