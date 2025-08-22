import jwt from 'jsonwebtoken'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { appUrl, PIN_RESET_TOKEN_EXPIRY } from '@/utils/constants'
import { getAccountNotificationSubscriptionEmail } from '@/utils/database'
import { sendResetPinEmail } from '@/utils/email_helper'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const JWT_SECRET = process.env.JWT_SECRET
  if (!JWT_SECRET) {
    return res
      .status(500)
      .json({ error: 'JWT_SECRET environment variable is required' })
  }

  try {
    const account_address = req.session.account!.address

    const payload = {
      type: 'reset_pin',
      account_address,
      iat: Math.floor(Date.now() / 1000), // issued at
      jti: `${account_address}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
    }

    const resetToken = jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: PIN_RESET_TOKEN_EXPIRY,
    })

    const resetUrl = `${appUrl}/dashboard/reset-pin?token=${resetToken}&address=${account_address}`

    const email = await getAccountNotificationSubscriptionEmail(account_address)

    if (!email) {
      return res.status(400).json({ error: 'No email found for this account' })
    }

    await sendResetPinEmail(email, resetUrl)

    return res.status(200).json({
      success: true,
      message: 'Reset PIN email sent successfully',
    })
  } catch (error) {
    console.error('Error sending reset PIN email:', error)
    return res.status(500).json({
      error: 'Failed to send reset PIN email',
    })
  }
}

export default withSessionRoute(handler)
