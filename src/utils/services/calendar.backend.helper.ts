import * as Sentry from '@sentry/node'
import {
  areIntervalsOverlapping,
  compareAsc,
  Interval,
  max,
  min,
} from 'date-fns'

import { TimeSlot, TimeSlotSource } from '@/types/Meeting'

import { getConnectedCalendars, getSlotsForAccount } from '../database'
import { getConnectedCalendarIntegration } from './connected_calendars.factory'

export const CalendarBackendHelper = {
  getBusySlotsForAccount: async (
    account_address: string,
    startDate: Date,
    endDate: Date,
    includeSources: boolean,
    limit?: number,
    offset?: number
  ): Promise<Interval[] | TimeSlot[]> => {
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
          start: new Date(it.start),
          end: new Date(it.end),
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

    if (!includeSources) {
      return busySlots.map(it => ({
        start: it.start,
        end: it.end,
      }))
    } else {
      return busySlots
    }
  },

  getBusySlotsForMultipleAccounts: async (
    account_addresses: string[],
    startDate: Date,
    endDate: Date,
    limit?: number,
    offset?: number
  ): Promise<TimeSlot[] | Interval[]> => {
    const busySlots: Interval[] = []

    const addSlotsForAccount = async (account: string) => {
      busySlots.push(
        ...(await CalendarBackendHelper.getBusySlotsForAccount(
          account,
          startDate,
          endDate,
          false,
          limit,
          offset
        ))
      )
    }

    const promises: Promise<void>[] = []

    for (const address of account_addresses) {
      promises.push(addSlotsForAccount(address))
    }

    await Promise.all(promises)

    return busySlots
  },

  getMergedBusySlotsForMultipleAccounts: async (
    account_addresses: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Interval[]> => {
    const busySlots =
      await CalendarBackendHelper.getBusySlotsForMultipleAccounts(
        account_addresses,
        startDate,
        endDate
      )

    return CalendarBackendHelper.mergeSlots(busySlots)
  },

  mergeSlots: (slots: TimeSlot[] | Interval[]): Interval[] => {
    slots.sort((a, b) => compareAsc(a.start, b.start))

    const merged: Interval[] = []
    let i = 0

    merged[i] = { start: slots[i].start, end: slots[i].end }
    for (const slot of slots) {
      if (areIntervalsOverlapping(merged[i], slot, { inclusive: true })) {
        merged[i].start = min([merged[i].start, slot.start])
        merged[i].end = max([merged[i].end, slot.end])
      } else {
        i++
        merged[i] = { start: slot.start, end: slot.end }
      }
    }

    return merged
  },
}
