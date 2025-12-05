import { useQuery } from '@tanstack/react-query'
import { DateTime } from 'luxon'
import * as React from 'react'

import { ConnectedCalendarCore } from '@/types/CalendarConnections'
import { listConnectedCalendars } from '@/utils/api_helper'
import QueryKeys from '@/utils/query_keys'

interface ICalendarContext {
  calendars: undefined | ConnectedCalendarCore[]
  currrentDate: DateTime
  setCurrentDate: (date: DateTime) => void
}

export const CalendarContext = React.createContext<ICalendarContext>({
  calendars: undefined,
  currrentDate: DateTime.now(),
  setCurrentDate: () => {},
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
  const { data: calendars } = useQuery({
    queryKey: QueryKeys.connectedCalendars() as any,
    queryFn: listConnectedCalendars,
  })

  return (
    <CalendarContext.Provider
      value={{ calendars, currrentDate, setCurrentDate }}
    >
      {children}
    </CalendarContext.Provider>
  )
}
