import * as Sentry from '@sentry/nextjs'

import { Account } from '@/types/Account'
import { MeetingCreationSyncRequest } from '@/types/Requests'

import { getConnectedCalendars } from './database'
import { getConnectedCalendarIntegration } from './services/connected_calendars.factory'

const syncCreatedEventWithCalendar = async (
  targetAccount: Account['address'],
  meetingDetails: MeetingCreationSyncRequest
) => {
  const calendars = await getConnectedCalendars(targetAccount, {
    syncOnly: true,
    activeOnly: true,
  })

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
          new Promise<void>(async resolve => {
            try {
              await integration.createEvent(
                targetAccount,
                meetingDetails,
                meetingDetails.created_at,
                innerCalendar.calendarId
              )
            } catch (error) {
              Sentry.captureException(error)
            }
            resolve()
          })
        )
      }
    }
    await Promise.all(promises)
  }
}

const syncUpdatedEventWithCalendar = async (
  targetAccount: Account['address'],
  meetingDetails: MeetingCreationSyncRequest,
  meeting_id: string
) => {
  const calendars = await getConnectedCalendars(targetAccount, {
    syncOnly: true,
    activeOnly: true,
  })

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
          new Promise<void>(async resolve => {
            await integration.updateEvent(
              targetAccount,
              meeting_id,
              meetingDetails,
              innerCalendar.calendarId
            )
            resolve()
          })
        )
      }
    }
    await Promise.all(promises)
  }
}

const syncDeletedEventWithCalendar = async (
  targetAccount: Account['address'],
  meeting_id: string
) => {
  const calendars = await getConnectedCalendars(targetAccount, {
    syncOnly: true,
    activeOnly: true,
  })

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
          new Promise<void>(async resolve => {
            try {
              await integration.deleteEvent(
                meeting_id,
                innerCalendar.calendarId
              )
              resolve()
            } catch (error) {
              Sentry.captureException(error)
            }
          })
        )
      }
    }
    await Promise.all(promises)
  }
}

// TODO: schedule for other users, if they are also pro plan
export const ExternalCalendarSync = {
  create: async (meetingDetails: MeetingCreationSyncRequest) => {
    const tasks: Promise<any>[] = []
    for (const participant of meetingDetails.participants) {
      if (participant.account_address) {
        tasks.push(
          syncCreatedEventWithCalendar(
            participant.account_address!,
            meetingDetails
          )
        )
      }
    }

    await Promise.all(tasks)
  },
  update: async (meetingDetails: MeetingCreationSyncRequest) => {
    const tasks: Promise<any>[] = []
    for (const participant of meetingDetails.participants) {
      if (participant.account_address) {
        tasks.push(
          syncUpdatedEventWithCalendar(
            participant.account_address!,
            meetingDetails,
            participant.meeting_id!
          )
        )
      }
    }

    await Promise.all(tasks)
  },
  delete: async (targetAccount: Account['address'], eventIds: string[]) => {
    const tasks = []
    for (const eventId of eventIds) {
      tasks.push(syncDeletedEventWithCalendar(targetAccount, eventId))
    }

    await Promise.all(tasks)
  },
}
