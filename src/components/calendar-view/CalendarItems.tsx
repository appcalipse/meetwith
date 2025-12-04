import { Grid, GridItem } from '@chakra-ui/layout'
import { DateTime } from 'luxon'
import * as React from 'react'

import CalendarItem from './CalendarItem'

const CalendarItems: React.FC = () => {
  const TIME_SLOTS = Array.from({ length: 24 }, (_, i) =>
    DateTime.fromObject({ hour: i, minute: 0 })
  )
  return (
    <Grid templateRows="repeat(1fr)">
      {/*<GridItem minH="36px" />*/}
      {TIME_SLOTS.map((timeSlot, index) => (
        <GridItem key={index}>
          <CalendarItem timeSlot={timeSlot} />
        </GridItem>
      ))}
    </Grid>
  )
}

export default CalendarItems
