import * as Sentry from '@sentry/nextjs'

import { Account } from '@/types/Account'
import { MeetingCreationSyncRequest } from '@/types/Requests'

import { getConnectedCalendars, getMeetingTypeFromDB } from './database'
import { getConnectedCalendarIntegration } from './services/connected_calendars.factory'
export const getCalendars = async (
  targetAccount: Account['address'],
  meeting_type_id?: string
) => {
  let calendars = await getConnectedCalendars(targetAccount, {
    syncOnly: true,
    activeOnly: true,
  })
  if (meeting_type_id) {
    const meetingType = await getMeetingTypeFromDB(meeting_type_id)
    if (
      meetingType.calendars &&
      meetingType.account_owner_address === targetAccount
    ) {
      calendars = meetingType.calendars
        ? calendars.filter(calendar =>
            meetingType.calendars?.some(c => c.id === calendar.id)
          )
        : calendars
    }
  }
  return calendars
}
const syncCreatedEventWithCalendar = async (
  targetAccount: Account['address'],
  meetingDetails: MeetingCreationSyncRequest
) => {
  const calendars = await getCalendars(
    targetAccount,
    meetingDetails.meeting_type_id
  )

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
          integration
            .createEvent(
              targetAccount,
              meetingDetails,
              meetingDetails.created_at,
              innerCalendar.calendarId,
              false
            )
            .catch(error => {
              console.error(
                'An error occurred while creating the event:',
                error
              )
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
  const calendars = await getCalendars(
    targetAccount,
    meetingDetails.meeting_type_id
  )

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
              await integration.updateEvent(
                targetAccount,
                meeting_id,
                meetingDetails,
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

export const ExternalCalendarSync = {
  create: async (meetingDetails: MeetingCreationSyncRequest) => {
    const tasks = []
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
    const tasks = []
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
