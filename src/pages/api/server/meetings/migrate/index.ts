import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { initDB, migrateSlots } from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    initDB()

    const result = await migrateSlots()
    console.log(result)

    return res.status(200).json(result)
  }

  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
