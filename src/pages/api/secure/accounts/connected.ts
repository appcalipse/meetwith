import { ConnectedAccount } from '@meta/ConnectedAccounts'
import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { MeetingProvider } from '@/types/Meeting'
import {
  getActivePaymentAccount,
  getConnectedMeetingProviders,
  getDiscordAccountAndInfo,
  getTelegramAccountAndInfo,
} from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const account_address = req.session.account!.address
      const [discord, telegram, payment_account, meeting_providers] =
        await Promise.all([
          getDiscordAccountAndInfo(account_address),
          getTelegramAccountAndInfo(account_address),
          getActivePaymentAccount(account_address),
          getConnectedMeetingProviders(account_address),
        ])
      const google_meet = meeting_providers?.find(
        p => p.provider === MeetingProvider.GOOGLE_MEET
      )
      const zoom = meeting_providers?.find(
        p => p.provider === MeetingProvider.ZOOM
      )

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
        {
          account: ConnectedAccount.GOOGLE_MEET,
          info: google_meet
            ? { ...google_meet, username: google_meet.email }
            : null,
        },
        {
          account: ConnectedAccount.ZOOM,
          info: zoom ? { ...zoom, username: zoom.email } : null,
        },
      ]

      meeting_providers?.forEach(provider => {
        if (
          provider.provider !== MeetingProvider.GOOGLE_MEET &&
          provider.provider !== MeetingProvider.ZOOM
        ) {
          connectedAccounts.push({
            account: provider.provider as unknown as ConnectedAccount,
            info: { ...provider, username: provider.email },
          })
        }
      })
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
