import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { NotificationChannel } from '@/types/AccountNotifications'
import { DBSlot } from '@/types/Meeting'
import { MeetingCreationRequest } from '@/types/Requests'
import {
  getAccountFromDB,
  getAccountNotificationSubscriptions,
  registerMeetingSession,
  saveMeeting,
  setAccountNotificationSubscriptions,
} from '@/utils/database'
import {
  AllMeetingSlotsUsedError,
  GateConditionNotValidError,
  MeetingCreationError,
  TimeNotAvailableError,
  TransactionIsRequired,
} from '@/utils/errors'
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
      } else if (e instanceof AllMeetingSlotsUsedError) {
        return res.status(402).send(e)
      } else if (e instanceof TransactionIsRequired) {
        return res.status(400).send(e)
      } else {
        Sentry.captureException(e)
        return res.status(500).send(e)
      }
    }
  }

  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
