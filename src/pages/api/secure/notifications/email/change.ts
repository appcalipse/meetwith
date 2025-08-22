import jwt from 'jsonwebtoken'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { appUrl, EMAIL_CHANGE_TOKEN_EXPIRY } from '@/utils/constants'
import { getAccountNotificationSubscriptionEmail } from '@/utils/database'
import { sendChangeEmailEmail } from '@/utils/email_helper'

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

    // Create a secure JWT with expiration and single-use capability
    const payload = {
      type: 'change_email',
      account_address,
      iat: Math.floor(Date.now() / 1000),
      jti: `${account_address}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
    }

    const changeToken = jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: EMAIL_CHANGE_TOKEN_EXPIRY,
    })

    const changeUrl = `${appUrl}/dashboard/change-email?token=${changeToken}&address=${account_address}`

    const currentEmail = await getAccountNotificationSubscriptionEmail(
      account_address
    )

    if (!currentEmail) {
      return res.status(400).json({ error: 'No email found for this account' })
    }

    await sendChangeEmailEmail(currentEmail, changeUrl)

    return res.status(200).json({
      success: true,
      message: 'Change email link sent successfully',
    })
  } catch (error) {
    console.error('Error sending change email link:', error)
    return res.status(500).json({
      error: 'Failed to send change email link',
    })
  }
}

export default withSessionRoute(handler)
