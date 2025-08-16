import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { getDiscordInfoForAddress } from '@/utils/services/discord.helper'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    if (!req.session.account || !req.session.account.address) {
      return res.status(401).send('Unauthorized')
    }

    const discordUserInfo = await getDiscordInfoForAddress(
      req.session.account.address
    )

    if (!discordUserInfo) {
      return res.status(400).send('No Discord user information found')
    }

    return res.status(200).json(discordUserInfo)
  }
}

export default withSessionRoute(handle)
