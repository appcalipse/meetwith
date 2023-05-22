import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { getGateCondition } from '../../../utils/database'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { id } = req.query

    const gateConditionObject = await getGateCondition(id as string)
    if (gateConditionObject) {
      return res.status(200).json(gateConditionObject)
    } else {
      return res.status(404).send('Not found')
    }
  }
  return res.status(404).send('Not found')
})
