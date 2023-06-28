import { addMinutes } from 'date-fns'
import { NextApiRequest, NextApiResponse } from 'next'

import { ParticipantType, ParticipationStatus } from '@/types/ParticipantInfo'
import { DiscordMeetingRequest, DiscordMeetingResponse } from '@/types/Requests'

export default async function simpleDiscordMeet(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    console.log(req.body)
    const request = req.body as DiscordMeetingRequest

    return res.status(200).json({
      meetingInfo: {
        id: 'some_uuid',
        created_at: new Date(),
        meeting_info_file_path: 'string',
        version: 1,
        source: 'mww',
        account_address: 'the scheduler 0xAddress',
        start: new Date(),
        end: addMinutes(new Date(), request.duration),
        participants: [
          {
            account_address: '',
            name: 'string',
            status: ParticipationStatus.Accepted,
            meeting_id: '',
            slot_id: '',
            type: ParticipantType.Scheduler,
          },
          {
            account_address: '',
            name: 'string 2',
            status: ParticipationStatus.Pending,
            meeting_id: '',
            slot_id: '',
            type: ParticipantType.Invitee,
          },
        ],
        meeting_id: '',
        meeting_url: 'https://meethere',
        title: 'a meeting title',
        content: '',
        related_slot_ids: [],
      },
      discordParticipantIds: request.discordParticipantIds,
      discordParticipantsNotAvailable: ['string1', 'string2'],
      discordParticipantsWithoutAccountIds: ['string1', 'string2'],
    } as DiscordMeetingResponse)
  }

  return res.status(404).send('Not found')
}
