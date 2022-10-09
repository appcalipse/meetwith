import * as Sentry from '@sentry/nextjs'

import { Account } from '@/types/Account'
import { MeetingCreationSyncRequest } from '@/types/Requests'

import { getConnectedCalendars } from './database'
import { getConnectedCalendarIntegration } from './services/connected_calendars.factory'

const syncCreatedEventWithCalendar = async (
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
      targetAccount,
      calendar.email,
      calendar.provider,
      calendar.payload
    )

    await integration.createEvent(
      targetAccount,
      meetingDetails,
      meeting_id,
      meetingDetails.created_at
    )
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
      targetAccount,
      calendar.email,
      calendar.provider,
      calendar.payload
    )

    await integration.updateEvent(targetAccount, meeting_id, meetingDetails)
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
    console.log(targetAccount, calendar)
    const integration = getConnectedCalendarIntegration(
      targetAccount,
      calendar.email,
      calendar.provider,
      calendar.payload
    )
    try {
      await integration.deleteEvent(meeting_id)
    } catch (error) {
      console.log(error)
      Sentry.captureException(error)
    }
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
            meetingDetails,
            participant.meeting_id!
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
