import { addDays } from 'date-fns'
import { NextApiRequest, NextApiResponse } from 'next'

import { SchedulingType } from '@/types/Meeting'
import { ParticipantType, ParticipationStatus } from '@/types/ParticipantInfo'
import { DiscordMeetingRequest } from '@/types/Requests'
import { getSuggestedSlots } from '@/utils/api_helper'
import { scheduleMeeting } from '@/utils/calendar_manager'
import { getAccountFromDiscordId } from '@/utils/database'
import { findStartDateForNotBefore } from '@/utils/time.helper'

export default async function simpleDiscordMeet(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    const {
      schedulerDiscordId,
      accounts,
      duration,
      interval,
      title,
      description,
      notBefore,
    } = req.body as DiscordMeetingRequest

    const scheduler = await getAccountFromDiscordId(schedulerDiscordId)

    if (!scheduler) {
      return res
        .status(404)
        .send(
          "You don't have a Meet with Wallet account, or have not linked your Discord to it. Go to https://meetwithwallet.xyz to create or link it."
        )
    }

    let startDate = new Date()
    if (notBefore) {
      startDate = findStartDateForNotBefore(
        startDate,
        notBefore,
        scheduler.preferences?.timezone || 'UTC'
      )
    }

    const suggestions = await getSuggestedSlots(
      accounts.map(p => p.address),
      startDate,
      addDays(startDate, interval),
      duration
    )

    if (suggestions.length === 0) {
      return res
        .status(409)
        .send(
          `There is no slot that fits participants schedules in the next ${interval} days.`
        )
    }

    const slot = suggestions[0]

    const participants = accounts.map(_account => {
      return {
        account_address: _account.address,
        name: _account.preferences?.name,
        type:
          scheduler.address === _account.address
            ? ParticipantType.Scheduler
            : ParticipantType.Invitee,
        status:
          scheduler.address === _account.address
            ? ParticipationStatus.Accepted
            : ParticipationStatus.Pending,
        slot_id: '',
        meeting_id: '',
      }
    })

    try {
      const meeting = await scheduleMeeting(
        false,
        SchedulingType.DISCORD,
        'no_type',
        new Date(slot.start),
        new Date(slot.end),
        participants,
        scheduler,
        description,
        undefined,
        undefined,
        title
      )

      return res.status(200).json(meeting)
    } catch (e: any) {
      return res.status(e.status).send(e.message)
    }
  }

  return res.status(404).send('Not found')
}
