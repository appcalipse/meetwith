import { NextApiRequest, NextApiResponse } from 'next'

import { DEFAULT_MESSAGE } from '@/utils/constants'
import { getAccountFromDB } from '@/utils/database'

const getDefaultSignature = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  if (req.method === 'GET') {
    const { address } = req.query

    try {
      const account = await getAccountFromDB((address as string).toLowerCase())
      res
        .status(200)
        .json({ message: DEFAULT_MESSAGE(account.nonce), nonce: account.nonce })
    } catch (e) {
      const nonce = Number(Math.random().toString(8).substring(2, 10))
      return res.status(200).send({ message: DEFAULT_MESSAGE(nonce), nonce })
    }
  }
  return res.status(404).send('Not found')
}

export default getDefaultSignature
