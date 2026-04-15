import type { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { apiUrl } from '@/utils/constants'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { state } = req.query

      const client_id = process.env.ZOOM_CLIENT_ID
      const redirect_uri = `${apiUrl}/secure/integrations/zoom/callback`

      const authUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${client_id}&redirect_uri=${encodeURIComponent(
        redirect_uri
      )}${state ? `&state=${state}` : ''}`

      return res.status(200).json({ url: authUrl })
    }
  } catch (error) {
    console.error('Error in Zoom connect handler:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
  return res.status(405).json({ error: 'Method Not Allowed' })
}

export default withSessionRoute(handler)
