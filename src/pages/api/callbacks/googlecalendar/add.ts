import { google } from 'googleapis'
import type { NextApiRequest, NextApiResponse } from 'next'

const BASE_URL = 'http://localhost:3000'

const credentials = {
  client_id: process.env.GOOGLE_CLIENT_ID,
  client_secret: process.env.GOOGLE_CLIENT_SECRET,
}

const scopes = [
  'https://www.googleapis.com/auth/calendar.events.freebusy',
  'https://www.googleapis.com/auth/calendar.freebusy',
  'https://www.googleapis.com/auth/calendar.events.owned',
]

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // // Check that user is authenticated
    // const session = await getSession({ req: req });

    // if (!session) {
    //   res.status(401).json({ message: "You must be logged in to do this" });
    //   return;
    // }

    // Get token from Google Calendar API
    const { client_secret, client_id } = credentials
    const redirect_uri = BASE_URL + '/api/callbacks/googlecalendar/callback'
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uri
    )

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    })

    res.status(200).json({ url: authUrl })
  }
}
