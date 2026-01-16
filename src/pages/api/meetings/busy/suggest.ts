import * as Sentry from '@sentry/nextjs'
import { Interval } from 'luxon'
import { NextApiRequest, NextApiResponse } from 'next'

import { Account } from '@/types/Account'
import { AvailabilityBlock } from '@/types/availability'
import { ConditionRelation } from '@/types/common'
import {
  getAccountFromDB,
  getExistingAccountsFromDB,
  getGroupMembersAvailabilities,
} from '@/utils/database'
import { parseMonthAvailabilitiesToDate } from '@/utils/date_helper'
import { mergeAvailabilityBlocks } from '@/utils/schedule.helper'
import { CalendarBackendHelper } from '@/utils/services/calendar.backend.helper'
import { AccountAvailabilities, suggestBestSlots } from '@/utils/slots.helper'
import { isValidEVMAddress } from '@/utils/validations'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const { body } = req

      const addresses: string[] = Array.from(new Set<string>(body.addresses))
      const startDate = new Date(body.startDate)
      const endDate = new Date(body.endDate)
      const groupId = body.groupId
      const duration = body.duration
      const sanitizedAddresses = addresses.filter(address =>
        isValidEVMAddress(address)
      )
      const promises: [
        Promise<Account[]>,
        Promise<Interval[]>,
        Promise<Record<string, AvailabilityBlock[]>> | undefined
      ] = [
        getExistingAccountsFromDB(sanitizedAddresses, true),
        CalendarBackendHelper.getMergedBusySlotsForMultipleAccounts(
          sanitizedAddresses,
          ConditionRelation.AND,
          startDate,
          endDate,
          true
        ).then(busySlots =>
          busySlots.map(busySlot => {
            return Interval.fromDateTimes(
              new Date(busySlot.start),
              new Date(busySlot.end)
            )
          })
        ),
        undefined,
      ]

      if (groupId) {
        promises[2] = getGroupMembersAvailabilities(groupId)
      }
      const [accounts, busySlots, grouMembersAvailaibilities] =
        await Promise.all(promises)

      const accountAvailaibilities: Record<string, AccountAvailabilities> = {}
      for (const account of accounts) {
        accountAvailaibilities[account.address] = {
          address: account.address,
          availabilities: parseMonthAvailabilitiesToDate(
            account.preferences.availabilities || [],
            startDate,
            endDate,
            account.preferences.timezone || 'UTC'
          ),
        }
      }

      if (grouMembersAvailaibilities) {
        for (const account of accounts) {
          const groupAvailaibility = grouMembersAvailaibilities[account.address]
          if (groupAvailaibility && groupAvailaibility.length > 0) {
            accountAvailaibilities[account.address] = {
              address: account.address,
              availabilities: mergeAvailabilityBlocks(
                groupAvailaibility,
                startDate,
                endDate
              ),
            }
          }
        }
      }
      const suggestedTimes = suggestBestSlots(
        startDate,
        duration,
        endDate,
        'UTC',
        busySlots,
        Object.values(accountAvailaibilities)
      ).map(slot => ({
        end: slot.end.toJSDate(),
        start: slot.start.toJSDate(),
      }))

      return res.status(200).json(suggestedTimes)
    } catch (e) {
      console.error(e)
      Sentry.captureException(e, {
        extra: {
          addresses: req.body.addresses,
          endDate: req.body.endDate,
          startDate: req.body.startDate,
        },
      })
      return res.status(500).send('An unexpected error occurred.')
    }
  }
  return res.status(404).send('Not found')
}

export default handler
