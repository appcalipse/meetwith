import * as Sentry from '@sentry/node'
import { NextApiRequest, NextApiResponse } from 'next'

import { Credentials } from '@/types/Zoom'
import { apiUrl } from '@/utils/constants'
import {
  encodeServerKeys,
  saveCredentials,
  ZOOM_AUTH_URL,
} from '@/utils/zoom.helper'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const myHeaders = new Headers()
      myHeaders.append('Content-Type', 'application/x-www-form-urlencoded')
      myHeaders.append(
        'Authorization',
        `Basic ${encodeServerKeys(
          process.env.ZOOM_CLIENT_ID!,
          process.env.ZOOM_CLIENT_SECRET!
        )}`
      )

      const urlencoded = new URLSearchParams()
      urlencoded.append('code', req.query.code as string)
      urlencoded.append('grant_type', 'authorization_code')
      urlencoded.append('redirect_uri', `${apiUrl}/integrations/zoom/callback`)

      const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: urlencoded,
      }
      const zoomResponse = await fetch(ZOOM_AUTH_URL, requestOptions)

      if (![200, 201].includes(zoomResponse.status)) {
        Sentry.captureException(zoomResponse.statusText)
        return res.status(503).send('Zoom Unavailable')
      }

      const zoomToken: Credentials = await zoomResponse.json()
      await saveCredentials(zoomToken)
      return res.redirect('/')
    } catch (e) {
      Sentry.captureException(e)
      return res.status(503).send('Zoom Unavailable')
    }
  }

  return res.status(404).send('Not found')
}

export default handler
