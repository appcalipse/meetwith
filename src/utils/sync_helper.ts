import { Account } from '../types/Account'
import {
  MeetingCreationRequest,
  MeetingDecrypted,
  ParticipantType,
} from '../types/Meeting'
import { getAccountFromDB, getConnectedCalendars } from './database'
import { getConnectedCalendarIntegration } from './services/connected_calendars_factory'
import { isProAccount } from './subscription_manager'

export const syncCalendarWithAccount = async (
  targetAccount: Account['address'],
  event: MeetingCreationRequest
) => {
  const account = await getAccountFromDB(targetAccount)
  if (isProAccount(account)) {
    const calendars = await getConnectedCalendars(targetAccount, true)
    for (const calendar of calendars) {
      const integration = getConnectedCalendarIntegration(
        targetAccount,
        calendar.email,
        calendar.provider,
        calendar.payload
      )

      await integration.createEvent(account.address, { ...event })
    }
  }
}

export const syncCalendarForMeeting = async (event: MeetingCreationRequest) => {
  // schedule for other users, if they are also pro
  const tasks: Promise<any>[] = []
  for (const participant of event.participants_mapping) {
    if (
      [ParticipantType.Scheduler, ParticipantType.Owner].includes(
        participant.type
      )
    ) {
      tasks.push(syncCalendarWithAccount(participant.account_address!, event))
    }
  }

  await Promise.all(tasks)
}
