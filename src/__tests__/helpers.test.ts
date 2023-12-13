import { NotBefore } from '@/types/Meeting'
import { findStartDateForNotBefore } from '@/utils/time.helper'
import { isValidUrl } from '@/utils/validations'

describe('test url validator', () => {
  it('URLs should be valid', async () => {
    const url1 = 'https://meeting.com/saasdd'
    const url2 = 'https://meeting.com/saasdd?param1=la#smething=we'
    expect(isValidUrl(url1)).toBeTruthy()
    expect(isValidUrl(url2)).toBeTruthy()
  })

  it('URLs should break', async () => {
    const url1 = 'meeting.com/saasdd'
    const url2 = 'htts://meeting.com/saasdd?param1=la#smething=we'
    const url3 = 'https://meeting/'
    expect(isValidUrl(url1)).toBeFalsy()
    expect(isValidUrl(url2)).toBeFalsy()
    expect(isValidUrl(url3)).toBeFalsy()
  })
})

describe('test not before', () => {
  it('Start date should respect not before', async () => {
    const theDate = new Date('2023-12-06T01:00:00.000Z')
    const timezone = 'America/Sao_Paulo'

    const notBeforeOneHour = findStartDateForNotBefore(
      theDate,
      NotBefore.OneHour,
      timezone
    )

    const notBeforeSixHours = findStartDateForNotBefore(
      theDate,
      NotBefore.SixHours,
      timezone
    )

    const notBeforeTomorrow = findStartDateForNotBefore(
      theDate,
      NotBefore.Tomorrow,
      timezone
    )

    const notBeforeNextWeek = findStartDateForNotBefore(
      theDate,
      NotBefore.NextWeek,
      timezone
    )

    expect(notBeforeOneHour).toEqual(new Date('2023-12-06T02:00:00.000Z'))
    expect(notBeforeSixHours).toEqual(new Date('2023-12-06T07:00:00.000Z'))
    expect(notBeforeTomorrow).toEqual(new Date('2023-12-06T03:00:00.000Z'))
    expect(notBeforeNextWeek).toEqual(new Date('2023-12-11T03:00:00.000Z'))
  })
})
