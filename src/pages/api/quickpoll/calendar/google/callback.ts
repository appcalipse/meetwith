import * as Sentry from '@sentry/nextjs'
import { Auth, google } from 'googleapis'
import type { NextApiRequest, NextApiResponse } from 'next'

import { CalendarSyncInfo } from '@/types/CalendarConnections'
import { TimeSlotSource } from '@/types/Meeting'
import { OAuthCallbackQuery } from '@/types/QuickPoll'
import { apiUrl } from '@/utils/constants'
import { saveQuickPollCalendar } from '@/utils/database'

const credentials = {
  client_id: process.env.GOOGLE_CLIENT_ID,
  client_secret: process.env.GOOGLE_CLIENT_SECRET,
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

  if (code) {
    const token = await oAuth2Client.getToken(code)
    key = token.res?.data
  }

  oAuth2Client.setCredentials({ access_token: key?.access_token })
  const userInfoRes = await google
    .oauth2('v2')
    .userinfo.get({ auth: oAuth2Client })

  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client })

  let calendars: Array<CalendarSyncInfo>
  try {
    calendars = (await calendar.calendarList.list()).data.items!.map(c => {
      return {
        calendarId: c.id!,
        name: c.summary!,
        color: c.backgroundColor || undefined,
        sync: true,
        enabled: Boolean(c.primary),
      }
    })
  } catch (e) {
    const info = google.oauth2({
      version: 'v2',
      auth: oAuth2Client,
    })
    const user = (await info.userinfo.get()).data
    calendars = [
      {
        calendarId: user.email!,
        name: user.email!,
        color: undefined,
        sync: true,
        enabled: true,
      },
    ]
  }

  // Save calendar for quickpoll participant
  await saveQuickPollCalendar(
    stateObject?.participantId,
    userInfoRes.data.email!,
    TimeSlotSource.GOOGLE,
    key as Record<string, unknown>
  )

  return res.redirect(
    `/poll/${stateObject?.pollSlug}?calendarResult=success&provider=google`
  )
}

export default handler
