import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { deleteMeetingProviderDB } from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'DELETE') {
    try {
      const account_address = req.session.account!.address
      const { provider } = req.query

      if (!provider) {
        return res.status(400).send('Provider is required')
      }

      await deleteMeetingProviderDB(account_address, provider as string)

      return res.status(200).json({ success: true })
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
      return res.status(500).send('An unexpected error occurred.')
    }
  }
  return res.status(405).send('Method Not Allowed')
}

export default withSessionRoute(handle)
