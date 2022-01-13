import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { format, isSameMonth, isToday, addMonths, subMonths } from 'date-fns'

import { Grid, Wrapper, MonthYear, DaysOfWeek, DaysOfMonth } from './Layout'
import { WeekDays, WeekDay, WEEK_DAYS } from './WeekDays'
import { MonthDays, MonthDay } from './MonthDays'

import {
  PrevMonth,
  NextMonth,
  CurrentMonth,
  FakeCurrentMonth,
} from './MonthPicker'

import { Calendar, FakeCalendar } from './Calendar'

import generateDays from './generate-days'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { Flex, HStack } from '@chakra-ui/react'

function Root({ validator, pickDay, monthChanged }) {
  const [month, setMonth] = useState(new Date())
  const [fakeMonth, setFakeMonth] = useState(month)
  const [animation, setAnimation] = useState('')

  const [startDay, days] = generateDays(month)
  const [fakeStartDay, fakeDays] = generateDays(fakeMonth)

  const isAnimating = !!animation

  // Handlers
  const handleNextMonth = () => {
    if (isAnimating) {
      return
    }

    const next = addMonths(month, 1)
    setMonth(next)
    setAnimation('next')
    monthChanged && monthChanged(next)
  }

  const handlePrevMonth = () => {
    if (isAnimating) {
      return
    }

    const prev = subMonths(month, 1)
    setMonth(prev)
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
    <Grid>
      <MonthYear>
        <HStack>
          <PrevMonth disabled={isAnimating} onClick={handlePrevMonth}>
            <FaChevronLeft />
          </PrevMonth>

          <Wrapper>
            <CurrentMonth animation={animation}>
              {format(month, 'MMMM yyyy')}
            </CurrentMonth>

            <FakeCurrentMonth animation={animation}>
              {format(fakeMonth, 'MMMM yyy')}
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
        <Calendar animation={animation} onAnimationEnd={handleAnimationEnd}>
          <DaysOfWeek>
            <WeekDays>
              {WEEK_DAYS.map(weekDay => {
                return <WeekDay key={weekDay}>{weekDay}</WeekDay>
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
              const _isToday = isToday(day)
              const isValid = validator ? validator(day) : true
              return (
                <MonthDay
                  key={day}
                  isValid={isValid}
                  isToday={_isToday}
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
    </Grid>
  )
}

Root.propTypes = {
  validator: PropTypes.func,
  pickDay: PropTypes.func.isRequired,
  monthChanged: PropTypes.func,
}

export default Root
