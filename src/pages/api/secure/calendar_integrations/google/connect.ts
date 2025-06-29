import { google } from 'googleapis'
import type { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { apiUrl } from '@/utils/constants'

const credentials = {
  client_id: process.env.GOOGLE_CLIENT_ID,
  client_secret: process.env.GOOGLE_CLIENT_SECRET,
}

export const googleScopes = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/calendar.events.freebusy',
  'https://www.googleapis.com/auth/calendar.freebusy',
  'https://www.googleapis.com/auth/calendar.events.owned',
  'https://www.googleapis.com/auth/calendar.readonly',
]

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { state } = req.query
    // Get token from Google Calendar API
    const { client_secret, client_id } = credentials
    const redirect_uri = `${apiUrl}/secure/calendar_integrations/google/callback`
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uri
    )

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: googleScopes,
      state: typeof state === 'string' ? state : undefined,
    })

    return res.status(200).json({ url: authUrl })
  }
}

export default withSessionRoute(handler)
