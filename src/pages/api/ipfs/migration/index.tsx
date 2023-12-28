import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { initDB, migrateFromIpfsToDB } from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    initDB()

    const username = req.body.username
    const password = req.body.password

    if (
      username !== process.env.MIGRATION_API_USERNAME &&
      password !== process.env.MIGRATION_API_PASSWORD
    ) {
      return res.status(403).send('Access Denied')
    }

    try {
      const migrated_data = await migrateFromIpfsToDB()

      return res.status(200).json(migrated_data)
    } catch (e) {
      return res.status(500).send(e)
    }
  }

  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
