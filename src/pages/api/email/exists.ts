import { NextApiRequest, NextApiResponse } from 'next'

import { handleEmailCheck } from '@/utils/smtp-helpers'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const email = req.query.email as string
      await handleEmailCheck(email)
      return res.status(200).json({ exists: true })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return res.status(400).json({ exists: false, error: message })
    }
  }
  return res.status(404).send('Not found')
}

export default handler
