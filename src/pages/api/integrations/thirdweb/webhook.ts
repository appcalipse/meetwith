import { OnrampMoneyWebhook } from '@meta/Transactions'
import * as Sentry from '@sentry/node'
import { recordOffRampTransaction } from '@utils/database'
import CryptoJS from 'crypto-js'
import { NextApiRequest, NextApiResponse } from 'next'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      res.status(200).send('OK')
    } catch (e) {
      console.error(e)
      Sentry.captureException(e, {
        extra: {
          body: req.body,
          headers: req.headers,
        },
      })
      return res.status(500).send('Un expected Error Occured')
    }
  }

  return res.status(404).send('Not found')
}

export default handler
