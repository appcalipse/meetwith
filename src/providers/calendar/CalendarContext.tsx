import { useQuery } from '@tanstack/react-query'
import { DateTime } from 'luxon'
import * as React from 'react'

import useAccountContext from '@/hooks/useAccountContext'
import { UnifiedEvent } from '@/types/Calendar'
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
  setSelectedCalendars: React.Dispatch<React.SetStateAction<CalendarSyncInfo[]>>
  calendarEvents: Array<UnifiedEvent | MeetingDecrypted>
}

export const CalendarContext = React.createContext<ICalendarContext>({
  calendars: undefined,
  currrentDate: DateTime.now(),
  setCurrentDate: () => {},
  selectedCalendars: [],
  setSelectedCalendars: () => {},
  calendarEvents: [],
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
  const { data: calendars } = useQuery({
    queryKey: ['connected-calendars'],
    queryFn: () => listConnectedCalendars(false),
  })
  const currentAccount = useAccountContext()
  const { data: events } = useQuery({
    queryKey: [
      'calendar-events',
      currrentDate.startOf('month').toISODate() || '',
      currrentDate.endOf('month').toISODate() || '',
    ],
    queryFn: () =>
      getEvents(currrentDate).then(async res => {
        return {
          ...res,
          mwwEvents: await Promise.all(
            res.mwwEvents.map(async meeting => {
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
      }),
  })
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
  const calendarEvents: Array<UnifiedEvent | MeetingDecrypted> =
    React.useMemo(() => {
      if (!events) return []
      const mwwEvents = events.mwwEvents || []
      const externalEvents = (events.calendarEvents || []).filter(event =>
        mwwEvents.some(mwwEvent => mwwEvent.id === event.id)
      )

      return [...mwwEvents, ...externalEvents]
    }, [events])
  const context: ICalendarContext = {
    calendars,
    currrentDate,
    setCurrentDate,
    selectedCalendars,
    setSelectedCalendars,
    calendarEvents,
  }
  return (
    <CalendarContext.Provider value={context}>
      {children}
    </CalendarContext.Provider>
  )
}
