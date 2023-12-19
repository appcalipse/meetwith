import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { fetchContentFromIPFS } from '@/utils/ipfs_helper'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const object = await fetchContentFromIPFS(req.query.ipfs_cid as string)
      return res.json(object)
    } catch (e) {
      Sentry.captureException(e)
    }
    return res.status(404).send('Not found')
  }
  return res.status(404).send('Not found')
}

export default handler
