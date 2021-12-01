import { NextApiRequest, NextApiResponse } from 'next'
import { initAccountDBForWallet, initDB } from '../../../utils/database'

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    initDB()

    const account = await initAccountDBForWallet(
      req.body.address,
      req.body.signature
    )

    res.status(200).json(account)
    return
  }

  res.status(404).send('Not found')
}
