import { NextApiRequest, NextApiResponse } from 'next'

import {
  checkWalletHoldsPOAP,
  fetchWalletPOAPs,
} from '@/utils/services/poap.helper'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    let poaps = []
    if (req.query.eventId) {
      const poap = await checkWalletHoldsPOAP(
        req.query.address as string,
        parseInt(req.query.eventId as string)
      )
      poaps = [poap]
    } else {
      poaps = await fetchWalletPOAPs(req.query.address as string)
    }
    return res.status(200).json(poaps)
  }

  return res.status(404).send('Not found')
}

export default handler
