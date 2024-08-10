import type { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { TimeSlotSource } from '@/types/Meeting'

import { apiUrl, OnboardingSubject } from '../../../../../utils/constants'
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
  const { code, state } = req.query

  const stateObject =
    typeof state === 'string'
      ? JSON.parse(Buffer.from(state, 'base64').toString())
      : undefined

  try {
    if (typeof code !== 'string') {
      return res.status(400).json({ message: 'No code returned' })
    }

    if (!req.session.account) {
      return res.status(400).json({ message: 'SHOULD BE LOGGED IN' })
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

    // TODO: Some error is happening around here
    // the request is timming out and causing errors on FE

    const whoami = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: 'Bearer ' + responseBody.access_token },
    })

    const graphUser = await whoami.json()

    const calendarsResponse = await fetch(
      'https://graph.microsoft.com/v1.0/me/calendars',
      {
        headers: { Authorization: 'Bearer ' + responseBody.access_token },
      }
    )
    const calendars = await calendarsResponse.json()

    // In some cases, graphUser.mail is null. Then graphUser.userPrincipalName most likely contains the email address.
    responseBody.email = graphUser.mail ?? graphUser.userPrincipalName
    responseBody.expiry_date = Math.round(
      +new Date() / 1000 + responseBody.expires_in
    ) // set expiry date in seconds
    delete responseBody.expires_in

    await addOrUpdateConnectedCalendar(
      req.session.account.address,
      responseBody.email,
      TimeSlotSource.OFFICE,
      calendars.value.map((c: any) => {
        return {
          calendarId: c.id,
          name: c.name,
          sync: false,
          enabled: c.isDefaultCalendar,
          color: c.hexColor,
        }
      }),
      responseBody
    )

    if (stateObject) {
      stateObject.origin = OnboardingSubject.Office365CalendarConnected
    }
    const newState64 = stateObject
      ? Buffer.from(JSON.stringify(stateObject)).toString('base64')
      : undefined
    if (stateObject.redirectTo) {
      const containParams = stateObject.redirectTo.includes('?')
      const redirect_url =
        stateObject.redirectTo +
        (newState64 ? `${containParams ? '&' : '?'}calState=${newState64}` : '')
      res.redirect(redirect_url)
      return
    }
    res.redirect(
      `/dashboard/calendars?calendarResult=success${
        newState64 ? `&state=${newState64}` : ''
      }`
    )
  } catch (e) {
    console.error(e)

    // In case of error we redirect the user to page before
    // so he continue his onboarding

    if (stateObject)
      stateObject.origin = OnboardingSubject.DiscordConnectedInModal

    const newState64 = stateObject
      ? Buffer.from(JSON.stringify(stateObject)).toString('base64')
      : undefined
    if (stateObject?.redirectTo) {
      const containParams = stateObject.redirectTo.includes('?')
      const redirect_url =
        stateObject.redirectTo +
        (newState64 ? `${containParams ? '&' : '?'}calState=${newState64}` : '')
      res.redirect(redirect_url)
      return
    }
    res.redirect(
      `/dashboard/calendars?calendarResult=success${
        newState64 ? `&state=${newState64}` : ''
      }`
    )
  }
}

export default withSessionRoute(handler)
