import { NextApiRequest, NextApiResponse } from 'next'

import { eventExists } from '@/utils/test-utils'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const account_address = req.body.scheduler_address
    const slot_id = req.body.slot_id
    const exists = await eventExists(slot_id, account_address)
    return res.status(200).json(exists)
  } catch (e) {
    console.error({ e })
    return res.status(500).send(e)
  }
}

export default handle
