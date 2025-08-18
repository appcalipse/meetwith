import { createCryptoTransaction } from '@utils/database'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { ConfirmCryptoTransactionRequest } from '@/types/Requests'
import {
  ChainNotFound,
  InValidGuests,
  TransactionCouldBeNotFoundError,
} from '@/utils/errors'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const account_address = req.session.account!.address
    try {
      const payload: ConfirmCryptoTransactionRequest = req.body

      // Only require guest information for meeting-related transactions
      if (
        payload.meeting_type_id &&
        !payload.guest_address &&
        !payload.guest_email
      ) {
        throw new InValidGuests()
      }

      await createCryptoTransaction(payload, account_address)

      return res.status(200).json({ success: true })
    } catch (e: unknown) {
      if (e instanceof InValidGuests) {
        return res.status(400).json({ error: e.message })
      } else if (e instanceof TransactionCouldBeNotFoundError) {
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
// add withSessionRoute to handle session management
export default withSessionRoute(handle)
