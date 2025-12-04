import { Grid, GridItem, Text } from '@chakra-ui/layout'
import { DateTime } from 'luxon'
import * as React from 'react'

interface CalendarItemProps {
  timeSlot: DateTime
}

const CalendarItem: React.FC<CalendarItemProps> = ({ timeSlot }) => {
  const days = Array.from({
    length: 7,
  }).map((_, index) => {
    return DateTime.now().plus({ days: index })
  })
  return (
    <Grid templateColumns="minmax(45px, 70px) repeat(7, 1fr)">
      <GridItem
        pos="relative"
        minH="35px"
        borderInline="1px solid"
        borderColor="neutral.700"
        bg="neutral.825"
      >
        <Text
          top={'-13px'}
          pos="absolute"
          zIndex={2}
          textAlign="center"
          w="100%"
        >
          {timeSlot.toFormat('h a')}
        </Text>
        {timeSlot.hour === 23 && (
          <Text
            bottom={'-13px'}
            pos="absolute"
            zIndex={2}
            textAlign="center"
            w="100%"
          >
            {timeSlot.plus({ hour: 1 }).toFormat('h a')}
          </Text>
        )}
      </GridItem>
      {days.map((d, index) => (
        <GridItem
          key={d.toISODate()}
          border="1px solid"
          borderColor="neutral.700"
          bg={index % 2 === 0 ? 'neutral.825' : 'neutral.950'}
          minH="36px"
        >
          {/* Placeholder for events */}
        </GridItem>
      ))}
    </Grid>
  )
}

export default CalendarItem
