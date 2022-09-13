import { Account } from '@/types/Account'
import { MeetingCreationRequest, MeetingUpdateRequest } from '@/types/Meeting'

import { getConnectedCalendars } from './database'
import { getConnectedCalendarIntegration } from './services/connected_calendars.factory'

const syncCreatedEventWithCalendar = async (
  targetAccount: Account['address'],
  event: MeetingCreationRequest,
  slot_id: string,
  meeting_creation_time: Date
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
      event,
      slot_id,
      meeting_creation_time
    )
  }
}

const syncUpdatedEventWithCalendar = async (
  targetAccount: Account['address'],
  event: MeetingUpdateRequest,
  slot_id: string
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

    await integration.updateEvent(targetAccount, slot_id, event)
  }
}

const syncDeletedEventWithCalendar = async (
  targetAccount: Account['address'],
  slot_id: string
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

    await integration.deleteEvent(slot_id)
  }
}

// TODO: schedule for other users, if they are also pro plan
export const ExternalCalendarSync = {
  create: async (
    event: MeetingCreationRequest,
    meeting_creation_time: Date
  ) => {
    const tasks: Promise<any>[] = []
    for (const participant of event.participants_mapping) {
      if (participant.account_address) {
        tasks.push(
          syncCreatedEventWithCalendar(
            participant.account_address!,
            event,
            participant.slot_id,
            meeting_creation_time
          )
        )
      }
    }

    await Promise.all(tasks)
  },
  update: async (event: MeetingUpdateRequest) => {
    const tasks: Promise<any>[] = []
    for (const participant of event.participants_mapping) {
      tasks.push(
        syncUpdatedEventWithCalendar(
          participant.account_address!,
          event,
          participant.slot_id
        )
      )
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
