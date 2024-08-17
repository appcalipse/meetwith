import { useColorMode } from '@chakra-ui/color-mode'
import {
  Box,
  Center,
  Flex,
  Heading,
  HStack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { addMonths, format, isSameMonth, isToday, subMonths } from 'date-fns'
import PropTypes from 'prop-types'
import React, { useState } from 'react'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'

import Loading from '@/components/Loading'

import { Calendar, FakeCalendar } from './Calendar'
import generateDays from './generate-days'
import { DaysOfMonth, DaysOfWeek, Grid, MonthYear, Wrapper } from './Layout'
import { MonthDay, MonthDays } from './MonthDays'
import {
  CurrentMonth,
  FakeCurrentMonth,
  NextMonth,
  PrevMonth,
} from './MonthPicker'
import { WEEK_DAYS, WeekDay, WeekDays } from './WeekDays'

function Root({
  validator,
  pickDay,
  monthChanged,
  selectedMonth,
  setSelectedMonth,
  loading,
  pickedDay,
}) {
  const [fakeMonth, setFakeMonth] = useState(selectedMonth)
  const [animation, setAnimation] = useState('')
  const { colorMode } = useColorMode()
  const [startDay, days] = generateDays(selectedMonth)
  const [fakeStartDay, fakeDays] = generateDays(fakeMonth)

  const isAnimating = !!animation

  // Handlers
  const handleNextMonth = () => {
    if (isAnimating) {
      return
    }

    const next = addMonths(selectedMonth, 1)
    setSelectedMonth(next)
    setAnimation('next')
    monthChanged && monthChanged(next)
  }

  const handlePrevMonth = () => {
    if (isAnimating) {
      return
    }

    const prev = subMonths(selectedMonth, 1)
    setSelectedMonth(prev)
    setAnimation('prev')
    monthChanged && monthChanged(prev)
  }

  const handleAnimationEnd = () => {
    const newFakeMonth =
      animation === 'prev' ? subMonths(fakeMonth, 1) : addMonths(fakeMonth, 1)

    setFakeMonth(newFakeMonth)
    setAnimation('')
  }

  const handlePickDay = day => {
    if (isAnimating) {
      return
    }

    pickDay(day)
  }

  return (
    <VStack
      flex={1.5}
      alignItems={{ md: 'flex-start', base: 'center' }}
      minW="300px"
    >
      <Heading size="md">Select Date</Heading>
      <Grid>
        <MonthYear>
          <HStack>
            <PrevMonth disabled={isAnimating} onClick={handlePrevMonth}>
              <FaChevronLeft />
            </PrevMonth>

            <Wrapper>
              <CurrentMonth animation={animation}>
                {format(selectedMonth, 'MMMM yyyy')}
              </CurrentMonth>

              <FakeCurrentMonth animation={animation}>
                {format(fakeMonth, 'MMMM yyyy')}
              </FakeCurrentMonth>
            </Wrapper>

            <NextMonth disabled={isAnimating} onClick={handleNextMonth}>
              <Flex justifyContent="flex-end">
                <FaChevronRight />
              </Flex>
            </NextMonth>
          </HStack>
        </MonthYear>

        <Wrapper>
          {!!loading ? (
            <Center minH="455px">
              <Loading label="Checking availability" />
            </Center>
          ) : (
            <Wrapper>
              <Calendar
                animation={animation}
                onAnimationEnd={handleAnimationEnd}
              >
                <DaysOfWeek>
                  <WeekDays>
                    {WEEK_DAYS.map(weekDay => {
                      return (
                        <Text fontWeight="500" color="white" key={weekDay}>
                          {weekDay}
                        </Text>
                      )
                    })}
                  </WeekDays>
                </DaysOfWeek>

                <MonthDays>
                  {days.map(day => {
                    const _isSameMonth = isSameMonth(day, startDay)
                    if (!_isSameMonth) {
                      return <MonthDay key={day} />
                    }
                    const formatted = format(day, 'd')
                    const _isToday = pickedDay
                      ? pickedDay.getDate() === day.getDate()
                      : isToday(day)
                    const _isWeekend = [0, 6].includes(day.getDay())
                    const isValid = validator ? validator(day) : true
                    return (
                      <MonthDay
                        key={day}
                        isValid={isValid}
                        isToday={_isToday}
                        isDarkMode={colorMode === 'dark'}
                        isWeekend={_isWeekend}
                        onClick={() => isValid && handlePickDay(day)}
                      >
                        {formatted}
                      </MonthDay>
                    )
                  })}
                </MonthDays>
              </Calendar>

              <FakeCalendar animation={animation}>
                <DaysOfWeek>
                  <WeekDays>
                    {WEEK_DAYS.map(weekDay => {
                      return <WeekDay key={weekDay}>{weekDay}</WeekDay>
                    })}
                  </WeekDays>
                </DaysOfWeek>

                <DaysOfMonth>
                  <MonthDays>
                    {fakeDays.map(fakeDay => {
                      const _isSameMonth = isSameMonth(fakeDay, fakeStartDay)
                      if (!_isSameMonth) {
                        return <MonthDay key={fakeDay} />
                      }

                      const formatted = format(fakeDay, 'd')
                      const _isToday = isToday(fakeDay)
                      const isValid = validator ? validator(fakeDay) : true
                      return (
                        <MonthDay
                          key={fakeDay}
                          disabled={!_isSameMonth}
                          isValid={isValid}
                          isToday={_isToday}
                        >
                          {formatted}
                        </MonthDay>
                      )
                    })}
                  </MonthDays>
                </DaysOfMonth>
              </FakeCalendar>
            </Wrapper>
          )}
        </Wrapper>
      </Grid>
    </VStack>
  )
}

Root.propTypes = {
  validator: PropTypes.func,
  pickDay: PropTypes.func.isRequired,
  monthChanged: PropTypes.func,
  pickedDay: PropTypes.instanceOf(Date),
  selectedMonth: PropTypes.instanceOf(Date).isRequired,
}

export default Root
