import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { NotificationChannel } from '@/types/AccountNotifications'
// eslint-disable-next-line
import { DBSlot, MeetingProvider, TimeSlotSource } from '@/types/Meeting'
import { ParticipantType } from '@/types/ParticipantInfo'
import { MeetingCreationRequest } from '@/types/Requests'
import { createHuddleRoom } from '@/utils/api_helper'
import {
  getAccountFromDB,
  getAccountNotificationSubscriptions,
  getConnectedCalendars,
  saveMeeting,
  setAccountNotificationSubscriptions,
} from '@/utils/database'
import {
  GateConditionNotValidError,
  MeetingCreationError,
  TimeNotAvailableError,
} from '@/utils/errors'
import { getConnectedCalendarIntegration } from '@/utils/services/connected_calendars.factory'
import { getParticipantBaseInfoFromAccount } from '@/utils/user_manager'
import { isValidEmail } from '@/utils/validations'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  const account_address = req.session.account!.address
  const meeting: MeetingCreationRequest = req.body as MeetingCreationRequest

  return handleMeetingSchedule(account_address, meeting, req, res)
}

export const handleMeetingSchedule = async (
  account_address: string,
  meeting: MeetingCreationRequest,
  req: NextApiRequest,
  res: NextApiResponse
) => {
  if (req.method === 'POST') {
    const account = await getAccountFromDB(account_address)

    if (
      meeting.participants_mapping.filter(
        participant =>
          participant.account_address?.toLowerCase() ===
          account.address.toLowerCase()
      ).length === 0
    ) {
      return res
        .status(403)
        .send("You can't schedule a meeting for someone else")
    }

    const participantActing = getParticipantBaseInfoFromAccount(
      await getAccountFromDB(account_address)
    )

    const updateEmailNotifications = async (email: string) => {
      try {
        const subs = await getAccountNotificationSubscriptions(account_address)

        subs.notification_types = subs.notification_types.filter(
          type => type.channel !== NotificationChannel.EMAIL
        )

        if (isValidEmail(email)) {
          subs.notification_types.push({
            channel: NotificationChannel.EMAIL,
            destination: email,
            disabled: false,
          })
          await setAccountNotificationSubscriptions(account_address, subs)
        }
      } catch (e) {
        console.error(e)
      }
    }
    if (isValidEmail(meeting.emailToSendReminders))
      await updateEmailNotifications(meeting.emailToSendReminders!)

    switch (meeting.meetingProvider) {
      case MeetingProvider.GOOGLE_MEET:
        const owner = meeting.participants_mapping.filter(
          participant => participant.type == ParticipantType.Owner
        )[0]

        if (!owner) {
          return res.status(412).send('No owner with connected Google Calendar')
        }

        const calendars = await getConnectedCalendars(owner.account_address!, {
          syncOnly: false,
          activeOnly: true,
        })

        for (const calendar of calendars) {
          if (calendar.provider == TimeSlotSource.GOOGLE) {
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
                  integration.createEvent(
                    owner.account_address!,
                    {
                      meeting_url: '',
                      participants: meeting.participants_mapping,
                      title: meeting.title,
                      content: meeting.content,
                      meetingProvider: MeetingProvider.GOOGLE_MEET,
                      participantActing,
                      meeting_id: meeting.meeting_id,
                      start: new Date(meeting.start),
                      end: new Date(meeting.end),
                      created_at: new Date(),
                      timezone: owner.timeZone,
                    },
                    new Date(),
                    innerCalendar.calendarId
                  )
                )
              }
            }
            const results = await Promise.all(promises)
            console.log(results)
            meeting.meeting_url = results[0].url
          }
        }
        break
      case MeetingProvider.HUDDLE:
        meeting.meeting_url = (await createHuddleRoom())?.url
        break
      default:
        break
    }

    try {
      const meetingResult: DBSlot = await saveMeeting(
        participantActing,
        meeting
      )

      return res.status(200).json(meetingResult)
    } catch (e) {
      if (e instanceof TimeNotAvailableError) {
        return res.status(409).send(e)
      } else if (e instanceof MeetingCreationError) {
        return res.status(412).send(e)
      } else if (e instanceof GateConditionNotValidError) {
        return res.status(403).send(e)
      } else {
        Sentry.captureException(e)
        return res.status(500).send(e)
      }
    }
  }

  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
