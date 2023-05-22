import { withSentry } from '@sentry/nextjs'
import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  DiscordNotificationType,
  NotificationChannel,
} from '@/types/AccountNotifications'
import { initDB } from '@/utils/database'
import {
  generateDiscordAuthToken,
  getDiscordAccountInfo,
} from '@/utils/services/discord.helper'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    initDB()

    const { discordCode } = req.body

    try {
      const oAuthToken = await generateDiscordAuthToken(discordCode)

      const userInfo = await getDiscordAccountInfo(oAuthToken!)

      const newNotification: DiscordNotificationType = {
        channel: NotificationChannel.DISCORD,
        destination: userInfo!.id,
        disabled: !userInfo!.isInMWWServer,
        accessToken: oAuthToken!,
        inMWWServer: userInfo!.isInMWWServer,
      }

      return res.status(200).json(newNotification)
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
      return res.status(500).send(e)
    }
  }

  return res.status(404).send('Not found')
}

export default withSentry(withSessionRoute(handle))
