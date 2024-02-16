import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { DiscordAccount } from '@/types/Discord'
import {
  createOrUpdatesDiscordAccount,
  deleteDiscordAccount,
} from '@/utils/database'
import {
  generateDiscordAuthToken,
  getDiscordAccountInfo,
  getDiscordInfoForAddress,
} from '@/utils/services/discord.helper'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const { discordCode } = req.body

    try {
      const oAuthToken = await generateDiscordAuthToken(discordCode)

      const userInfo = await getDiscordAccountInfo(oAuthToken!)

      if (!userInfo) {
        return res.status(301).send('Could not get user info')
      }

      const discordAccount: DiscordAccount = {
        discord_id: userInfo!.id,
        address: req.session.account!.address!,
        access_token: oAuthToken!,
      }

      const result = await createOrUpdatesDiscordAccount(discordAccount)

      return res.status(200).json(result)
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
      return res.status(500).send(e)
    }
  } else if (req.method === 'GET') {
    const { address } = req.session.account!

    const discordInfo = await getDiscordInfoForAddress(address)

    return res.status(200).json(discordInfo)
  } else if (req.method === 'DELETE') {
    const account_id = req.session.account!.address

    await deleteDiscordAccount(account_id)

    return res.status(200).json({})
  }

  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
