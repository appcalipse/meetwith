import { useColorMode } from '@chakra-ui/color-mode'
import { Center, Flex, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { addMonths, format, isAfter, startOfMonth, subMonths } from 'date-fns'
import { DateTime } from 'luxon'
import PropTypes from 'prop-types'
import React, { useCallback, useMemo, useState } from 'react'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'

import Loading from '@/components/Loading'

import { Calendar, FakeCalendar } from './Calendar'
import generateDays from './generate-days'
import { DaysOfMonth, DaysOfWeek, Grid, MonthYear, Wrapper } from './Layout'
import { MonthDays } from './MonthDays'
import {
  CurrentMonth,
  FakeCurrentMonth,
  NextMonth,
  PrevMonth,
} from './MonthPicker'
import StandAloneMonthDays from './StandAloneMonthDays'
import { WEEK_DAYS, WeekDay, WeekDays } from './WeekDays'

function Root({
  validator,
  pickDay,
  monthChanged,
  selectedMonth,
  setSelectedMonth,
  loading,
  pickedDay,
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
}) {
  const [fakeMonth, setFakeMonth] = useState(selectedMonth)
  const [animation, setAnimation] = useState('')
  const { colorMode } = useColorMode()
  const [startDay, days] = useMemo(
    () => generateDays(selectedMonth),
    [selectedMonth]
  )
  const [fakeStartDay, fakeDays] = useMemo(
    () => generateDays(fakeMonth),
    [fakeMonth]
  )

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
    const dayInTimezone = DateTime.fromObject(
      {
        year: day.getFullYear(),
        month: day.getMonth() + 1, // JS months are 0-indexed
        day: day.getDate(),
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
      },
      { zone: timezone }
    )
    pickDay(dayInTimezone.toJSDate())
  }

  const checkIsPickedDay = useCallback(
    day => {
      return DateTime.fromJSDate(day).hasSame(
        pickedDay
          ? DateTime.fromJSDate(pickedDay).setZone(timezone)
          : DateTime.now().setZone(timezone),
        'day'
      )
    },
    [pickedDay, timezone]
  )

  return (
    <VStack w="100%" alignItems={{ md: 'flex-start', base: 'center' }}>
      <Heading size="md">Select Date</Heading>
      <Grid>
        <MonthYear>
          <HStack>
            {isAfter(startOfMonth(selectedMonth), startOfMonth(new Date())) && (
              <PrevMonth disabled={isAnimating} onClick={handlePrevMonth}>
                <FaChevronLeft />
              </PrevMonth>
            )}

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
                        <Text fontWeight="500" key={weekDay}>
                          {weekDay}
                        </Text>
                      )
                    })}
                  </WeekDays>
                </DaysOfWeek>

                <MonthDays>
                  {days.map(day => (
                    <StandAloneMonthDays
                      day={day}
                      checkIsPickedDay={checkIsPickedDay}
                      colorMode={colorMode}
                      handlePickDay={handlePickDay}
                      startDay={startDay}
                      validator={validator}
                      key={day.toString()}
                    />
                  ))}
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
                    {fakeDays.map(day => (
                      <StandAloneMonthDays
                        day={day}
                        checkIsPickedDay={checkIsPickedDay}
                        colorMode={colorMode}
                        handlePickDay={handlePickDay}
                        startDay={fakeStartDay}
                        validator={validator}
                        key={day.toString()}
                      />
                    ))}
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
  timezone: PropTypes.string,
}

export default Root
