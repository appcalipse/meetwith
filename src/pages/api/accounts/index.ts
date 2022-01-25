import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { initAccountDBForWallet, initDB } from '../../../utils/database'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    initDB()

    const account = await initAccountDBForWallet(
      req.body.address,
      req.body.signature,
      req.body.timezone,
      req.body.nonce
    )

    res.status(200).json(account)
    return
  }

  res.status(404).send('Not found')
})
