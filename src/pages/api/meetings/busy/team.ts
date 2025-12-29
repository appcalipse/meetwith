import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
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

      const currentUserAddress =
        req.session.account?.address?.toLowerCase() || null

      // Filter event details: only include detailed event info for current user
      // For other users, only return basic busy time info
      const filteredSlots = isRaw
        ? busySlots.map(slot => {
            const timeSlot = slot as TimeSlot
            const slotAccountAddress = timeSlot.account_address?.toLowerCase()
            const isCurrentUser =
              currentUserAddress && slotAccountAddress === currentUserAddress

            if (isCurrentUser) {
              // Return full details for current user
              return slot
            } else {
              // For other users, return only basic info
              // Remove event details: eventTitle, eventId, eventWebLink, eventEmail
              return {
                start: slot.start,
                end: slot.end,
                source: timeSlot.source,
                account_address: timeSlot.account_address,
              }
            }
          })
        : busySlots

      return res.status(200).json(filteredSlots)
    }
  } catch (error) {
    return res.status(500).send(error)
  }
  return res.status(404).send('Not found')
}

export default withSessionRoute(handler)
