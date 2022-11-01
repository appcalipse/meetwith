import { google } from 'googleapis'
import type { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/utils/auth/withSessionApiRoute'

import { apiUrl } from '../../../../../utils/constants'

const credentials = {
  client_id: process.env.GOOGLE_CLIENT_ID,
  client_secret: process.env.GOOGLE_CLIENT_SECRET,
}

const scopes = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/calendar.events.freebusy',
  'https://www.googleapis.com/auth/calendar.freebusy',
  'https://www.googleapis.com/auth/calendar.events.owned',
]

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Get token from Google Calendar API
    const { client_secret, client_id } = credentials
    const redirect_uri = `${apiUrl}/secure/calendar_integrations/google/callback`
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uri
    )

    if (
      req.session.account?.address.toLowerCase() ==
      '0xe5b06bfd663C94005B8b159Cd320Fd7976549f9b'.toLowerCase()
    ) {
      scopes.push('https://www.googleapis.com/auth/calendar.readonly')
    }

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
    })

    res.status(200).json({ url: authUrl })
  }
}

export default withSessionRoute(handler)
