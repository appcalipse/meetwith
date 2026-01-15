import * as Sentry from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'

import { CalendarSyncInfo } from '@/types/CalendarConnections'
import { TimeSlotSource } from '@/types/Meeting'
import { CalendarInfo } from '@/types/Office365'
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
  client_id: process.env.MS_GRAPH_CLIENT_ID,
  client_secret: process.env.MS_GRAPH_CLIENT_SECRET,
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, error, state }: OAuthCallbackQuery = req.query

  const stateObject =
    typeof state === 'string'
      ? JSON.parse(Buffer.from(state, 'base64').toString())
      : undefined

  if (error) {
    Sentry.captureException(error)
    if (!stateObject)
      return res.redirect(`/poll/${stateObject?.pollSlug}?calendarResult=error`)
    else {
      stateObject.error = 'Office365 Calendar integration failed.'
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
      .json({ message: 'There are no Office365 Credentials installed.' })
  }

  const { client_secret, client_id } = credentials
  const redirect_uri = `${apiUrl}/quickpoll/calendar/office365/callback`

  // Add validation before the fetch
  if (!client_id || !client_secret) {
    return res.status(400).json({ message: 'Missing Office365 credentials' })
  }

  // Exchange code for access token
  const tokenResponse = await fetch(
    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    {
      body: new URLSearchParams({
        client_id: client_id!,
        client_secret: client_secret!,
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri,
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
    }
  )

  const tokenData = await tokenResponse.json()

  if (!tokenData.access_token) {
    return res.redirect(
      `/poll/${stateObject?.pollSlug}?calendarResult=error&message=Failed to get access token`
    )
  }

  // Get user info and calendars
  const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  })

  const userData = await userResponse.json()

  const calendarsResponse = await fetch(
    'https://graph.microsoft.com/v1.0/me/calendars',
    {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    }
  )

  const calendarsData = await calendarsResponse.json()

  const calendars: Array<CalendarSyncInfo> =
    calendarsData.value?.map((c: CalendarInfo) => ({
      calendarId: c.id,
      color: c.color,
      enabled: true,
      isReadOnly: !c.canEdit,
      name: c.name,
      sync: true,
    })) || []

  let participantId = stateObject?.participantId

  if (!participantId) {
    const guestEmail =
      stateObject?.guestEmail || userData.mail || userData.userPrincipalName

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
    userData.mail || userData.userPrincipalName,
    TimeSlotSource.OFFICE,
    tokenData,
    calendars
  )

  if (!stateObject?.participantId) {
    return res.redirect(
      `/poll/${stateObject?.pollSlug}?tab=guest-details&participantId=${participantId}&calendarConnected=true`
    )
  }

  return res.redirect(
    `/poll/${stateObject?.pollSlug}?calendarResult=success&provider=office365`
  )
}

export default handler
