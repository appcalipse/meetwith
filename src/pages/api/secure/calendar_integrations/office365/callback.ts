import type { NextApiRequest, NextApiResponse } from 'next'

import {
  ConnectedCalendarCorePayload,
  ConnectedCalendarProvider,
} from '../../../../../types/CalendarConnections'
import { withSessionRoute } from '../../../../../utils/auth/withSessionApiRoute'
import { apiUrl } from '../../../../../utils/constants'
import { addOrUpdateConnectedCalendar } from '../../../../../utils/database'

const credentials = {
  client_id: process.env.MS_GRAPH_CLIENT_ID!,
  client_secret: process.env.MS_GRAPH_CLIENT_SECRET!,
}

const scopes = ['offline_access', 'Calendars.Read', 'Calendars.ReadWrite']

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const { code, error } = req.query

  if (typeof code !== 'string') {
    res.status(400).json({ message: 'No code returned' })
    return
  }

  if (!req.session.account) {
    res.status(400).json({ message: 'SHOULD BE LOGGED IN' })
    return
  }

  const toUrlEncoded = (payload: Record<string, string>) =>
    Object.keys(payload)
      .map(key => key + '=' + encodeURIComponent(payload[key]))
      .join('&')

  const body = toUrlEncoded({
    client_id: credentials.client_id,
    grant_type: 'authorization_code',
    code,
    scope: scopes.join(' '),
    redirect_uri: `${apiUrl}/secure/calendar_integrations/office365/callback`,
    client_secret: credentials.client_secret,
  })

  const response = await fetch(
    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body,
    }
  )

  const responseBody = await response.json()

  if (!response.ok) {
    res.redirect(
      '/dashboard/calendars?calendarResult=error&error=' +
        JSON.stringify(responseBody)
    )
    return
  }

  const whoami = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: 'Bearer ' + responseBody.access_token },
  })
  const graphUser = await whoami.json()

  // In some cases, graphUser.mail is null. Then graphUser.userPrincipalName most likely contains the email address.
  responseBody.email = graphUser.mail ?? graphUser.userPrincipalName
  responseBody.expiry_date = Math.round(
    +new Date() / 1000 + responseBody.expires_in
  ) // set expiry date in seconds
  delete responseBody.expires_in

  const payload: ConnectedCalendarCorePayload = {
    provider: ConnectedCalendarProvider.OFFICE,
    email: responseBody.email!,
    sync: false,
    payload: responseBody,
  }

  await addOrUpdateConnectedCalendar(req.session.account.address, payload)
  res.redirect(`/dashboard/calendars?calendarResult=success`)
}

export default withSessionRoute(handler)
