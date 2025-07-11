import {
  Box,
  Divider,
  Heading,
  HStack,
  SimpleGrid,
  Stack,
  VStack,
} from '@chakra-ui/react'
import { format, isSameDay, setMonth } from 'date-fns'
import isBefore from 'date-fns/isBefore'
import { DateObj, RenderProps } from 'dayzed'
import React from 'react'

import { DatepickerBackBtns, DatepickerForwardBtns } from './dateNavBtns'
import { DayOfMonth } from './dayOfMonth'

interface CalendarPanelProps {
  renderProps: RenderProps
  onMouseEnterHighlight?: (date: Date) => void
  isInRange?: (date: Date) => boolean | null
  blockPast?: boolean
}

export const CalendarPanel: React.FC<CalendarPanelProps> = ({
  renderProps,
  onMouseEnterHighlight,
  isInRange,
  blockPast,
}) => {
  const { calendars, getBackProps, getForwardProps } = renderProps

  if (calendars.length <= 0) {
    return null
  }

  return (
    <Stack
      className="datepicker-calendar"
      direction={['column', 'column', 'row']}
    >
      {calendars.map(calendar => {
        return (
          <VStack
            key={`${calendar.month}${calendar.year}`}
            height="100%"
            borderWidth="1px"
            padding="5px 10px"
          >
            <HStack>
              <DatepickerBackBtns
                calendars={calendars}
                getBackProps={getBackProps}
              />
              <Heading size="sm" textAlign="center">
                {format(setMonth(new Date(), calendar.month), 'MMM')}{' '}
                {calendar.year}
              </Heading>
              <DatepickerForwardBtns
                calendars={calendars}
                getForwardProps={getForwardProps}
              />
            </HStack>
            <Divider />
            <SimpleGrid columns={7} spacing={1} textAlign="center" w="100%">
              {calendar.weeks[0].map((dateObj, idx) => (
                <Box key={idx}>
                  {format((dateObj as DateObj).date, 'iiiiii')}
                </Box>
              ))}
            </SimpleGrid>
            <SimpleGrid columns={7} spacing={1} textAlign="center">
              {calendar.weeks.map((week, weekIdx) => {
                return week.map((dateObj, index) => {
                  const key = `${calendar.month}${calendar.year}${weekIdx}${index}`
                  if (!dateObj) return <Box key={key} />
                  const today = new Date()
                  const { date } = dateObj
                  dateObj.selectable =
                    isBefore(today, date) || isSameDay(today, date)
                  return (
                    <DayOfMonth
                      key={key}
                      dateObj={dateObj}
                      renderProps={renderProps}
                      isInRange={isInRange && isInRange(date)}
                      onMouseEnter={() => {
                        if (onMouseEnterHighlight) onMouseEnterHighlight(date)
                      }}
                    />
                  )
                })
              })}
            </SimpleGrid>
          </VStack>
        )
      })}
    </Stack>
  )
}
