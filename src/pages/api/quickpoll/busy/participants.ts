import { Interval } from 'date-fns'
import { NextApiRequest, NextApiResponse } from 'next'

import { ConditionRelation } from '@/types/common'
import { TimeSlot } from '@/types/Meeting'
import { QuickPollBusyParticipant } from '@/types/QuickPoll'
import { initDB } from '@/utils/database'
import { CalendarBackendHelper } from '@/utils/services/calendar.backend.helper'
import { isValidEVMAddress } from '@/utils/validations'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    if (req.method === 'POST') {
      initDB()
      const { body } = req

      const participants: QuickPollBusyParticipant[] = body.participants || []
      const startDate = new Date(body.start)
      const endDate = new Date(body.end)
      const relation: ConditionRelation = body.relation
      const isRaw = body.isRaw

      // Validate participants
      const validParticipants = participants.filter(participant => {
        if (participant.account_address) {
          return isValidEVMAddress(participant.account_address)
        }
        if (participant.participant_id) {
          return (
            typeof participant.participant_id === 'string' &&
            participant.participant_id.length > 0
          )
        }
        return false
      })

      const busySlots: Array<Interval | TimeSlot> =
        await CalendarBackendHelper.getMergedBusySlotsForQuickPollParticipants(
          validParticipants,
          relation,
          startDate,
          endDate,
          isRaw
        )

      return res.status(200).json(busySlots)
    }
  } catch (error) {
    return res.status(500).send(error)
  }
  return res.status(404).send('Not found')
}

export default handler
