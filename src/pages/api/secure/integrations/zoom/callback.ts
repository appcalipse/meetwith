import * as Sentry from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { MeetingProvider } from '@/types/Meeting'
import { apiUrl } from '@/utils/constants'
import { addOrUpdateMeetingProvider } from '@/utils/database'
import { encodeServerKeys } from '@/utils/zoom.helper'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, error, state } = req.query
  const stateObject =
    typeof state === 'string'
      ? JSON.parse(Buffer.from(state, 'base64').toString())
      : undefined

  if (error) {
    Sentry.captureException(error)
    if (!stateObject)
      return res.redirect(
        `/dashboard/settings/connected-accounts?meetResult=error`
      )
    else {
      stateObject.error = 'Zoom integration failed.'
      const newState64 = Buffer.from(JSON.stringify(stateObject)).toString(
        'base64'
      )
      return res.redirect(
        `/dashboard/settings/connected-calendars?calendarResult=error&state=${encodeURIComponent(
          newState64
        )}`
      )
    }
  }

  if (!req.session.account) {
    return res.status(400).json({ message: 'SHOULD BE LOGGED IN' })
  }

  if (code && typeof code !== 'string') {
    return res.status(400).json({ message: '`code` must be a string' })
  }

  const client_id = process.env.ZOOM_CLIENT_ID
  const client_secret = process.env.ZOOM_CLIENT_SECRET
  if (!client_id || !client_secret) {
    return res.status(400).json({ message: 'Zoom Credentials missing.' })
  }

  const redirect_uri = `${apiUrl}/secure/integrations/zoom/callback`

  try {
    const tokenResponse = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${encodeServerKeys(client_id, client_secret)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error(`Failed to fetch zoom token: ${tokenResponse.statusText}`)
    }

    const tokens = await tokenResponse.json()
    // Zoom returns access_token, refresh_token, expires_in, etc.
    tokens.expires_at = Date.now() + tokens.expires_in * 1000

    const userResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userResponse.ok) {
      throw new Error(`Failed to fetch zoom user: ${userResponse.statusText}`)
    }

    const userInfo = await userResponse.json()
    const email = userInfo.email

    if (!email) {
      return res.redirect(
        `/dashboard/settings/connected-accounts?meetResult=error`
      )
    }

    const accountAddress = req.session.account.address

    await addOrUpdateMeetingProvider(
      accountAddress,
      email,
      MeetingProvider.ZOOM,
      tokens
    )

    const newState64 = stateObject
      ? Buffer.from(JSON.stringify(stateObject)).toString('base64')
      : undefined

    if (
      stateObject?.redirectTo &&
      typeof stateObject.redirectTo === 'string' &&
      stateObject.redirectTo.startsWith('/')
    ) {
      const redirect_url = stateObject.redirectTo
      return res.redirect(redirect_url)
    }
    return res.redirect(
      `/dashboard/settings/connected-calendars?calendarResult=success${
        !!state ? `&state=${encodeURIComponent(newState64 || '')}` : ''
      }`
    )
  } catch (err) {
    Sentry.captureException(err)
    return res.redirect(
      `/dashboard/settings/connected-accounts?meetResult=error`
    )
  }
}

export default withSessionRoute(handler)
