import { Grid, GridItem, Text } from '@chakra-ui/layout'
import * as ct from 'countries-and-timezones'
import { DateTime } from 'luxon'
import * as React from 'react'

const CalendarHeader: React.FC = ({}) => {
  const days = Array.from({
    length: 7,
  }).map((_, index) => {
    return DateTime.now().plus({ days: index })
  })
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
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
      templateColumns="minmax(45px, 70px) repeat(7, 1fr)"
      fontSize={'sm'}
      textAlign="center"
      roundedTopRight={10}
      overflow="hidden"
      bg="neutral.825"
    >
      <GridItem
        w="100%"
        pt={'14px'}
        pb={5}
        borderColor="neutral.700"
        borderWidth={1}
        borderBottom={'none'}
      >
        <Text>UTC{getOffsetString(utcOffset)}</Text>
      </GridItem>
      {days.map((day, index) => (
        <GridItem
          key={index}
          w="100%"
          borderColor="neutral.700"
          borderWidth={1}
          pt={'14px'}
          pb={5}
        >
          <Text>{day.toFormat('ccc dd')}</Text>
        </GridItem>
      ))}
    </Grid>
  )
}

export default CalendarHeader
