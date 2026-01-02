import * as Sentry from '@sentry/nextjs'
import { Interval } from 'luxon'
import { NextApiRequest, NextApiResponse } from 'next'

import { Account } from '@/types/Account'
import { ConditionRelation } from '@/types/common'
import { getAccountFromDB } from '@/utils/database'
import { CalendarBackendHelper } from '@/utils/services/calendar.backend.helper'
import { suggestBestSlots } from '@/utils/slots.helper'
import { isValidEVMAddress } from '@/utils/validations'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
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
      const suggestedTimes = suggestBestSlots(
        startDate,
        duration,
        endDate,
        'UTC',
        busySlots,
        accounts
      )
      return res.status(200).json(
        suggestedTimes.map(slot => ({
          start: slot.start.toJSDate(),
          end: slot.end.toJSDate(),
        }))
      )
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
