import { NextApiRequest, NextApiResponse } from 'next'

import { ConditionRelation } from '@/types/common'
import { TimeSlot } from '@/types/Meeting'
import { initDB } from '@/utils/database'
import { CalendarBackendHelper } from '@/utils/services/calendar.backend.helper'
import { isValidEVMAddress } from '@/utils/validations'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    if (req.method === 'POST') {
      initDB()
      const { body } = req

      const addresses: string[] = Array.from(new Set<string>(body.addresses))
      const startDate = new Date(body.start)
      const endDate = new Date(body.end)
      const relation: ConditionRelation = body.relation
      const isRaw = body.isRaw

      const sanitizedAddresses = addresses.filter(address =>
        isValidEVMAddress(address)
      )

      const busySlots: Array<Interval | TimeSlot> =
        await CalendarBackendHelper.getMergedBusySlotsForMultipleAccounts(
          sanitizedAddresses,
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
