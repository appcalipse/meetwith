import * as Sentry from '@sentry/node'

import { TimeSlot, TimeSlotSource } from '@/types/Meeting'

import { getConnectedCalendars, getSlotsForAccount } from '../database'
import { getConnectedCalendarIntegration } from './connected_calendars.factory'

export const CalendarBackendHelper = {
  getBusySlotsForAccount: async (
    account_address: string,
    startDate: Date,
    endDate: Date,
    limit?: number,
    offset?: number
  ): Promise<TimeSlot[]> => {
    const busySlots: TimeSlot[] = []

    const getMWWEvents = async () => {
      const meetings = await getSlotsForAccount(
        account_address,
        startDate,
        endDate,
        limit,
        offset
      )

      busySlots.push(
        ...meetings.map(it => ({
          start: it.start,
          end: it.end,
          source: TimeSlotSource.MWW,
          account_address,
        }))
      )
    }

    const getIntegratedCalendarEvents = async () => {
      const calendars = await getConnectedCalendars(account_address, {
        activeOnly: true,
      })

      await Promise.all(
        calendars.map(async calendar => {
          const integration = getConnectedCalendarIntegration(
            account_address,
            calendar.email,
            calendar.provider,
            calendar.payload
          )

          try {
            const externalSlots = await integration.getAvailability(
              startDate!.toISOString(),
              endDate!.toISOString()
            )
            busySlots.push(
              ...externalSlots.map(it => ({
                start: new Date(it.start),
                end: new Date(it.end),
                source: calendar.provider,
                account_address,
              }))
            )
          } catch (e: any) {
            Sentry.captureException(e)
          }
        })
      )
    }

    await Promise.all([getMWWEvents(), getIntegratedCalendarEvents()])

    return busySlots
  },

  getBusySlotsForMultipleAccounts: async (
    account_addresses: string[],
    startDate: Date,
    endDate: Date,
    limit?: number,
    offset?: number
  ): Promise<TimeSlot[]> => {
    const busySlots: TimeSlot[] = []

    const addSlotsForAccount = async (account: string) => {
      busySlots.push(
        ...(await CalendarBackendHelper.getBusySlotsForAccount(
          account,
          startDate,
          endDate,
          limit,
          offset
        ))
      )
    }

    const promises: Promise<void>[] = []

    for (const address of account_addresses) {
      promises.push(addSlotsForAccount(address))
    }

    Promise.all(promises)

    return busySlots
  },
}
