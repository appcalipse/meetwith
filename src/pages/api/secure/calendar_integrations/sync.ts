import type { NextApiRequest, NextApiResponse } from 'next'

import { Account } from '../../../../types/Account'
import { MeetingDecrypted, ParticipantType } from '../../../../types/Meeting'
import { withSessionRoute } from '../../../../utils/auth/withSessionApiRoute'
import { decryptMeeting } from '../../../../utils/calendar_manager'
import {
  getAccountFromDB,
  getConnectedCalendars,
  getMeetingFromDB,
} from '../../../../utils/database'
import { getConnectedCalendarIntegration } from '../../../../utils/services/connected_calendars_factory'

const syncCalendarsIfNeeded = async (
  address: Account['address'],
  meeting: MeetingDecrypted
) => {
  const account = await getAccountFromDB(address)
  if (account.is_pro) {
    const calendars = await getConnectedCalendars(address, true)
    for (const calendar of calendars) {
      const integration = getConnectedCalendarIntegration(
        address,
        calendar.email,
        calendar.provider,
        calendar.payload
      )

      await integration.createEvent(account.address, meeting)
    }
  }
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    // sanity check
    if (!req.session.account) {
      res.status(400).json({ message: 'SHOULD BE LOGGED IN' })
      return
    }

    const { meetingId } = req.body
    const encryptedMeeting = await getMeetingFromDB(meetingId)

    const meeting = await decryptMeeting(
      encryptedMeeting,
      req.session.account,
      req.session.account.signature
    )

    let canSyncSchedules = false
    for (const participant of meeting.participants) {
      if (participant.account_address === req.session.account.address) {
        canSyncSchedules = true
        break
      }
    }

    if (!canSyncSchedules) {
      res
        .status(403)
        .send("You can't sync schedules in a meeting you don't belong to.")
      return
    }

    // schedule for other users, if they are also pro
    const tasks: Promise<any>[] = []
    for (const participant of meeting.participants) {
      if (
        [ParticipantType.Scheduler, ParticipantType.Owner].includes(
          participant.type
        )
      ) {
        tasks.push(syncCalendarsIfNeeded(participant.account_address, meeting))
      }
    }

    await Promise.all(tasks)
    res.status(200).json({})
  }
}

export default withSessionRoute(handler)
