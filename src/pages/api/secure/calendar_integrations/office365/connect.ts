import type { NextApiRequest, NextApiResponse } from 'next'
import { stringify } from 'querystring'

import { apiUrl } from '@/utils/constants'

const credentials = {
  client_id: process.env.MS_GRAPH_CLIENT_ID,
  client_secret: process.env.MS_GRAPH_CLIENT_SECRET,
}

export const officeScopes = [
  'User.Read',
  'Calendars.Read',
  'Calendars.ReadWrite',
  'offline_access',
]

export type IntegrationOAuthCallbackState = {
  returnTo: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { state } = req.query

    const params = {
      response_type: 'code',
      scope: officeScopes.join(' '),
      client_id: credentials.client_id,
      redirect_uri: `${apiUrl}/secure/calendar_integrations/office365/callback`,
      state: typeof state === 'string' ? state : undefined,
    }
    const query = stringify(params)
    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${query}`
    return res.status(200).json({ url })
  }
}
