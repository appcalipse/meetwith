import { NextApiRequest, NextApiResponse } from 'next'

import { getAccountFromDiscordId } from '@/utils/database'

export default async function discordInfo(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { discord_id } = req.query

    const account = await getAccountFromDiscordId(discord_id! as string)

    if (!account) {
      return res.status(404).send("Account doesn't exist or isn't linked.")
    } else {
      return res.status(200).json({
        ...account,
      })
    }
  }

  return res.status(404).send('Not found')
}
