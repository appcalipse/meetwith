import * as Sentry from '@sentry/nextjs'

import { Account } from '@/types/Account'
import { TimeSlotSource } from '@/types/Meeting'
import { ParticipantType } from '@/types/ParticipantInfo'
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

export const getCalendarPrimaryEmail = async (
  targetAccount: string,
  meeting_type_id?: string
) => {
  try {
    const calendars = await getCalendars(targetAccount, meeting_type_id)
    for (const calendar of calendars) {
      for (const innerCalendar of calendar.calendars!) {
        if (innerCalendar.enabled && innerCalendar.sync) {
          return calendar.email
        }
      }
    }
  } catch (error) {
    Sentry.captureException(error)
  }
}
const syncCreatedEventWithCalendar = async (
  targetAccount: Account['address'],
  meetingDetails: MeetingCreationSyncRequest
) => {
  const calendars = await getCalendars(
    targetAccount,
    meetingDetails.meeting_type_id
  )
  let useParticipants = true
  const promises = []
  for (const calendar of calendars) {
    if (calendar.provider === TimeSlotSource.GOOGLE) {
      const integration = getConnectedCalendarIntegration(
        calendar.account_address,
        calendar.email,
        calendar.provider,
        calendar.payload
      )

      for (const innerCalendar of calendar.calendars!) {
        if (innerCalendar.enabled && innerCalendar.sync) {
          promises.push(
            (async () => {
              const event = await integration.createEvent(
                targetAccount,
                meetingDetails,
                meetingDetails.created_at,
                innerCalendar.calendarId,
                useParticipants
              )
              return event.attendees?.map(attendee => attendee.email)
            })()
          )
          useParticipants = false
        }
      }
    } else if (calendar.provider === TimeSlotSource.OFFICE) {
      const integration = getConnectedCalendarIntegration(
        calendar.account_address,
        calendar.email,
        calendar.provider,
        calendar.payload
      )

      for (const innerCalendar of calendar.calendars!) {
        if (innerCalendar.enabled && innerCalendar.sync) {
          promises.push(
            (async () => {
              const event = await integration.createEvent(
                targetAccount,
                meetingDetails,
                meetingDetails.created_at,
                innerCalendar.calendarId,
                useParticipants
              )
              return event.attendees?.map(
                attendee => attendee.emailAddress.address
              )
            })()
          )
          useParticipants = false
        }
      }
    } else {
      const integration = getConnectedCalendarIntegration(
        calendar.account_address,
        calendar.email,
        calendar.provider,
        calendar.payload
      )

      for (const innerCalendar of calendar.calendars!) {
        if (innerCalendar.enabled && innerCalendar.sync) {
          promises.push(
            (async () => {
              const event = await integration.createEvent(
                targetAccount,
                meetingDetails,
                meetingDetails.created_at,
                innerCalendar.calendarId,
                useParticipants
              )
              return event
            })()
          )
          useParticipants = false
        }
      }
    }
  }
  const addedEmails = new Set<string>()
  const resolutions = await Promise.all(promises)
  const atendees = resolutions
    .filter(
      (r): r is string[] =>
        Array.isArray(r) && r.filter(email => !!email).length > 0
    )
    .flat()
  for (const attendee of atendees) {
    if (attendee && !addedEmails.has(attendee)) {
      addedEmails.add(attendee)
    }
  }
  const participantPromises = []
  for (const participant of meetingDetails.participants) {
    if (
      participant.account_address &&
      participant.account_address !== targetAccount
    ) {
      const participantCalendars = await getCalendars(
        participant.account_address,
        meetingDetails.meeting_type_id
      )
      for (const pCalendar of participantCalendars) {
        if (addedEmails.has(pCalendar.email)) {
          continue
        }
        const integration = getConnectedCalendarIntegration(
          pCalendar.account_address,
          pCalendar.email,
          pCalendar.provider,
          pCalendar.payload
        )
        for (const innerCalendar of pCalendar.calendars!) {
          if (innerCalendar.enabled && innerCalendar.sync) {
            participantPromises.push(
              integration.createEvent(
                targetAccount,
                meetingDetails,
                meetingDetails.created_at,
                innerCalendar.calendarId,
                false
              )
            )
          }
        }
      }
    }
  }
  await Promise.all(participantPromises)
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
    const schedulerAccount = meetingDetails.participants.find(
      participant => participant.type === ParticipantType.Scheduler
    )
    if (!schedulerAccount || !schedulerAccount.account_address) {
      throw new Error('Scheduler account not found for meeting creation sync')
    }
    await syncCreatedEventWithCalendar(
      schedulerAccount.account_address,
      meetingDetails
    )
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
