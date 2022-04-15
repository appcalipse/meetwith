import type { NextApiRequest, NextApiResponse } from 'next'
import { stringify } from 'querystring'

import { apiUrl } from '../../../../../utils/constants'

const credentials = {
  client_id: process.env.MS_GRAPH_CLIENT_ID,
  client_secret: process.env.MS_GRAPH_CLIENT_SECRET,
}

const scopes = [
  'User.Read',
  'Calendars.Read',
  'Calendars.ReadWrite',
  'offline_access',
]

export type IntegrationOAuthCallbackState = {
  returnTo: string
}

export function encodeOAuthState(req: NextApiRequest) {
  if (typeof req.query.state !== 'string') {
    return undefined
  }
  const state: IntegrationOAuthCallbackState = JSON.parse(req.query.state)

  return JSON.stringify(state)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const state = encodeOAuthState(req)
    const params = {
      response_type: 'code',
      scope: scopes.join(' '),
      client_id: credentials.client_id,
      redirect_uri: `${apiUrl}/secure/calendar_integrations/office365/callback`,
      state,
    }
    const query = stringify(params)
    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${query}`
    res.status(200).json({ url })
  }
}
