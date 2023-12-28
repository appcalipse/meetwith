import { NextApiRequest, NextApiResponse } from 'next'

import { getAccountNonce, initDB } from '@/utils/database'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    initDB()

    const nonce = await getAccountNonce(req.query.identifier as string)
    return res.status(200).json({ nonce })
  }

  return res.status(404).send('Not found')
}

export default handler
