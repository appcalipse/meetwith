import { ICoinConfig, OnrampMoneyWebhook } from '@meta/Transactions'
import * as Sentry from '@sentry/node'
import { recordOffRampTransaction } from '@utils/database'
import CryptoJS from 'crypto-js'
import { NextApiRequest, NextApiResponse } from 'next'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const response = await fetch(
        'https://api.onramp.money/onramp/api/v2/sell/public/allConfig'
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch token name: ${response.statusText}`)
      }

      const data = await response.json()
      const coinConfig = data.data as ICoinConfig
      res.status(200).json(coinConfig)
    } catch (e) {
      console.error(e)
      return res.status(500).send('Un expected Error Occured')
    }
  }

  return res.status(404).send('Not found')
}

export default handler
