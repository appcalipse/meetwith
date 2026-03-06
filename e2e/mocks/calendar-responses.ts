/**
 * Mock responses for calendar API interception.
 * Used by the calendar-mock fixture to fulfill intercepted requests.
 */

export const googleCalendarEventResponse = {
  kind: 'calendar#event',
  etag: '"e2e-test-etag"',
  id: 'e2e-test-google-event-id',
  status: 'confirmed',
  htmlLink: 'https://www.google.com/calendar/event?eid=e2e-test',
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  summary: 'E2E Test Meeting',
  description: 'Created by E2E test',
  start: {
    dateTime: new Date(Date.now() + 86400000).toISOString(),
    timeZone: 'UTC',
  },
  end: {
    dateTime: new Date(Date.now() + 86400000 + 1800000).toISOString(),
    timeZone: 'UTC',
  },
  conferenceData: {
    entryPoints: [
      {
        entryPointType: 'video',
        uri: 'https://meet.google.com/e2e-test',
        label: 'meet.google.com/e2e-test',
      },
    ],
    conferenceSolution: {
      key: { type: 'hangoutsMeet' },
      name: 'Google Meet',
    },
    conferenceId: 'e2e-test-conference',
  },
}

export const office365CalendarEventResponse = {
  '@odata.context':
    "https://graph.microsoft.com/v1.0/$metadata#users('test')/calendar/events/$entity",
  '@odata.etag': '"e2e-test-etag"',
  id: 'e2e-test-office365-event-id',
  subject: 'E2E Test Meeting',
  bodyPreview: 'Created by E2E test',
  start: {
    dateTime: new Date(Date.now() + 86400000).toISOString(),
    timeZone: 'UTC',
  },
  end: {
    dateTime: new Date(Date.now() + 86400000 + 1800000).toISOString(),
    timeZone: 'UTC',
  },
  onlineMeeting: {
    joinUrl: 'https://teams.microsoft.com/l/meetup-join/e2e-test',
  },
  isOnlineMeeting: true,
  onlineMeetingProvider: 'teamsForBusiness',
}
