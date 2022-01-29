import { google } from 'googleapis'
import type { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '../../../../../utils/auth/withSessionApiRoute'
import { apiUrl } from '../../../../../utils/constants'
import { updateGoogleCalendarRefreshToken } from '../../../../../utils/database'

const credentials = {
  client_id: process.env.GOOGLE_CLIENT_ID,
  client_secret: process.env.GOOGLE_CLIENT_SECRET,
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query
  if (!req.session.account) {
    console.log('NO ACCOUNT')
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

  let key: {
    access_token: string
    refresh_token: string
    scope: string
    token_type: string
    expiry_date: number
  } | null = null

  if (code) {
    const token = await oAuth2Client.getToken(code)
    key = token.res?.data
  }

  await updateGoogleCalendarRefreshToken(
    req.session.account.id,
    key!.refresh_token
  )
  res.redirect(`/dashboard#calendar_connections`)
}

export default withSessionRoute(handler)
