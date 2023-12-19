import { NextApiRequest, NextApiResponse } from 'next'

import { getAccountCalendarUrl } from '@/utils/calendar_manager'
import { getAccountFromDB } from '@/utils/database'

const getAccountUrl = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { identifier } = req.query
    try {
      const account = await getAccountFromDB(identifier as string)
      if (account.is_invited) {
        return res.status(404).send('Not found')
      }
      return res
        .status(200)
        .json({ calendar_url: getAccountCalendarUrl(account) })
    } catch (e) {
      return res.status(404).send('Not found')
    }
  }
  return res.status(404).send('Not found')
}

export default getAccountUrl
