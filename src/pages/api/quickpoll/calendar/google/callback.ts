import * as Sentry from '@sentry/nextjs'
import { Auth, google } from 'googleapis'
import type { NextApiRequest, NextApiResponse } from 'next'

import { CalendarSyncInfo } from '@/types/CalendarConnections'
import { TimeSlotSource } from '@/types/Meeting'
import {
  OAuthCallbackQuery,
  PollVisibility,
  QuickPollParticipantType,
} from '@/types/QuickPoll'
import { apiUrl } from '@/utils/constants'
import {
  addQuickPollParticipant,
  getQuickPollBySlug,
  getQuickPollParticipantByIdentifier,
  saveQuickPollCalendar,
} from '@/utils/database'

const credentials = {
  client_id: process.env.GOOGLE_CLIENT_ID,
  client_secret: process.env.GOOGLE_CLIENT_SECRET,
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, query } = req

  if (method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code, error, state }: OAuthCallbackQuery = query

  const stateObject =
    typeof state === 'string'
      ? JSON.parse(Buffer.from(state, 'base64').toString())
      : undefined

  if (error) {
    Sentry.captureException(error)
    if (!stateObject)
      return res.redirect(`/poll/${stateObject?.pollSlug}?calendarResult=error`)
    else {
      stateObject.error = 'Google Calendar integration failed.'
      const newState64 = Buffer.from(JSON.stringify(stateObject)).toString(
        'base64'
      )
      return res.redirect(
        `/poll/${stateObject?.pollSlug}?calendarResult=error&state=${newState64}`
      )
    }
  }

  if (code && typeof code !== 'string') {
    return res.status(400).json({ message: '`code` must be a string' })
  }

  if (!credentials) {
    return res
      .status(400)
      .json({ message: 'There are no Google Credentials installed.' })
  }

  const { client_secret, client_id } = credentials
  const redirect_uri = `${apiUrl}/quickpoll/calendar/google/callback`

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uri
  )

  let key: Auth.Credentials = {}

  try {
  if (code) {
    const token = await oAuth2Client.getToken(code)
    key = token.res?.data
  }

  oAuth2Client.setCredentials({ access_token: key?.access_token })
  const userInfoRes = await google
    .oauth2('v2')
    .userinfo.get({ auth: oAuth2Client })

  const calendar = google.calendar({ auth: oAuth2Client, version: 'v3' })

  let calendars: Array<CalendarSyncInfo>
  try {
    calendars = (await calendar.calendarList.list()).data.items!.map(c => {
      return {
        calendarId: c.id!,
        color: c.backgroundColor || undefined,
        enabled: Boolean(c.primary),
        name: c.summary!,
        sync: true,
      }
    })
  } catch (_e) {
    const info = google.oauth2({
      auth: oAuth2Client,
      version: 'v2',
    })
    const user = (await info.userinfo.get()).data
    calendars = [
      {
        calendarId: user.email!,
        color: undefined,
        enabled: true,
        name: user.email!,
        sync: true,
      },
    ]
  }

  let participantId = stateObject?.participantId

  if (!participantId) {
    const guestEmail = stateObject?.guestEmail || userInfoRes.data.email!

    if (!stateObject?.pollSlug) {
      return res.redirect(
        `/poll/undefined?calendarResult=error&error=missing_poll_slug`
      )
    }

    const pollData = await getQuickPollBySlug(stateObject.pollSlug)

    let participantExists = false
    let existingParticipant

    try {
      existingParticipant = await getQuickPollParticipantByIdentifier(
        pollData.poll.id,
        guestEmail.toLowerCase()
      )
      participantExists = true
    } catch (_error) {
      participantExists = false
    }

    if (
      pollData.poll.visibility === PollVisibility.PRIVATE &&
      !participantExists
    ) {
      return res.redirect(
        `/poll/${stateObject?.pollSlug}?calendarResult=error&error=not_invited`
      )
    }

    try {
      if (participantExists && existingParticipant) {
        participantId = existingParticipant.id
      } else {
        const newParticipant = await addQuickPollParticipant(pollData.poll.id, {
          guest_email: guestEmail.toLowerCase(),
          guest_name: 'Guest',
          participant_type: QuickPollParticipantType.INVITEE,
        })
        participantId = newParticipant.id
      }
    } catch (error) {
      Sentry.captureException(error)
      return res.redirect(
        `/poll/${stateObject?.pollSlug}?calendarResult=error&error=participant_creation_failed`
      )
    }
  }

  // Save calendar for quickpoll participant
  await saveQuickPollCalendar(
    participantId,
    userInfoRes.data.email!,
    TimeSlotSource.GOOGLE,
    key as Record<string, unknown>,
    calendars
  )

  if (!stateObject?.participantId) {
    return res.redirect(
      `/poll/${stateObject?.pollSlug}?tab=guest-details&participantId=${participantId}&calendarConnected=true`
    )
  }

  return res.redirect(
    `/poll/${stateObject?.pollSlug}?calendarResult=success&provider=google`
  )
  } catch (err) {
    Sentry.captureException(err)
    return res.redirect(
      `/poll/${stateObject?.pollSlug}?calendarResult=error&error=oauth_failed`
    )
  }
}

export default handler
