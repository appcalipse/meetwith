import * as Sentry from '@sentry/nextjs'
import { Auth, google } from 'googleapis'
import type { NextApiRequest, NextApiResponse } from 'next'

import {
  ConnectedCalendarCorePayload,
  ConnectedCalendarProvider,
} from '../../../../../types/CalendarConnections'
import { withSessionRoute } from '../../../../../utils/auth/withSessionApiRoute'
import { apiUrl } from '../../../../../utils/constants'
import { addOrUpdateConnectedCalendar } from '../../../../../utils/database'

const credentials = {
  client_id: process.env.GOOGLE_CLIENT_ID,
  client_secret: process.env.GOOGLE_CLIENT_SECRET,
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, error } = req.query

  // if user did not complete the cicle, just log it and go to the dashboard page again
  if (error) {
    Sentry.captureException(error)
    res.redirect(`/dashboard/calendars?result=error`)
    return
  }

  if (!req.session.account) {
    res.status(400).json({ message: 'SHOULD BE LOGGED IN' })
    return
  }

  if (code && typeof code !== 'string') {
    res.status(400).json({ message: '`code` must be a string' })
    return
  }
  if (!credentials) {
    res
      .status(400)
      .json({ message: 'There are no Google Credentials installed.' })
    return
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
  const userInfo = await google
    .oauth2('v2')
    .userinfo.get({ auth: oAuth2Client })

  const payload: ConnectedCalendarCorePayload = {
    provider: ConnectedCalendarProvider.GOOGLE,
    email: userInfo.data.email!,
    sync: false,
    payload: key,
  }

  await addOrUpdateConnectedCalendar(req.session.account.address, payload)

  res.redirect(`/dashboard/calendars?result=success`)
}

export default withSessionRoute(handler)
