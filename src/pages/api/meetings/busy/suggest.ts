import * as Sentry from '@sentry/nextjs'
import { Interval as DateFnsInterval } from 'date-fns'
import { DateTime, Interval } from 'luxon'
import { NextApiRequest, NextApiResponse } from 'next'

import { Account } from '@/types/Account'
import { ConditionRelation } from '@/types/common'
import { getAccountFromDB } from '@/utils/database'
import { parseMonthAvailabilitiesToDate } from '@/utils/date_helper'
import { CalendarBackendHelper } from '@/utils/services/calendar.backend.helper'
import { generateTimeSlots } from '@/utils/slots.helper'
import { isValidEVMAddress } from '@/utils/validations'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const { body } = req

      const addresses: string[] = Array.from(new Set<string>(body.addresses))
      const startDate = new Date(body.startDate)
      const endDate = new Date(body.endDate)
      const duration = body.duration
      const includePast = body.includePast

      const sanitizedAddresses = addresses.filter(address =>
        isValidEVMAddress(address)
      )

      const accounts: Account[] = []
      const getAccount = async (address: string) => {
        try {
          const account = await getAccountFromDB(address)
          accounts.push(account)
        } catch (error) {
          //if account doesn't exist, just ignore
        }
      }
      const promises = []
      for (const address of sanitizedAddresses) {
        promises.push(getAccount(address))
      }
      await Promise.all(promises)
      const allSlots: Interval<true>[] = generateTimeSlots(
        startDate,
        duration || 30,
        true,
        undefined,
        endDate
      ).filter(slot => slot.isValid)
      const suggestedTimes: DateFnsInterval[] = []

      const busySlots: Interval[] =
        await CalendarBackendHelper.getMergedBusySlotsForMultipleAccounts(
          accounts.map(account => account.address),
          ConditionRelation.AND,
          startDate,
          endDate
        ).then(busySlots =>
          busySlots.map(busySlot => {
            return Interval.fromDateTimes(
              new Date(busySlot.start),
              new Date(busySlot.end)
            )
          })
        )
      for (const slot of allSlots) {
        let validSlot = true
        if (slot.start < DateTime.now() && !includePast) {
          validSlot = false
          break
        }
        for (const account of accounts) {
          const tz = account.preferences.timezone
          const availabilities = parseMonthAvailabilitiesToDate(
            account.preferences.availabilities || [],
            slot.start?.startOf('day').setZone(tz).toJSDate(),
            slot.end?.endOf('day').setZone(tz).toJSDate(),
            account.preferences.timezone || 'UTC'
          )

          if (
            !availabilities.some(availability => availability.overlaps(slot))
          ) {
            validSlot = false
            break
          }
        }

        if (validSlot) {
          let overLappingSlot = false
          for (const busySlot of busySlots) {
            if (busySlot.overlaps(slot)) {
              overLappingSlot = true
              break
            }
          }
          if (!overLappingSlot) {
            suggestedTimes.push({
              start: slot.start.toJSDate(),
              end: slot.end.toJSDate(),
            })
          }
        }
      }

      return res.status(200).json(suggestedTimes)
    } catch (e) {
      Sentry.captureException(e, {
        extra: {
          startDate: req.body.startDate,
          endDate: req.body.endDate,
          addresses: req.body.addresses,
        },
      })
      return res.status(500).send('An unexpected error occurred.')
    }
  }
  return res.status(404).send('Not found')
}

export default handler
