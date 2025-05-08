import { getConnectedCalendars } from './database'
import { getConnectedCalendarIntegration } from './services/connected_calendars.factory'

export const eventExists = async (meetingId: string, targetAccount: string) => {
  try {
    const exists = []
    const calendars = await getConnectedCalendars(targetAccount, {
      syncOnly: true,
      activeOnly: true,
    })
    if (!calendars || calendars.length === 0) {
      // No calendars found so can't confirm if event was added or not skip check for this case
      return true
    }
    for (const calendar of calendars) {
      const integration = getConnectedCalendarIntegration(
        calendar.account_address,
        calendar.email,
        calendar.provider,
        calendar.payload
      )

      const promises = []
      for (const innerCalendar of calendar.calendars!) {
        if (innerCalendar.enabled && innerCalendar.sync) {
          promises.push(
            integration.getEventById(meetingId, innerCalendar.calendarId)
          )
        }
      }
      const events = await Promise.all(promises)
      for (const event of events) {
        if (event) {
          exists.push(event)
        }
      }
    }
    // eslint-disable-next-line no-restricted-syntax
    console.log(exists)
    return exists.length > 0
  } catch (error) {
    console.error('Error checking event existence:', error)
    return false
  }
}
