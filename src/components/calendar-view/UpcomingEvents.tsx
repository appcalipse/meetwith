import { Box } from '@chakra-ui/layout'
import * as reactQuery from '@tanstack/react-query'
import { DateTime } from 'luxon'
import * as React from 'react'

import useAccountContext from '@/hooks/useAccountContext'
import { MeetingDecrypted } from '@/types/Meeting'
import { getMeetings } from '@/utils/api_helper'
import { decodeMeeting } from '@/utils/calendar_manager'

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
  const { data, isLoading } = reactQuery.useQuery<Array<MeetingDecrypted>>({
    queryKey: [
      'upcoming-meetings',
      currentAccount?.address,
      DateTime.now().setZone(timezone).toISODate(),
    ],
    enabled: !!currentAccount?.address,
    queryFn: () =>
      getMeetings(
        currentAccount?.address || '',
        DateTime.now().setZone(timezone).toJSDate(),
        DateTime.now().plus({ days: 1 }).setZone(timezone).toJSDate(),
        3
      )
        .then(async res => {
          return Promise.all(
            res.map(async meeting => {
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
          )
        })
        .then(meetings =>
          meetings.filter(
            (meeting): meeting is MeetingDecrypted => meeting !== null
          )
        ),
  })
  return isLoading ? (
    <Box w="100%" display="flex" justifyContent="center" mt={5}>
      <Loading />
    </Box>
  ) : isMobile ? (
    <MobileUpcomingEvents data={data} />
  ) : (
    <DesktopUpcomingEvents data={data} />
  )
}

export default UpComingEvents
