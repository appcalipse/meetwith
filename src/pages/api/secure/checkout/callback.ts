import { ConnectedAccount } from '@meta/ConnectedAccounts'
import Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  getDiscordAccountAndInfo,
  getTelegramAccountAndInfo,
} from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const account_id = req.session.account!.address
      const [discord, telegram] = await Promise.all([
        getDiscordAccountAndInfo(account_id),
        getTelegramAccountAndInfo(account_id),
      ])
      const connectedAccounts = [
        {
          account: ConnectedAccount.DISCORD,
          info: discord || null,
        },
        {
          account: ConnectedAccount.TELEGRAM,
          info: telegram || null,
        },
        {
          account: ConnectedAccount.STRIPE,
          info: null,
        },
      ]
      return res.status(200).json(connectedAccounts)
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
      return res.status(500).send('An unexpected error occurred.')
    }
  }
  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
