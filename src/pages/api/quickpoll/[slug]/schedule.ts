import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { GuestScheduleRequest, PollStatus } from '@/types/QuickPoll'
import { MeetingPermissions } from '@/utils/constants/schedule'
import { initDB } from '@/utils/database'
import {
  QuickPollCreationError,
  QuickPollNotFoundError,
  QuickPollPermissionDeniedError,
  QuickPollValidationError,
} from '@/utils/errors'

const db = initDB()

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { slug } = req.query
    const body: GuestScheduleRequest = req.body

    if (!slug || typeof slug !== 'string') {
      throw new QuickPollValidationError('Poll slug is required')
    }

    if (!body.start || !body.end) {
      throw new QuickPollValidationError('Start and end times are required')
    }

    if (!body.guest_email) {
      throw new QuickPollValidationError('Email is required')
    }

    const { data: poll, error: pollError } = await db.supabase
      .from('quick_polls')
      .select('id, status, permissions, title')
      .eq('slug', slug)
      .maybeSingle()

    if (pollError || !poll) {
      throw new QuickPollNotFoundError(slug)
    }

    if (poll.status !== PollStatus.ONGOING) {
      throw new QuickPollValidationError(
        'This poll is no longer accepting responses'
      )
    }

    const permissions = (poll.permissions as string[]) || []
    const { data: scheduler } = await db.supabase
      .from('quick_poll_participants')
      .select('id, guest_email, guest_identifier')
      .eq('poll_id', poll.id)
      .eq('participant_type', 'scheduler')
      .maybeSingle()

    const isScheduler =
      scheduler?.guest_email === body.guest_email.toLowerCase() ||
      (body.guest_identifier &&
        scheduler?.guest_identifier === body.guest_identifier)

    if (
      !isScheduler &&
      !permissions.includes(MeetingPermissions.SCHEDULE_MEETING)
    ) {
      throw new QuickPollPermissionDeniedError()
    }

    const meetingTitle = body.title || poll.title

    const { data: meeting, error: meetingError } = await db.supabase
      .from('meetings')
      .insert({
        title: meetingTitle,
        start: body.start,
        end: body.end,
        meeting_url: null,
      })
      .select('id')
      .maybeSingle()

    if (meetingError || !meeting) {
      throw new QuickPollCreationError('Failed to create meeting')
    }

    const { error: linkError } = await db.supabase
      .from('quick_poll_meetings')
      .insert({
        poll_id: poll.id,
        meeting_id: meeting.id,
      })

    if (linkError) {
      throw new QuickPollCreationError('Failed to link meeting to poll')
    }

    await db.supabase
      .from('quick_polls')
      .update({ status: PollStatus.COMPLETED })
      .eq('id', poll.id)

    return res.status(201).json({
      meeting_id: meeting.id,
      poll_id: poll.id,
      status: 'scheduled',
    })
  } catch (error) {
    Sentry.captureException(error)

    if (error instanceof QuickPollValidationError) {
      return res.status(400).json({ error: error.message })
    }
    if (error instanceof QuickPollNotFoundError) {
      return res.status(404).json({ error: error.message })
    }
    if (error instanceof QuickPollPermissionDeniedError) {
      return res.status(403).json({ error: error.message })
    }
    if (error instanceof QuickPollCreationError) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    })
  }
}
