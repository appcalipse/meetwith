import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DateTime, Interval } from 'luxon'
import * as React from 'react'

import useAccountContext from '@/hooks/useAccountContext'
import { UnifiedEvent, WithInterval } from '@/types/Calendar'
import {
  CalendarSyncInfo,
  ConnectedCalendarCore,
} from '@/types/CalendarConnections'
import { MeetingDecrypted } from '@/types/Meeting'
import { getEvents, listConnectedCalendars } from '@/utils/api_helper'
import { decodeMeeting } from '@/utils/calendar_manager'

interface ICalendarContext {
  calendars: undefined | ConnectedCalendarCore[]
  currrentDate: DateTime
  setCurrentDate: (date: DateTime) => void
  selectedCalendars: CalendarSyncInfo[]
  selectedSlot: WithInterval<
    UnifiedEvent<DateTime> | MeetingDecrypted<DateTime>
  > | null
  setSelectedSlot: React.Dispatch<
    React.SetStateAction<WithInterval<
      UnifiedEvent<DateTime> | MeetingDecrypted<DateTime>
    > | null>
  >
  setSelectedCalendars: React.Dispatch<React.SetStateAction<CalendarSyncInfo[]>>
  calendarEvents: Array<
    WithInterval<UnifiedEvent<DateTime> | MeetingDecrypted<DateTime>>
  >
  calculateSlotForInterval: (
    interval: Interval
  ) => WithInterval<UnifiedEvent<DateTime> | MeetingDecrypted<DateTime>>[]
  getAllDayEvents: (
    interval: Interval
  ) => WithInterval<UnifiedEvent<DateTime> | MeetingDecrypted<DateTime>>[]
  getSlotBgColor: (calId: string) => string
}

export const CalendarContext = React.createContext<ICalendarContext>({
  calendars: undefined,
  currrentDate: DateTime.now(),
  setCurrentDate: () => {},
  selectedCalendars: [],
  setSelectedCalendars: () => {},
  calendarEvents: [],
  calculateSlotForInterval: () => [],
  getAllDayEvents: () => [],
  getSlotBgColor: () => '',
  selectedSlot: null,
  setSelectedSlot: () => {},
})

export const useCalendarContext = () => {
  const context = React.useContext(CalendarContext)
  if (!context) {
    throw new Error('useCalendarContext must be used within a CalendarProvider')
  }
  return context
}

export const CalendarProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [currrentDate, setCurrentDate] = React.useState<DateTime>(
    DateTime.now()
  )
  const [selectedCalendars, setSelectedCalendars] = React.useState<
    CalendarSyncInfo[]
  >([])
  const [selectedSlot, setSelectedSlot] = React.useState<WithInterval<
    UnifiedEvent<DateTime> | MeetingDecrypted<DateTime>
  > | null>(null)
  const { data: calendars } = useQuery({
    queryKey: ['connected-calendars'],
    queryFn: () => listConnectedCalendars(false),
  })
  const queryClient = useQueryClient()
  const currentAccount = useAccountContext()

  const createEventsQueryKey = React.useCallback(
    (date: DateTime) => [
      'calendar-events',
      date.startOf('month').toISODate() || '',
      date.endOf('month').toISODate() || '',
    ],
    []
  )

  const fetchEventsForMonth = React.useCallback(
    async (date: DateTime) => {
      const res = await getEvents(date)
      return {
        ...res,
        mwwEvents: await Promise.all(
          res.mwwEvents.map(async meeting => {
            // TODO: Pass all events through a preprocessor first before mapping this prepropcesssor shopuld get all the meeting sereis and check if all single instance of that meeting is already included in the events, if yes it returns all the events and discard the mastyer event otherwise it takes the availaible events and adds the master events to it.
            try {
              const decodedMeeting = await decodeMeeting(
                meeting,
                currentAccount!
              )
              return decodedMeeting
            } catch (e) {
              return null
            }
          })
        ).then(meetings => meetings.filter(m => m !== null)),
      }
    },
    [currentAccount]
  )

  const { data: events } = useQuery({
    queryKey: createEventsQueryKey(currrentDate),
    queryFn: () => fetchEventsForMonth(currrentDate),
    staleTime: 5 * 60 * 1000,
  })

  React.useEffect(() => {
    const previousMonth = currrentDate.minus({ month: 1 })
    const nextMonth = currrentDate.plus({ month: 1 })

    queryClient.prefetchQuery({
      queryKey: createEventsQueryKey(previousMonth),
      queryFn: () => fetchEventsForMonth(previousMonth),
      staleTime: 10 * 60 * 1000, // Keep prefetched data fresh for 10 minutes
    })

    queryClient.prefetchQuery({
      queryKey: createEventsQueryKey(nextMonth),
      queryFn: () => fetchEventsForMonth(nextMonth),
      staleTime: 10 * 60 * 1000, // Keep prefetched data fresh for 10 minutes
    })
  }, [currrentDate, queryClient, fetchEventsForMonth, createEventsQueryKey])

  React.useEffect(() => {
    const selectedCalendars = () => {
      if (calendars) {
        return calendars.reduce((acc, calendar) => {
          return acc.concat(calendar.calendars.filter(c => c.enabled))
        }, [] as CalendarSyncInfo[])
      }
      return []
    }
    setSelectedCalendars(selectedCalendars())
  }, [calendars])
  const calendarEvents: Array<
    WithInterval<UnifiedEvent<DateTime> | MeetingDecrypted<DateTime>>
  > = React.useMemo(() => {
    if (!events) return []
    const mwwEvents = events.mwwEvents || []

    const externalEvents = (events.calendarEvents || []).filter(event => {
      const isMeetwithEvent = mwwEvents.some(
        mwwEvent =>
          mwwEvent.meeting_id === event.id ||
          event.description?.includes(mwwEvent.meeting_id)
      )
      const isCalendarSelected = selectedCalendars.some(
        calendar => calendar.calendarId === event.calendarId
      )
      return !isMeetwithEvent && isCalendarSelected
    })
    return [...mwwEvents, ...externalEvents].map(event => ({
      ...event,
      start: DateTime.fromJSDate(new Date(event.start)),
      end: DateTime.fromJSDate(new Date(event.end)),
      interval: Interval.fromDateTimes(
        DateTime.fromJSDate(new Date(event.start)),
        DateTime.fromJSDate(new Date(event.end))
      ),
    }))
  }, [events, selectedCalendars])
  // console.log(calendarEvents.filter(val => val))
  const calculateSlotForInterval = React.useCallback(
    (interval: Interval) => {
      return calendarEvents.filter(event => interval.contains(event.start))
    },
    [calendarEvents]
  )
  const getSlotBgColor = React.useCallback(
    (calId?: string) => {
      return (
        selectedCalendars.find(cal => cal.calendarId === calId)?.color ||
        '#FEF0EC'
      )
    },
    [selectedCalendars]
  )

  const getAllDayEvents = React.useCallback(
    (interval: Interval) => {
      return calendarEvents.filter(
        event =>
          'isAllDay' in event &&
          event.interval.overlaps(interval) &&
          event.isAllDay
      )
    },
    [calendarEvents]
  )
  const context: ICalendarContext = {
    calendars,
    currrentDate,
    setCurrentDate,
    selectedCalendars,
    setSelectedCalendars,
    calendarEvents,
    calculateSlotForInterval,
    getSlotBgColor,
    getAllDayEvents,
    selectedSlot,
    setSelectedSlot,
  }
  return (
    <CalendarContext.Provider value={context}>
      {children}
    </CalendarContext.Provider>
  )
}
