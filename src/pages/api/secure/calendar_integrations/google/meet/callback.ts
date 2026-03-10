import * as Sentry from '@sentry/nextjs'
import { Auth, google } from 'googleapis'
import type { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { MeetingProvider } from '@/types/Meeting'
import { apiUrl } from '@/utils/constants'
import { addOrUpdateMeetingProvider } from '@/utils/database'

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
      return res.redirect(
        `/dashboard/settings/connected-calendars?meetResult=error`
      )
    else {
      stateObject.error = 'Google Meet integration failed.'
      const newState64 = Buffer.from(JSON.stringify(stateObject)).toString(
        'base64'
      )
      return res.redirect(
        `/dashboard/settings/connected-calendars?meetResult=error&state=${newState64}`
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
  const redirect_uri = `${apiUrl}/secure/calendar_integrations/google/meet/callback`

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uri
  )

  let key: Auth.Credentials = {}

  if (code) {
    const { tokens } = await oAuth2Client.getToken(code)
    key = tokens
  }

  // request more info to google, in order to complete the user integration data
  oAuth2Client.setCredentials(key)
  const oauth2 = google.oauth2({
    auth: oAuth2Client,
    version: 'v2',
  })
  const userInfoRes = await oauth2.userinfo.get()

  const email = userInfoRes.data.email
  if (!email) {
    return res.redirect(
      `/dashboard/settings/connected-calendars?meetResult=error`
    )
  }

  const accountAddress = req.session.account.address

  await addOrUpdateMeetingProvider(
    accountAddress,
    email,
    MeetingProvider.GOOGLE_MEET,
    key as unknown as Record<string, unknown>
  )

  const newState64 = stateObject
    ? Buffer.from(JSON.stringify(stateObject)).toString('base64')
    : undefined

  if (stateObject?.redirectTo) {
    const containParams = stateObject.redirectTo.includes('?')
    const redirect_url =
      stateObject.redirectTo +
      (newState64 && !stateObject.ignoreState
        ? `${containParams ? '&' : '?'}state=${newState64}`
        : '')
    return res.redirect(redirect_url)
  }

  return res.redirect(
    `/dashboard/settings/connected-calendars?meetResult=success${
      !!state ? `&state=${newState64}` : ''
    }`
  )
}

export default withSessionRoute(handler)
