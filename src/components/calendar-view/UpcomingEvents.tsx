import { Box } from '@chakra-ui/layout'
import { useQuery } from '@tanstack/react-query'
import { DateTime } from 'luxon'
import * as React from 'react'
import useAccountContext from '@/hooks/useAccountContext'
import { DashboardEvent } from '@/types/Calendar'
import { MeetingDecrypted } from '@/types/Meeting'
import { getCalendarEvents } from '@/utils/api_helper'
import QueryKeys from '@/utils/query_keys'
import Loading from '../Loading'
import DesktopUpcomingEvents from './DesktopUpcomingEventsView'
import MobileUpcomingEvents from './MobileUpcomingEventsView'

interface UpComingEventsProps {
  isMobile?: boolean
}

const UpComingEvents: React.FC<UpComingEventsProps> = ({ isMobile }) => {
  const currentAccount = useAccountContext()
  const timezone =
    currentAccount?.preferences.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone
  const { data, isLoading } = useQuery({
    queryKey: QueryKeys.upcomingMeetings(currentAccount?.address || ''),
    enabled: !!currentAccount?.address,
    queryFn: async () => {
      const now = DateTime.now().setZone(timezone)
      return await getCalendarEvents(
        now,
        now.plus({ days: 1 }).setZone(timezone),
        currentAccount!,
        true
      )
    },
  })
  const meetings: DashboardEvent[] = React.useMemo(() => {
    if (!data) return []
    const now = DateTime.now()
    const allEvents: DashboardEvent[] = [
      ...data.mwwEvents,
      ...data.calendarEvents,
    ]
      .map(event => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      }))
      .filter(event => DateTime.fromJSDate(event.start) >= now) // ← Add this
      .sort((a, b) => a.start.getTime() - b.start.getTime())

    return allEvents
  }, [data])

  return isLoading ? (
    <Box w="100%" display="flex" justifyContent="center" mt={5}>
      <Loading />
    </Box>
  ) : isMobile ? (
    <MobileUpcomingEvents data={meetings} />
  ) : (
    <DesktopUpcomingEvents data={meetings} />
  )
}

export default UpComingEvents
