import * as Sentry from '@sentry/node'
import { readFile } from 'fs/promises'
import { OAuth2Client } from 'google-auth-library'
import { NextApiRequest, NextApiResponse } from 'next'

import { apiUrl } from '@/utils/constants'
import {
  CREDENTIALS_PATH,
  saveCredentials,
} from '@/utils/services/master.google.service'
const SCOPES = ['https://www.googleapis.com/auth/meetings.space.created']

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const { code } = req.query
      const content = (await readFile(CREDENTIALS_PATH)).toString('utf8')
      const keys = JSON.parse(content)
      const key = keys.installed || keys.web
      const redirect_uri = `${apiUrl}/integrations/google/authorize`
      const client = new OAuth2Client({
        clientId: key.client_id,
        clientSecret: key.client_secret,
      })
      if (!code) {
        const authUrl = client.generateAuthUrl({
          redirect_uri: redirect_uri.toString(),
          access_type: 'offline',
          scope: SCOPES.join(' '),
        })
        return res.redirect(authUrl)
      } else {
        const data = await client.getToken({
          code: code as string,
          redirect_uri,
        })
        client.setCredentials(data.tokens)
        await saveCredentials(client)
      }
      return res.send('Authorized')
    } catch (e) {
      Sentry.captureException(e)
      return res.status(503).send('Google Meet Unavailable')
    }
  }

  return res.status(404).send('Not found')
}

export default handler
