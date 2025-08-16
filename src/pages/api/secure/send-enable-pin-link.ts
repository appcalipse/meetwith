import jwt from 'jsonwebtoken'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { appUrl } from '@/utils/constants'
import { sendEnablePinEmail } from '@/utils/email_helper'

const JWT_SECRET = process.env.JWT_SECRET
const TOKEN_EXPIRY = '5m'

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const account_address = req.session.account!.address

    // Create a secure JWT with expiration and single-use capability
    const payload = {
      type: 'enable_pin',
      account_address,
      iat: Math.floor(Date.now() / 1000),
      jti: `${account_address}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
    }

    const enableToken = jwt.sign(payload, JWT_SECRET!, {
      algorithm: 'HS256',
      expiresIn: TOKEN_EXPIRY,
    })

    const enableUrl = `${appUrl}/dashboard/enable-pin?token=${enableToken}&address=${account_address}`

    // Get user's notification email from the request body
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    // Send the enable email
    await sendEnablePinEmail(email, enableUrl)

    return res.status(200).json({
      success: true,
      message: 'Enable PIN email sent successfully',
    })
  } catch (error) {
    console.error('Error sending enable PIN email:', error)
    return res.status(500).json({
      error: 'Failed to send enable PIN email',
    })
  }
}

export default withSessionRoute(handler)
