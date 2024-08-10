import * as Sentry from '@sentry/nextjs'
import { Auth, google } from 'googleapis'
import type { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { TimeSlotSource } from '@/types/Meeting'

import { apiUrl, OnboardingSubject } from '../../../../../utils/constants'
import { addOrUpdateConnectedCalendar } from '../../../../../utils/database'

const credentials = {
  client_id: process.env.GOOGLE_CLIENT_ID,
  client_secret: process.env.GOOGLE_CLIENT_SECRET,
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, error, state } = req.query

  const stateObject =
    typeof state === 'string'
      ? JSON.parse(Buffer.from(state, 'base64').toString())
      : undefined

  // if user did not complete the cycle, just log it and go to the dashboard page again
  if (error) {
    Sentry.captureException(error)
    if (!stateObject)
      return res.redirect(`/dashboard/calendars?calendarResult=error`)
    else {
      stateObject.error = 'Google Calendar integration failed.'
      const newState64 = Buffer.from(JSON.stringify(stateObject)).toString(
        'base64'
      )
      return res.redirect(
        `/dashboard/calendars?calendarResult=error&state=${newState64}`
      )
    }
  }

  if (!req.session.account) {
    return res.status(400).json({ message: 'SHOULD BE LOGGED IN' })
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
  const redirect_uri = `${apiUrl}/secure/calendar_integrations/google/callback`

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

  // request more info to google, in order to complete the user integration data
  oAuth2Client.setCredentials({ access_token: key?.access_token })
  const userInfoRes = await google
    .oauth2('v2')
    .userinfo.get({ auth: oAuth2Client })

  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client })

  let calendars = []
  try {
    calendars = (await calendar.calendarList.list()).data.items!.map(c => {
      return {
        calendarId: c.id!,
        name: c.summary!,
        color: c.backgroundColor || undefined,
        sync: false,
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
        sync: false,
        enabled: true,
      },
    ]
  }

  await addOrUpdateConnectedCalendar(
    req.session.account.address,
    userInfoRes.data.email!,
    TimeSlotSource.GOOGLE,
    calendars,
    key
  )

  if (stateObject) {
    stateObject.origin = OnboardingSubject.GoogleCalendarConnected
  }

  const newState64 = stateObject
    ? Buffer.from(JSON.stringify(stateObject)).toString('base64')
    : undefined
  if (stateObject?.redirectTo) {
    const containParams = stateObject.redirectTo.includes('?')
    const redirect_url =
      stateObject?.redirectTo +
      (newState64 ? `${containParams ? '&' : '?'}calState=${newState64}` : '')
    return res.redirect(redirect_url)
  }
  return res.redirect(
    `/dashboard/calendars?calendarResult=success${
      !!state ? `&state=${newState64}` : ''
    }`
  )
}

export default withSessionRoute(handler)
