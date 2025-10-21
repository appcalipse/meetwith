import { ConnectedAccount } from '@meta/ConnectedAccounts'
import Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  getActivePaymentAccount,
  getDiscordAccountAndInfo,
  getTelegramAccountAndInfo,
} from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const account_address = req.session.account!.address
      const [discord, telegram, payment_account] = await Promise.all([
        getDiscordAccountAndInfo(account_address),
        getTelegramAccountAndInfo(account_address).catch(error => {
          console.error('Error fetching Telegram account info:', error)
          Sentry.captureException(error)
          return null
        }),
        getActivePaymentAccount(account_address),
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
          info: payment_account,
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
