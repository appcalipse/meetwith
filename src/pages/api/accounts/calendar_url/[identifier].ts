import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { getAccountCalendarUrl } from '../../../../utils/calendar_manager'
import { getAccountFromDB } from '../../../../utils/database'

const getAccountUrl = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { identifier } = req.query
    try {
      const account = await getAccountFromDB(identifier as string)
      res.status(200).json({ calendar_url: getAccountCalendarUrl(account) })
    } catch (e) {
      res.status(404).send('Not found')
    }
  }
}

export default withSentry(getAccountUrl)
