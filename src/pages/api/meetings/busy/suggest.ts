import { areIntervalsOverlapping, isPast } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'
import { NextApiRequest, NextApiResponse } from 'next'

import { Account } from '@/types/Account'
import { ConditionRelation } from '@/types/common'
import { getAccountFromDB } from '@/utils/database'
import { CalendarBackendHelper } from '@/utils/services/calendar.backend.helper'
import {
  generateTimeSlots,
  isTimeInsideAvailabilities,
} from '@/utils/slots.helper'
import { isValidEVMAddress } from '@/utils/validations'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const { body } = req

    const addresses: string[] = Array.from(new Set<string>(body.addresses))
    const startDate = new Date(body.startDate)
    const endDate = new Date(body.endDate)
    const duration = body.duration

    const sanitizedAddresses = addresses.filter(address =>
      isValidEVMAddress(address)
    )

    const accounts: Account[] = []
    const getAccount = async (address: string) => {
      try {
        accounts.push(await getAccountFromDB(address))
      } catch (error) {
        //if account doesn't exist, just ignore
      }
    }
    const promises = []
    for (const address of sanitizedAddresses) {
      promises.push(getAccount(address))
    }
    await Promise.all(promises)

    const allSlots = generateTimeSlots(startDate, duration, true, endDate)
    const suggestedTimes: Interval[] = []

    const busySlots: Interval[] =
      await CalendarBackendHelper.getMergedBusySlotsForMultipleAccounts(
        sanitizedAddresses,
        ConditionRelation.AND,
        startDate,
        endDate
      )

    for (const slot of allSlots) {
      let validSlot = true
      if (isPast(slot.start as Date)) {
        validSlot = false
        break
      }
      for (const account of accounts) {
        const availabilities = account.preferences.availabilities
        const tz = account.preferences.timezone
        if (
          !isTimeInsideAvailabilities(
            utcToZonedTime(slot.start as Date, tz),
            utcToZonedTime(slot.end as Date, tz),
            availabilities
          )
        ) {
          validSlot = false
          break
        }
      }

      if (validSlot) {
        let overLappingSlot = false
        for (const busySlot of busySlots) {
          if (areIntervalsOverlapping(busySlot, slot)) {
            overLappingSlot = true
            break
          }
        }
        if (!overLappingSlot) {
          suggestedTimes.push(slot)
        }
      }
    }

    return res.status(200).json(suggestedTimes)
  }
  return res.status(404).send('Not found')
}

export default handler
