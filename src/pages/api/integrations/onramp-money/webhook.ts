import { OnrampMoneyWebhook } from '@meta/Transactions'
import * as Sentry from '@sentry/node'
import { recordOffRampTransaction } from '@utils/database'
import CryptoJS from 'crypto-js'
import { NextApiRequest, NextApiResponse } from 'next'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const payload = req.headers['x-onramp-payload'] as string
      const signature = req.headers['x-onramp-signature'] as string

      const localSignature = CryptoJS.enc.Hex.stringify(
        CryptoJS.HmacSHA512(payload, process.env.NEXT_ONRAMP_MONEY_API_SECRET!)
      )
      if (localSignature !== signature) {
        return res.status(403).send('Invalid signature')
      }
      const event = req.body as OnrampMoneyWebhook
      // eslint-disable-next-line no-restricted-syntax
      console.debug(event)
      await recordOffRampTransaction(event)
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
