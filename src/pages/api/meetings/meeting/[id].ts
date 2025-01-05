import * as Sentry from '@sentry/nextjs'
import { decryptWithPrivateKey } from 'eth-crypto'
import { NextApiRequest, NextApiResponse } from 'next'

import { MeetingDecrypted, MeetingInfo } from '@/types/Meeting'
import { ParticipantType } from '@/types/ParticipantInfo'
import {
  GuestMeetingCancelRequest,
  MeetingCancelRequest,
} from '@/types/Requests'
import { getMeeting } from '@/utils/api_helper'
import { deleteMeetingFromDB, getMeetingFromDB } from '@/utils/database'
import {
  GateConditionNotValidError,
  MeetingCancelForbiddenError,
  MeetingChangeConflictError,
  MeetingCreationError,
  TimeNotAvailableError,
} from '@/utils/errors'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    if (!req.query.id) {
      return res.status(404).send('Id parameter required')
    }

    try {
      const meeting = await getMeetingFromDB(req.query.id as string)
      if (req.query.is_guest) {
        const content = await decryptWithPrivateKey(
          process.env.NEXT_SERVER_PVT_KEY!,
          meeting.meeting_info_encrypted
        )

        const meetingInfo = JSON.parse(content) as MeetingInfo
        meeting.public_decrypted_data = {
          id: meeting.id!,
          ...meeting,
          meeting_id: meetingInfo.meeting_id,
          created_at: meeting.created_at!,
          participants: meetingInfo.participants,
          content: meetingInfo.content,
          title: meetingInfo.title,
          meeting_url: meetingInfo.meeting_url,
          related_slot_ids: meetingInfo.related_slot_ids,
          start: new Date(meeting.start),
          end: new Date(meeting.end),
          version: meeting.version,
          reminders: meetingInfo.reminders,
          provider: meetingInfo?.provider,
          recurrence: meetingInfo?.recurrence,
        }
      }
      return res.status(200).json(meeting)
    } catch (err) {
      Sentry.captureException(err)
      return res.status(404).send('Not found')
    }
  }
  if (req.method === 'DELETE') {
    const { meeting, guest_email, currentTimezone } =
      req.body as GuestMeetingCancelRequest
    if (!meeting.id) {
      throw new MeetingChangeConflictError()
    }

    const signature = process.env.NEXT_SERVER_PVT_KEY

    const existingDBSlot = await getMeeting(meeting.id, true)
    const existingMeeting = existingDBSlot.public_decrypted_data
    // Only the owner or scheduler of the meeting can cancel it
    const meetingOwner = existingMeeting!.participants.find(
      user => user.type === ParticipantType.Owner
    )
    const meetingScheduler = existingMeeting!.participants.find(
      user => user.type === ParticipantType.Scheduler
    )

    if (meetingScheduler?.guest_email !== guest_email) {
      throw new MeetingCancelForbiddenError()
    }
    // make sure that we are trying to update the latest version of the meeting,
    // otherwise it means that somebody changes before this one
    if (meeting.version !== existingDBSlot.version) {
      throw new MeetingChangeConflictError()
    }
    // load the original slot information that is already stored in the database
    const slotsToRemove = [
      req.query.id as string,
      ...(meeting.related_slot_ids || []),
    ]

    const guestsToRemove = meeting.participants.filter(p => p.guest_email)

    try {
      await deleteMeetingFromDB(
        {
          guest_email,
          name: meetingScheduler?.name,
        },
        slotsToRemove,
        guestsToRemove,
        meeting.meeting_id,
        currentTimezone
      )
      return res.status(200).json({ removed: slotsToRemove })
    } catch (e) {
      if (e instanceof TimeNotAvailableError) {
        return res.status(409).send(e)
      } else if (e instanceof MeetingChangeConflictError) {
        return res.status(417).send(e) // this is really bad, we will run out of http codes to use
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

export default handler
