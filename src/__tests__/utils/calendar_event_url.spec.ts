import { generateCalendarEventUrl } from '@/utils/calendar_event_url'
import { TimeSlotSource } from '@/types/Meeting'

describe('generateCalendarEventUrl', () => {
  it('returns null when source is undefined', () => {
    // given
    const source = undefined
    const eventId = 'some-event-id'

    // when
    const result = generateCalendarEventUrl(source, eventId)

    // then
    expect(result).toBeNull()
  })

  it('returns null when eventId is undefined', () => {
    // given
    const source = TimeSlotSource.GOOGLE
    const eventId = undefined

    // when
    const result = generateCalendarEventUrl(source, eventId)

    // then
    expect(result).toBeNull()
  })

  it('returns null when both source and eventId are undefined', () => {
    // given
    const source = undefined
    const eventId = undefined

    // when
    const result = generateCalendarEventUrl(source, eventId)

    // then
    expect(result).toBeNull()
  })

  it('returns webLink for Google source when webLink is provided', () => {
    // given
    const source = TimeSlotSource.GOOGLE
    const eventId = 'some-event-id'
    const webLink = 'https://calendar.google.com/calendar/event?eid=abc123'

    // when
    const result = generateCalendarEventUrl(source, eventId, webLink)

    // then
    expect(result).toBe(webLink)
  })

  it('constructs Google Calendar URL from eventId when webLink is not provided', () => {
    // given
    const source = TimeSlotSource.GOOGLE
    const eventId = 'abc123'

    // when
    const result = generateCalendarEventUrl(source, eventId)

    // then
    expect(result).toBe('https://calendar.google.com/calendar/event?eid=abc123')
  })

  it('strips suffix after underscore from Google eventId', () => {
    // given
    const source = TimeSlotSource.GOOGLE
    const eventId = 'abc123_20230101T120000Z'

    // when
    const result = generateCalendarEventUrl(source, eventId)

    // then
    expect(result).toBe('https://calendar.google.com/calendar/event?eid=abc123')
  })

  it('returns webLink for Office source when webLink is provided', () => {
    // given
    const source = TimeSlotSource.OFFICE
    const eventId = 'some-event-id'
    const webLink = 'https://outlook.office365.com/calendar/item/abc123'

    // when
    const result = generateCalendarEventUrl(source, eventId, webLink)

    // then
    expect(result).toBe(webLink)
  })

  it('constructs Outlook URL from eventId for Office source when webLink is not provided', () => {
    // given
    const source = TimeSlotSource.OFFICE
    const eventId = 'some-event-id'

    // when
    const result = generateCalendarEventUrl(source, eventId)

    // then
    expect(result).toBe('https://outlook.live.com/calendar/view/event/some-event-id')
  })

  it('returns null for iCloud source', () => {
    // given
    const source = TimeSlotSource.ICLOUD
    const eventId = 'some-event-id'

    // when
    const result = generateCalendarEventUrl(source, eventId)

    // then
    expect(result).toBeNull()
  })

  it('returns null for Webdav source', () => {
    // given
    const source = TimeSlotSource.WEBDAV
    const eventId = 'some-event-id'

    // when
    const result = generateCalendarEventUrl(source, eventId)

    // then
    expect(result).toBeNull()
  })

  it('returns null for unknown source', () => {
    // given
    const source = 'UnknownCalendar' as string
    const eventId = 'some-event-id'

    // when
    const result = generateCalendarEventUrl(source, eventId)

    // then
    expect(result).toBeNull()
  })
})
