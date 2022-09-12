import { Account } from '@/types/Account'
import { MeetingCreationRequest } from '@/types/Meeting'

import { getConnectedCalendars } from './database'
import { getConnectedCalendarIntegration } from './services/connected_calendars.factory'

export const syncCalendarWithAccount = async (
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

export const syncCalendarForMeeting = async (
  event: MeetingCreationRequest,
  meeting_creation_time: Date
) => {
  // schedule for other users, if they are also pro
  const tasks: Promise<any>[] = []
  for (const participant of event.participants_mapping) {
    if (participant.account_address) {
      tasks.push(
        syncCalendarWithAccount(
          participant.account_address!,
          event,
          participant.slot_id,
          meeting_creation_time
        )
      )
    }
  }

  await Promise.all(tasks)
}
