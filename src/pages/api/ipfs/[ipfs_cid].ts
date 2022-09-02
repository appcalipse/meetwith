import { withSentry } from '@sentry/nextjs'
import * as Sentry from '@sentry/node'
import { NextApiRequest, NextApiResponse } from 'next'

import { fetchContentFromIPFS } from '@/utils/ipfs_helper'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const object = await fetchContentFromIPFS(req.query.ipfs_cid as string)
      res.json(object)
    } catch (e) {
      Sentry.captureException(e)
    }
    return
  }
  res.status(404).send('Not found')
})
