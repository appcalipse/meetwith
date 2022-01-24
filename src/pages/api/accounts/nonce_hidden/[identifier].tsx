import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { getAccountNonce, initDB } from '../../../../utils/database'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    initDB()

    const nonce = await getAccountNonce(req.query.identifier as string)
    res.status(200).json({ nonce })
    return
  }

  res.status(404).send('Not found')
})
