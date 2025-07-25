import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { getWalletBalanceFromDB } from '@/utils/database'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { wallet_address } = req.body

    if (!wallet_address) {
      return res.status(400).json({ error: 'Wallet address is required' })
    }

    const balance = await getWalletBalanceFromDB(wallet_address)

    return res.status(200).json({ balance })
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withSessionRoute(handler)
