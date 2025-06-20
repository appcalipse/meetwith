import { createCryptoTransaction } from '@utils/database'
import { NextApiRequest, NextApiResponse } from 'next'

import { ConfirmCryptoTransactionRequest } from '@/types/Requests'
import {
  ChainNotFound,
  InValidGuests,
  TransactionNotFoundError,
} from '@/utils/errors'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const payload: ConfirmCryptoTransactionRequest = req.body
      if (!payload.guest_address && !payload.guest_email) {
        throw new InValidGuests()
      }
      const transaction = await createCryptoTransaction(payload)
      return res.status(200).json(transaction)
    } catch (e: unknown) {
      if (e instanceof InValidGuests) {
        return res.status(400).json({ error: e.message })
      } else if (e instanceof TransactionNotFoundError) {
        res.status(402).json({ error: e.message })
      } else if (e instanceof ChainNotFound) {
        res.status(404).json({ error: e.message })
      } else {
        console.error('Error creating crypto transaction:', e)
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  }
  return res.status(404).send('Not found')
}
export default handle
