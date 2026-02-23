jest.mock('@/utils/services/google.service', () => {
  return jest.fn().mockImplementation(() => ({
    provider: 'google',
  }))
})
jest.mock('@/utils/services/office365.service', () => ({
  Office365CalendarService: jest.fn().mockImplementation(() => ({
    provider: 'office365',
  })),
}))
jest.mock('@/utils/services/caldav.service', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      provider: 'caldav',
    })),
  }
})
jest.mock('@/utils/services/webcal.service', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      provider: 'webcal',
    })),
  }
})

import { TimeSlotSource } from '@/types/Meeting'
import { getConnectedCalendarIntegration } from '@/utils/services/connected_calendars.factory'

describe('connected_calendars.factory', () => {
  it('should return a GoogleCalendarService for GOOGLE provider', () => {
    const service = getConnectedCalendarIntegration(
      '0xABC',
      'user@gmail.com',
      TimeSlotSource.GOOGLE,
      { access_token: 'token' }
    )
    expect(service).toBeDefined()
  })

  it('should return an Office365CalendarService for OFFICE provider', () => {
    const service = getConnectedCalendarIntegration(
      '0xABC',
      'user@outlook.com',
      TimeSlotSource.OFFICE,
      { access_token: 'token', expiry_date: 0, refresh_token: 'refresh' }
    )
    expect(service).toBeDefined()
  })

  it('should return a CaldavCalendarService for WEBDAV provider', () => {
    const service = getConnectedCalendarIntegration(
      '0xABC',
      'user@caldav.com',
      TimeSlotSource.WEBDAV,
      { serverUrl: 'https://caldav.example.com', username: 'u', password: 'p' }
    )
    expect(service).toBeDefined()
  })

  it('should return a CaldavCalendarService for ICLOUD provider', () => {
    const service = getConnectedCalendarIntegration(
      '0xABC',
      'user@icloud.com',
      TimeSlotSource.ICLOUD,
      { serverUrl: 'https://caldav.icloud.com', username: 'u', password: 'p' }
    )
    expect(service).toBeDefined()
  })

  it('should return a WebCalService for WEBCAL provider', () => {
    const service = getConnectedCalendarIntegration(
      '0xABC',
      'user@example.com',
      TimeSlotSource.WEBCAL,
      'https://calendar.example.com/feed.ics'
    )
    expect(service).toBeDefined()
  })

  it('should throw for unsupported provider', () => {
    expect(() =>
      getConnectedCalendarIntegration(
        '0xABC',
        'user@example.com',
        'unsupported' as TimeSlotSource,
        {}
      )
    ).toThrow('Unsupported calendar provider')
  })
})
