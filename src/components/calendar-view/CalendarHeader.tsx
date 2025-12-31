import { Grid, GridItem, Text } from '@chakra-ui/react'
import * as ct from 'countries-and-timezones'
import * as React from 'react'

import useAccountContext from '@/hooks/useAccountContext'
import { useCalendarContext } from '@/providers/calendar/CalendarContext'

const CalendarHeader: React.FC = ({}) => {
  const { currrentDate } = useCalendarContext()
  const currentAccount = useAccountContext()
  const startOfWeek = currrentDate.startOf('week')
  const days = Array.from({
    length: 7,
  }).map((_, index) => {
    return startOfWeek.plus({ days: index })
  })
  const timezone =
    currentAccount?.preferences.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone
  const utcOffset = ct.getTimezone(timezone)?.utcOffset
  const getOffsetString = (offset: number | undefined) => {
    if (offset === undefined) return ''
    const sign = offset >= 0 ? '+' : '-'
    const hours = Math.floor(Math.abs(offset) / 60)
    const minutes = Math.abs(offset) % 60
    if (minutes > 0) {
      return `${sign}${hours.toString()}:${minutes.toString().padStart(2, '0')}`
    }
    return `${sign}${hours.toString()}`
  }

  return (
    <Grid
      templateColumns="minmax(40px, 50px) repeat(7, 1fr)"
      fontSize={'sm'}
      textAlign="center"
      roundedTopRight={10}
      overflow="hidden"
      bg="bg-event"
    >
      <GridItem
        w="100%"
        pt={'14px'}
        pb={5}
        borderColor="border-subtle"
        borderWidth={1}
        borderRight={0}
      >
        <Text fontSize={'12px'}>UTC{getOffsetString(utcOffset)}</Text>
      </GridItem>

      {days.map((day, index) => (
        <GridItem
          key={`${day.toMillis()}-${index}`}
          w="100%"
          borderColor="border-subtle"
          borderTopWidth={1}
          pt={'14px'}
          pb={5}
          fontSize={'12px'}
        >
          <Text display={{ base: 'none', md: 'block' }}>
            {day.toFormat('ccc dd')}
          </Text>
          <Text display={{ base: 'block', md: 'none' }}>
            {day.toFormat('ccccc')}
            <br />
            <b>{day.toFormat('dd')}</b>
          </Text>
        </GridItem>
      ))}
    </Grid>
  )
}

export default CalendarHeader
