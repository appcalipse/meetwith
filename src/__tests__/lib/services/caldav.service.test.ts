import { faker } from '@faker-js/faker'
import { addHours, addMinutes } from 'date-fns'

import { convertDate, getDuration } from '@/utils/services/caldav.service'

describe('Caldav Service > convertDate', () => {
  it('should return a list of numbers representing a date', () => {
    // given
    const date = faker.date.future()

    // when
    const response = convertDate(date)

    // then
    expect(response).toEqual([
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
    ])
  })

  it('should cosider always as UTC date', () => {
    // given
    const date = new Date('2022-01-01 00:00:00')

    // when
    const response = convertDate(date)

    // then
    expect(response).toEqual([
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
    ])
  })
})

describe('Caldav Service > getDuration', () => {
  it('should duration for minutes', () => {
    // given
    const expectedDuration = 30
    const startDate = faker.date.future()
    const endDate = addMinutes(startDate, expectedDuration)

    // when
    const response = getDuration(startDate.toISOString(), endDate.toISOString())

    // then
    expect(response).toEqual({ minutes: expectedDuration })
  })

  it('should duration for hours', () => {
    // given
    const expectedDuration = 3
    const startDate = faker.date.future()
    const endDate = addHours(startDate, expectedDuration)

    // when
    const response = getDuration(startDate.toISOString(), endDate.toISOString())

    // then
    expect(response).toEqual({ minutes: expectedDuration * 60 })
  })
})
