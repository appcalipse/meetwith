import { NextApiRequest, NextApiResponse } from 'next'

import { Address } from '@/types/Transactions'
import { getMeetingSessionsByTxHash } from '@/utils/database'
import { TransactionIsRequired, TransactionNotFoundError } from '@/utils/errors'
import { extractQuery } from '@/utils/generic_utils'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    if (req.method === 'GET') {
      const tx = extractQuery<Address>(req.query, 'tx')
      if (!tx) {
        throw new TransactionIsRequired()
      }
      const meetingSessions = await getMeetingSessionsByTxHash(tx)
      return res.status(200).json(meetingSessions)
    }
  } catch (e) {
    if (e instanceof TransactionIsRequired) {
      return res.status(400).json({ error: e.message })
    } else if (e instanceof TransactionNotFoundError) {
      return res.status(404).json({ error: e.message })
    }
  }
}

export default handle
