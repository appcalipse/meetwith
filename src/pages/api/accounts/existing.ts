import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { getExistingAccountsFromDB } from '../../../utils/database'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const { addresses, fullInformation } = req.body

    const accounts = await getExistingAccountsFromDB(
      addresses as string[],
      fullInformation
    )
    res.status(200).json(accounts)
  }
})
