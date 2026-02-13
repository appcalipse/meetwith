import { NextApiRequest, NextApiResponse } from 'next'

import { getCalendarPrimaryEmail } from '@/utils/sync_helper'

const getAccountUrl = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { targetAccount } = req.query
    try {
      const email = await getCalendarPrimaryEmail(targetAccount as string)

      return res.status(200).json({ email })
    } catch (_e) {
      return res.status(404).send('Not found')
    }
  }
  return res.status(404).send('Not found')
}

export default getAccountUrl
