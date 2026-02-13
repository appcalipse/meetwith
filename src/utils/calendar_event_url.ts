import { TimeSlotSource } from '@/types/Meeting'

export const generateCalendarEventUrl = (
  source: string | undefined,
  eventId: string | undefined,
  webLink?: string | undefined
): string | null => {
  if (!source || !eventId) {
    return null
  }

  // For Outlook, use the webLink if available
  if (source === TimeSlotSource.OFFICE && webLink) {
    return webLink
  }

  // For Google Calendar, construct the URL from the webLink if available
  if (source === TimeSlotSource.GOOGLE && webLink) {
    return webLink
  }

  // For Google Calendar, construct the URL as fallback
  if (source === TimeSlotSource.GOOGLE && eventId) {
    const baseEventId = eventId.includes('_') ? eventId.split('_')[0] : eventId

    // Google Calendar event IDs need to be URL encoded
    const encodedEventId = encodeURIComponent(baseEventId)
    return `https://calendar.google.com/calendar/event?eid=${encodedEventId}`
  }

  // For Outlook without webLink, try to construct a URL
  if (source === TimeSlotSource.OFFICE && eventId) {
    return `https://outlook.live.com/calendar/view/event/${eventId}`
  }

  // For CalDAV/iCloud, we can't generate a reliable web URL, so return null
  if (source === TimeSlotSource.ICLOUD || source === TimeSlotSource.WEBDAV) {
    return null
  }

  return null
}
