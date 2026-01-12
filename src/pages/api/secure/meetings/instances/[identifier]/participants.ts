import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { MeetingCancelSyncRequest } from '@/types/Meeting'
import { ParseParticipantsRequest } from '@/types/Requests'
import { getSeriesIdMapping, handleMeetingCancelSync } from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const instance_id = req.query.identifier as string
    const { participants } = req.body as ParseParticipantsRequest
    const slotIds = participants.map(p => p.slot_id.split('_')[0])
    const slotMap = await getSeriesIdMapping(slotIds)
    const instance_id_parts = instance_id.split('_')[1]
    const result = []
    for (const participant of participants) {
      const slot_id = participant.slot_id.split('_')[0]
      const series_id = slotMap.get(participant.slot_id.split('_')[0])
      if (series_id) {
        result.push({
          ...participant,
          slot_id: `${slot_id}_${instance_id_parts}`,
        })
      } else {
        result.push({ ...participant, slot_id })
      }
    }
    return res.status(200).json(result)
  }
}

export default withSessionRoute(handle)
