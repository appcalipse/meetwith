import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { getDiscordInfoForAddress } from '@/utils/services/discord.helper'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  console.debug({ session: req.session })

  if (req.method === 'GET') {
    if (!req.session.account || !req.session.account.address) {
      return res.status(401).send('Unauthorized')
    }

    const discordUserInfo = await getDiscordInfoForAddress(
      req.session.account.address
    )

    if (!discordUserInfo) {
      return res.status(401).send('Unauthorized')
    }

    return res.status(200).json(discordUserInfo)
  }
}

export default withSentry(withSessionRoute(handle))
