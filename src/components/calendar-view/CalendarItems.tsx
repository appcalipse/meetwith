import { Grid, GridItem, Text } from '@chakra-ui/layout'
import { DateTime } from 'luxon'
import * as React from 'react'

const CalendarItems: React.FC = () => {
  const TIME_SLOTS = Array.from({ length: 24 }, (_, i) =>
    DateTime.fromObject({ hour: i, minute: 0 })
  )
  const days = Array.from({
    length: 7,
  }).map((_, index) => {
    return DateTime.now().plus({ days: index })
  })
  return (
    <Grid templateColumns="minmax(45px, 70px) repeat(7, 1fr)">
      <Grid templateRows="repeat(1fr)">
        {TIME_SLOTS.map((timeSlot, index) => (
          <GridItem
            pos="relative"
            minH="35px"
            borderInline="1px solid"
            borderColor="neutral.700"
            bg="neutral.825"
            key={index}
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
          </GridItem>
        ))}
      </Grid>
      {days.map((day, dayIndex) => (
        <Grid key={dayIndex} templateRows="repeat(1fr)">
          {TIME_SLOTS.map((_, timeIndex) => (
            <GridItem
              key={`${dayIndex}-${timeIndex}`}
              border="1px solid"
              borderColor="neutral.700"
              bg={dayIndex % 2 === 0 ? 'neutral.825' : 'neutral.950'}
              minH="36px"
              cursor="pointer"
              _hover={{
                borderColor: 'primary.600',
                borderWidth: '2px',
              }}
            >
              {/* Placeholder for events */}
            </GridItem>
          ))}
        </Grid>
      ))}
    </Grid>
  )
}

export default CalendarItems
