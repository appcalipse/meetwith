import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { MeetingProvider, TimeSlotSource } from '@/types/Meeting'
import { ParticipantType } from '@/types/ParticipantInfo'
import { UrlCreationRequest } from '@/types/Requests'
import { createHuddleRoom } from '@/utils/api_helper'
import { getAccountFromDB, getConnectedCalendars } from '@/utils/database'
import {
  GateConditionNotValidError,
  MeetingCreationError,
  TimeNotAvailableError,
} from '@/utils/errors'
import { getConnectedCalendarIntegration } from '@/utils/services/connected_calendars.factory'
import { getParticipantBaseInfoFromAccount } from '@/utils/user_manager'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  const account_address = req.session.account!.address
  const meeting: UrlCreationRequest = req.body as UrlCreationRequest

  return handleMeetingSchedule(account_address, meeting, req, res)
}

export const handleMeetingSchedule = async (
  account_address: string,
  meeting: UrlCreationRequest,
  req: NextApiRequest,
  res: NextApiResponse
) => {
  if (req.method === 'POST') {
    try {
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
      let url = ''
      switch (meeting.meetingProvider) {
        case MeetingProvider.GOOGLE_MEET:
          let owner = meeting.participants_mapping.filter(
            participant => participant.type == ParticipantType.Owner
          )[0]

          if (!owner) {
            owner = meeting.participants_mapping.filter(
              participant => participant.type == ParticipantType.Scheduler
            )[0]
          }
          if (!owner) {
            return res
              .status(412)
              .send('No owner with connected Google Calendar')
          }
          if (!owner.account_address) {
            return res
              .status(412)
              .send('Owner does not have an account address')
          }
          const account = await getAccountFromDB(owner.account_address)
          const calendars = await getConnectedCalendars(owner.account_address, {
            syncOnly: false,
            activeOnly: true,
          })

          let eventAdded = false
          for (const calendar of calendars) {
            if (eventAdded) break
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
                        timezone: account.preferences.timezone,
                      },
                      new Date(),
                      innerCalendar.calendarId
                    )
                  )
                }
              }
              const results = await Promise.all(promises)
              url = results[0].additionalInfo.hangoutLink
              eventAdded = true
              break
            }
          }
          break
        case MeetingProvider.HUDDLE:
          url = (await createHuddleRoom())?.url
          break
        default:
          break
      }

      return res.status(200).json({
        url,
      })
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
