import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { initDB, saveEmailToDB } from '../../../utils/database'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    initDB()
    const email = req.body.email
    const plan = req.body.plan

    if (email) {
      const success = await saveEmailToDB(email, plan)
      res.status(200).json({ success })
      return
    }
  }

  res.status(404).send('Not found')
})
