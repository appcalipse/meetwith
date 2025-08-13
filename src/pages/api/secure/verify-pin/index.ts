import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { verifyUserPin } from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const account_address = req.session.account!.address
  const { pin } = req.body

  if (!pin || typeof pin !== 'string') {
    return res.status(400).json({ error: 'PIN is required' })
  }

  try {
    const isValid = await verifyUserPin(account_address, pin)

    if (isValid) {
      return res.status(200).json({ valid: true })
    } else {
      return res.status(200).json({ valid: false })
    }
  } catch (e) {
    return res.status(500).json({ error: 'Failed to verify PIN' })
  }
}

export default withSessionRoute(handle)
