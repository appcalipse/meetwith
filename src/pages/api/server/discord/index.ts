import { NextApiRequest, NextApiResponse } from 'next'

import { Account } from '@/types/Account'
import {
  DiscordAccountInfoRequest,
  DiscordAccountInfoResponse,
} from '@/types/Requests'
import { getAccountFromDiscordId } from '@/utils/database'

export default async function discordInfo(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    const request = req.body as DiscordAccountInfoRequest

    const account = await getAccountFromDiscordId(request.scheduler_discord_id)

    if (!account) {
      return res
        .status(404)
        .send(
          "You don't have a MWW account, or have not linked to your Discord one. Go to https://meetwith.xyz to create or link it."
        )
    }

    const accounts: Account[] = []
    const linked_accounts: string[] = []
    const not_linked_accounts: string[] = []

    const participantsIdsSet = new Set(request.participantsDiscordIds)

    await Promise.all(
      [...participantsIdsSet].map(async discordId => {
        const account = await getAccountFromDiscordId(discordId)
        if (account) {
          linked_accounts.push(discordId)
          accounts.push(account)
        } else {
          not_linked_accounts.push(discordId)
        }
      })
    )

    if (accounts.map(a => a.address).indexOf(account.address) === -1) {
      accounts.push(account)
    }

    return res.status(200).json({
      accounts,
      discordParticipantIds: linked_accounts,
      discordParticipantsWithoutAccountIds: not_linked_accounts,
    } as DiscordAccountInfoResponse)
  }

  return res.status(404).send('Not found')
}
