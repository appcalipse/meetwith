import { withSentry } from '@sentry/nextjs'
import * as Sentry from '@sentry/node'
import { NextApiRequest, NextApiResponse } from 'next'

import {
  DiscordNotificationType,
  NotificationChannel,
} from '../../../../types/AccountNotifications'
import { withSessionRoute } from '../../../../utils/auth/withSessionApiRoute'
import { initDB } from '../../../../utils/database'
import {
  generateDiscordAuthToken,
  getDiscordAccountInfo,
} from '../../../../utils/services/discord_helper'

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

      res.status(200).json(newNotification)
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
      res.status(500).send(e)
    }

    return
  }

  res.status(404).send('Not found')
}

export default withSentry(withSessionRoute(handle))
