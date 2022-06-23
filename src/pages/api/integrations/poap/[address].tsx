import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { fetchWalletPOAPs } from '@/utils/services/poap.helper'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const poaps = await fetchWalletPOAPs(req.query.address as string)
    res.status(200).json(poaps)
    return
  }

  res.status(404).send('Not found')
})
