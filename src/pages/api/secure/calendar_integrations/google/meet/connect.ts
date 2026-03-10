import { google } from 'googleapis'
import type { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { apiUrl } from '@/utils/constants'

const credentials = {
  client_id: process.env.GOOGLE_CLIENT_ID,
  client_secret: process.env.GOOGLE_CLIENT_SECRET,
}

export const googleMeetScopes = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/meetings.space.created',
]

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { state } = req.query

      const { client_secret, client_id } = credentials
      const redirect_uri = `${apiUrl}/secure/calendar_integrations/google/meet/callback`

      const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uri
      )

      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: googleMeetScopes,
        state: typeof state === 'string' ? state : undefined,
      })

      return res.status(200).json({ url: authUrl })
    }
  } catch (error) {
    console.error('Error in Google Meet connect handler:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
  return res.status(405).json({ error: 'Method Not Allowed' })
}

export default withSessionRoute(handler)
