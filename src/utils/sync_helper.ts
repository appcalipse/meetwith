import * as Sentry from '@sentry/nextjs'

import { Account } from '@/types/Account'
import { TimeSlotSource } from '@/types/Meeting'
import { ParticipantType } from '@/types/ParticipantInfo'
import {
  DeleteInstanceRequest,
  MeetingCancelSyncRequest,
  MeetingCreationSyncRequest,
  MeetingInstanceCreationSyncRequest,
} from '@/types/Requests'

import { NO_MEETING_TYPE } from './constants/meeting-types'
import { getConnectedCalendars, getMeetingTypeFromDB } from './database'
import { getConnectedCalendarIntegration } from './services/connected_calendars.factory'
export const getCalendars = async (
  targetAccount: Account['address'],
  meeting_type_id?: string
) => {
  let calendars = await getConnectedCalendars(targetAccount, {
    syncOnly: true,
  })
  if (meeting_type_id && meeting_type_id !== NO_MEETING_TYPE) {
    const meetingType = await getMeetingTypeFromDB(meeting_type_id)
    if (
      meetingType &&
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
        if (
          innerCalendar.enabled &&
          innerCalendar.sync &&
          !innerCalendar.isReadOnly
        ) {
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
  const addedEmails = new Set<string>()

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
          const event = await integration.createEvent(
            targetAccount,
            meetingDetails,
            meetingDetails.created_at,
            innerCalendar.calendarId,
            useParticipants
          )
          event.attendees
            ?.map(attendee => attendee.email)
            .filter((email): email is string => !!email)
            .forEach(email => addedEmails.add(email))

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
          const event = await integration.createEvent(
            targetAccount,
            meetingDetails,
            meetingDetails.created_at,
            innerCalendar.calendarId,
            useParticipants
          )
          event.attendees
            ?.map(attendee => attendee.emailAddress.address)
            .filter((email): email is string => !!email)
            .forEach(email => addedEmails.add(email))

          useParticipants = false
        }
      }
    } else if (
      calendar.provider === TimeSlotSource.ICLOUD ||
      calendar.provider === TimeSlotSource.WEBDAV
    ) {
      const integration = getConnectedCalendarIntegration(
        calendar.account_address,
        calendar.email,
        calendar.provider,
        calendar.payload
      )

      for (const innerCalendar of calendar.calendars!) {
        if (innerCalendar.enabled && innerCalendar.sync) {
          const event = await integration.createEvent(
            targetAccount,
            meetingDetails,
            meetingDetails.created_at,
            innerCalendar.calendarId,
            useParticipants
          )
          event.attendees
            ?.map(attendee => attendee.email)
            .filter((email): email is string => !!email)
            .forEach(email => addedEmails.add(email))

          useParticipants = false
        }
      }
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
  meetingDetails: MeetingCreationSyncRequest
) => {
  const calendars = await getCalendars(
    targetAccount,
    meetingDetails.meeting_type_id
  )
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
              const event = await integration.updateEvent(
                targetAccount,
                meetingDetails,
                innerCalendar.calendarId
              )
              return event.attendees?.map(attendee => attendee.email)
            })()
          )
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
              const event = await integration.updateEvent(
                targetAccount,
                meetingDetails,
                innerCalendar.calendarId
              )
              return event.attendees?.map(
                attendee => attendee.emailAddress.address
              )
            })()
          )
        }
      }
    } else if (
      calendar.provider === TimeSlotSource.ICLOUD ||
      calendar.provider === TimeSlotSource.WEBDAV
    ) {
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
              const event = await integration.updateEvent(
                targetAccount,
                meetingDetails,
                innerCalendar.calendarId
              )
              return event.attendees?.map(attendee => attendee.email)
            })()
          )
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
              new Promise<void>(async resolve => {
                try {
                  integration.updateEvent(
                    targetAccount,
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
      }
    }
  }
  await Promise.all(participantPromises)
}

const syncDeletedEventWithCalendar = async (
  targetAccount: Account['address'],
  meeting_id: string
) => {
  const calendars = await getConnectedCalendars(targetAccount, {
    syncOnly: true,
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
              console.error(error)
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
const syncDeletedEventInstanceWithCalendar = async (
  targetAccount: Account['address'],
  meetingDetails: DeleteInstanceRequest
) => {
  const calendars = await getConnectedCalendars(targetAccount, {
    syncOnly: true,
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
              await integration.deleteEventInstance(
                innerCalendar.calendarId,
                meetingDetails
              )
            } catch (error) {
              console.error(error)
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
const getCalendarOrganizer = async (
  meetingDetails: MeetingCreationSyncRequest
) => {
  let calendarOrganizer = meetingDetails.participants.find(
    participant => participant.type === ParticipantType.Scheduler
  )
  let primaryEmail: string | undefined = undefined
  if (calendarOrganizer && calendarOrganizer.account_address) {
    primaryEmail = await getCalendarPrimaryEmail(
      calendarOrganizer.account_address,
      meetingDetails.meeting_type_id
    )
  }
  if (!calendarOrganizer?.account_address || !primaryEmail) {
    for (const current of meetingDetails.participants.filter(
      participant => participant.type === ParticipantType.Owner
    )) {
      if (!current.account_address) {
        continue
      }
      const primaryEmail = await getCalendarPrimaryEmail(
        current.account_address
      )
      if (primaryEmail) {
        calendarOrganizer = current
        break
      }
    }
  }

  return calendarOrganizer
}
export const ExternalCalendarSync = {
  deleteInstance: async (
    targetAccount: Account['address'],
    meetingDetails: DeleteInstanceRequest
  ) => {
    await syncDeletedEventInstanceWithCalendar(targetAccount, meetingDetails)
  },
  create: async (meetingDetails: MeetingCreationSyncRequest) => {
    const calendarOrganizer = await getCalendarOrganizer(meetingDetails)
    if (!calendarOrganizer || !calendarOrganizer.account_address) {
      throw new Error('Organizer Account not found for meeting calendar sync')
    }
    await syncCreatedEventWithCalendar(
      calendarOrganizer.account_address,
      meetingDetails
    )
  },
  delete: async (targetAccount: Account['address'], eventIds: string[]) => {
    const tasks = []
    for (const eventId of eventIds) {
      tasks.push(syncDeletedEventWithCalendar(targetAccount, eventId))
    }

    await Promise.all(tasks)
  },
  update: async (meetingDetails: MeetingCreationSyncRequest) => {
    const calendarOrganizer = await getCalendarOrganizer(meetingDetails)
    if (!calendarOrganizer || !calendarOrganizer.account_address) {
      throw new Error('Organizer Account not found for meeting calendar sync')
    }
    await syncUpdatedEventWithCalendar(
      calendarOrganizer.account_address!,
      meetingDetails
    )
  },
  updateInstance: async (
    meetingDetails: MeetingInstanceCreationSyncRequest
  ) => {
    if (!meetingDetails.original_start_time) {
      throw new Error(
        'original_start_time is required for recurring instance updates'
      )
    }

    const calendarOrganizer = await getCalendarOrganizer(meetingDetails)
    if (!calendarOrganizer || !calendarOrganizer.account_address) {
      throw new Error('Organizer Account not found for meeting calendar sync')
    }

    const calendars = await getCalendars(
      calendarOrganizer.account_address,
      meetingDetails.meeting_type_id
    )

    const promises = []

    for (const calendar of calendars) {
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
              try {
                await integration.updateEventInstance(
                  calendarOrganizer.account_address!,
                  meetingDetails,
                  innerCalendar.calendarId
                )
              } catch (error) {
                console.error(
                  `Failed to update instance in ${calendar.provider}:`,
                  error
                )
                Sentry.captureException(error)
              }
            })()
          )
        }
      }
    }

    // Sync to other participants' calendars
    const participantPromises = []
    for (const participant of meetingDetails.participants) {
      if (
        participant.account_address &&
        participant.account_address !== calendarOrganizer.account_address
      ) {
        const participantCalendars = await getCalendars(
          participant.account_address,
          meetingDetails.meeting_type_id
        )
        for (const pCalendar of participantCalendars) {
          const integration = getConnectedCalendarIntegration(
            pCalendar.account_address,
            pCalendar.email,
            pCalendar.provider,
            pCalendar.payload
          )
          for (const innerCalendar of pCalendar.calendars!) {
            if (innerCalendar.enabled && innerCalendar.sync) {
              participantPromises.push(
                (async () => {
                  try {
                    await integration.updateEventInstance(
                      participant.account_address!,
                      meetingDetails,
                      innerCalendar.calendarId
                    )
                  } catch (error) {
                    console.error(
                      `Failed to update instance for participant ${participant.account_address}:`,
                      error
                    )
                    Sentry.captureException(error)
                  }
                })()
              )
            }
          }
        }
      }
    }

    await Promise.all([...promises, ...participantPromises])
  },
}
