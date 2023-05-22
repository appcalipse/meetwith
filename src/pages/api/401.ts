import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  return res.status(401).send('Auth required')
})
