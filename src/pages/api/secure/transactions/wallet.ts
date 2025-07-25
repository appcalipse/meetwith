import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { getWalletTransactionsFromDB } from '@/utils/database'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { wallet_address, token_address, chain_id } = req.body

    if (!wallet_address) {
      return res.status(400).json({ error: 'Wallet address is required' })
    }

    const transactions = await getWalletTransactionsFromDB(
      wallet_address,
      token_address,
      chain_id
    )

    return res.status(200).json(transactions)
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withSessionRoute(handler)
