import { addDays } from 'date-fns'
import { NextApiRequest, NextApiResponse } from 'next'

import { Account } from '@/types/Account'
import { SchedulingType } from '@/types/Meeting'
import { ParticipantType, ParticipationStatus } from '@/types/ParticipantInfo'
import { DiscordMeetingRequest, DiscordMeetingResponse } from '@/types/Requests'
import { getSuggestedSlots } from '@/utils/api_helper'
import { scheduleMeeting } from '@/utils/calendar_manager'
import { getAccountFromDiscordId } from '@/utils/database'

export default async function simpleDiscordMeet(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    const request = req.body as DiscordMeetingRequest

    const account = await getAccountFromDiscordId(request.scheduler_discord_id)

    if (!account) {
      return res
        .status(404)
        .send(
          "You don't have a MWW account, or have not linked to your Discord one. Go to https://meetwithwallet.xyz to create or link it."
        )
    }

    const accounts: Account[] = []
    const linked_accounts: string[] = []
    const not_linked_accounts: string[] = []

    await Promise.all(
      request.participantsDiscordIds.map(async discordId => {
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

    if (accounts.length < 2) {
      return res
        .status(403)
        .send("You can't schedule a meeting with less than 2 participants.")
    }

    const startDate = new Date()
    const suggestions = await getSuggestedSlots(
      accounts.map(p => p.address),
      startDate,
      addDays(startDate, request.interval),
      request.duration
    )

    if (suggestions.length === 0) {
      return res
        .status(409)
        .send(
          `There is no slot that fits participants schedules in the next ${request.interval} days.`
        )
    }

    const slot = suggestions[0]

    const participants = accounts.map(_account => {
      return {
        account_address: _account.address,
        name: _account.preferences?.name,
        type:
          account.address === _account.address
            ? ParticipantType.Scheduler
            : ParticipantType.Invitee,
        status:
          account.address === _account.address
            ? ParticipationStatus.Accepted
            : ParticipationStatus.Pending,
        slot_id: '',
        meeting_id: '',
      }
    })

    try {
      const meeting = await scheduleMeeting(
        SchedulingType.DISCORD,
        'no_type',
        new Date(slot.start),
        new Date(slot.end),
        participants,
        account,
        'Scheduled from Discord'
      )

      return res.status(200).json({
        meetingInfo: meeting,
        discordParticipantIds: linked_accounts,
        discordParticipantsNotAvailable: [],
        discordParticipantsWithoutAccountIds: not_linked_accounts,
      } as DiscordMeetingResponse)
    } catch (e: any) {
      return res.status(e.status).send(e.message)
    }
  }

  return res.status(404).send('Not found')
}
