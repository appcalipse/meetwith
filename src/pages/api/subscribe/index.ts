import { NextApiRequest, NextApiResponse } from 'next'

import { saveEmailToDB } from '@/utils/database'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const email = req.body.email
    const plan = req.body.plan

    if (email) {
      const success = await saveEmailToDB(email, plan)
      return res.status(200).json({ success })
    }
  }

  return res.status(404).send('Not found')
}

export default handler
