import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DateTime, Interval } from 'luxon'
import * as React from 'react'

import useAccountContext from '@/hooks/useAccountContext'
import { UnifiedEvent, WithInterval } from '@/types/Calendar'
import {
  CalendarSyncInfo,
  ConnectedCalendarCore,
} from '@/types/CalendarConnections'
import { DBSlot, MeetingDecrypted } from '@/types/Meeting'
import { getEvents, listConnectedCalendars } from '@/utils/api_helper'
import {
  decodeMeeting,
  meetWithSeriesPreprocessors,
} from '@/utils/calendar_manager'

interface ICalendarContext {
  calendars: undefined | ConnectedCalendarCore[]
  currentDate: DateTime
  setCurrentDate: (date: DateTime) => void
  selectedCalendars: CalendarSyncInfo[]
  selectedSlot: WithInterval<MeetingDecrypted> | null
  setSelectedSlot: React.Dispatch<
    React.SetStateAction<WithInterval<MeetingDecrypted> | null>
  >
  isLoading: boolean
  setSelectedCalendars: React.Dispatch<React.SetStateAction<CalendarSyncInfo[]>>
  getSlotBgColor: (calId: string) => string
  eventIndex: {
    dayIndex: Map<
      string,
      Array<WithInterval<UnifiedEvent<DateTime> | MeetingDecrypted<DateTime>>>
    >
    hourIndex: Map<
      string,
      Array<WithInterval<UnifiedEvent<DateTime> | MeetingDecrypted<DateTime>>>
    >
  }
}
export type CalendarEventsData = {
  calendarEvents: UnifiedEvent[]
  mwwEvents: MeetingDecrypted[]
}

export const CalendarContext = React.createContext<ICalendarContext>({
  calendars: undefined,
  currentDate: DateTime.now(),
  setCurrentDate: () => {},
  selectedCalendars: [],
  setSelectedCalendars: () => {},
  getSlotBgColor: () => '',
  selectedSlot: null,
  setSelectedSlot: () => {},
  eventIndex: { dayIndex: new Map(), hourIndex: new Map() },
  isLoading: false,
})
export const createEventsQueryKey = (date: DateTime) => [
  'calendar-events',
  date.startOf('month').startOf('week').toISODate() || '',
  date.endOf('month').startOf('week').toISODate() || '',
]
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
  const [currentDate, setCurrentDate] = React.useState<DateTime>(DateTime.now())
  const [selectedCalendars, setSelectedCalendars] = React.useState<
    CalendarSyncInfo[]
  >([])
  const [selectedSlot, setSelectedSlot] =
    React.useState<WithInterval<MeetingDecrypted> | null>(null)
  const { data: calendars, isLoading: isCalendarLoading } = useQuery({
    queryKey: ['connected-calendars'],
    queryFn: () => listConnectedCalendars(false),
  })
  const queryClient = useQueryClient()
  const currentAccount = useAccountContext()

  const fetchEventsForMonth = React.useCallback(
    async (date: DateTime): Promise<CalendarEventsData> => {
      const res = await getEvents(date)
      return {
        calendarEvents: res.calendarEvents,
        mwwEvents: await Promise.all(
          meetWithSeriesPreprocessors(
            res.mwwEvents,
            date.startOf('month').startOf('week'),
            date.endOf('month').endOf('week')
          ).map(async meeting => {
            // TODO: Pass all events through a preprocessor first before mapping this prepropcesssor shopuld get all the meeting sereis and check if all single instance of that meeting is already included in the events, if yes it returns all the events and discard the mastyer event otherwise it takes the availaible events and adds the master events to it.
            try {
              const decodedMeeting = await decodeMeeting(
                meeting as DBSlot,
                currentAccount!
              )
              return decodedMeeting
            } catch (e) {
              console.error('Error decoding meeting in calendar provider:', e)
              return null
            }
          })
        ).then(meetings => meetings.filter(m => m !== null)),
      }
    },
    [currentAccount]
  )
  const currentMonth = React.useMemo(
    () => currentDate.startOf('month'),
    [currentDate.year, currentDate.month]
  )

  const { data: events, isLoading } = useQuery({
    queryKey: createEventsQueryKey(currentMonth),
    queryFn: () => fetchEventsForMonth(currentMonth),
    staleTime: 5 * 60 * 1000,
    enabled: !!currentMonth,
  })

  React.useEffect(() => {
    if (isLoading) return
    const previousMonth = currentDate.minus({ month: 1 })
    const nextMonth = currentDate.plus({ month: 1 })

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
  }, [currentMonth, queryClient, isLoading])

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
  const eventIndex = React.useMemo(() => {
    if (!events) return { dayIndex: new Map(), hourIndex: new Map() }

    const processedEvents = [
      ...(events.mwwEvents || []),
      ...(events.calendarEvents || []).filter(event => {
        const isMeetwithEvent = (events.mwwEvents || []).some(
          mwwEvent =>
            mwwEvent.meeting_id === event.id ||
            event.description?.includes(mwwEvent.meeting_id)
        )
        const isCalendarSelected = selectedCalendars.some(
          calendar => calendar.calendarId === event.calendarId
        )
        return !isMeetwithEvent && isCalendarSelected
      }),
    ].map(event => ({
      ...event,
      start: DateTime.fromJSDate(new Date(event.start)),
      end: DateTime.fromJSDate(new Date(event.end)),
      interval: Interval.fromDateTimes(
        DateTime.fromJSDate(new Date(event.start)),
        DateTime.fromJSDate(new Date(event.end))
      ),
    }))

    // Index events by hour for O(1) lookup
    const hourIndex = new Map<
      string,
      Array<WithInterval<UnifiedEvent<DateTime> | MeetingDecrypted<DateTime>>>
    >()
    const dayIndex = new Map<
      string,
      Array<WithInterval<UnifiedEvent<DateTime> | MeetingDecrypted<DateTime>>>
    >()

    processedEvents.forEach(event => {
      const dayKey = event.start.startOf('day').toISODate()!
      if (!dayIndex.has(dayKey)) dayIndex.set(dayKey, [])
      dayIndex.get(dayKey)!.push(event)
      const key = event.start.startOf('hour').toISO()!
      if (!hourIndex.has(key)) hourIndex.set(key, [])
      hourIndex.get(key)!.push(event)
      if (!event.end.hasSame(event.start, 'day')) {
        // If event spans multiple days, index the start of the event on the next day
        // e.g., an event from 10 PM to 2 AM next day
        const nextDayKey = event.end.startOf('day').toISO()!
        if (!hourIndex.has(nextDayKey)) hourIndex.set(nextDayKey, [])
        hourIndex.get(nextDayKey)!.push({
          ...event,
          start: event.end.startOf('day'),
        })
      }
    })

    return { hourIndex, dayIndex }
  }, [events, selectedCalendars])

  const getSlotBgColor = React.useCallback(
    (calId?: string) => {
      return (
        selectedCalendars.find(cal => cal.calendarId === calId)?.color ||
        '#FEF0EC'
      )
    },
    [selectedCalendars]
  )

  const context: ICalendarContext = React.useMemo(
    () => ({
      calendars,
      currentDate,
      setCurrentDate,
      selectedCalendars,
      setSelectedCalendars,
      getSlotBgColor,
      selectedSlot,
      setSelectedSlot,
      eventIndex,
      isLoading: isCalendarLoading || isLoading,
    }),
    [
      calendars,
      currentDate,
      selectedCalendars,
      getSlotBgColor,
      selectedSlot,
      eventIndex,
      isLoading,
    ]
  )

  return (
    <CalendarContext.Provider value={context}>
      {children}
    </CalendarContext.Provider>
  )
}
