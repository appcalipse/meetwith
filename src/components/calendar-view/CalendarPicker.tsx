import { Grid, GridItem, Heading, Text, VStack } from '@chakra-ui/layout'
import * as React from 'react'

import { useCalendarContext } from '@/providers/calendar/CalendarContext'

const CalendarPicker: React.FC = () => {
  const { currrentDate, setCurrentDate } = useCalendarContext()
  const getMonthDays = () => {
    const startofMonth = currrentDate.startOf('month')
    const startofThatWeek = startofMonth.startOf('week')
    const endOfMonth = currrentDate.endOf('month')
    const endOfThatWeek = endOfMonth.endOf('week')
    const days = []
    let currDate = startofThatWeek
    while (currDate <= endOfThatWeek) {
      days.push(currDate)
      currDate = currDate.plus({ days: 1 })
    }
    return days
  }
  const monthDays = getMonthDays()
  const header = monthDays.slice(0, 7)
  return (
    <VStack w="100%" alignItems="start" justifyContent="flex-start" gap={4}>
      <Heading size="ms" fontSize="20px">
        {currrentDate.toFormat('MMMM')}
      </Heading>
      <Grid
        templateColumns="repeat(7, 1fr)"
        w="100%"
        // color="white"
        textAlign="center"
        rowGap={1}
      >
        {header.map((day, index) => (
          <GridItem
            key={day.toMillis() + index + 1}
            fontSize={14}
            fontWeight="500"
          >
            {day.toFormat('EEE')}
          </GridItem>
        ))}
        {monthDays.map(day => (
          <GridItem
            key={day.toMillis()}
            color={day.month === currrentDate.month ? 'inherit' : 'neutral.500'}
            py={1.5}
            fontSize={14}
            bg={
              day.hasSame(currrentDate, 'week')
                ? 'bg-calendar-row'
                : 'transparent'
            }
            onClick={() => setCurrentDate(day)}
            roundedLeft={
              day.hasSame(currrentDate, 'week') &&
              day.hasSame(currrentDate.startOf('week'), 'day')
                ? 'md'
                : undefined
            }
            roundedRight={
              day.hasSame(currrentDate, 'week') &&
              day.hasSame(currrentDate.endOf('week'), 'day')
                ? 'md'
                : undefined
            }
            transition="all"
            transitionDuration="300ms"
          >
            <Text
              bg={
                day.hasSame(currrentDate, 'day') ? 'primary.500' : 'transparent'
              }
              color={day.hasSame(currrentDate, 'day') ? 'white' : 'inherit'}
              w="fit-content"
              mx="auto"
              px={2}
              rounded="md"
              cursor="pointer"
              transition="all"
              transitionDuration="300ms"
              fontWeight="500"
              _hover={{
                bg: 'primary.500',
                color: 'white',
              }}
            >
              {day.day}
            </Text>
          </GridItem>
        ))}
      </Grid>
    </VStack>
  )
}

export default CalendarPicker
