import jwt from 'jsonwebtoken'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { appUrl } from '@/utils/constants'
import { sendChangeEmailEmail } from '@/utils/email_helper'

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
      type: 'change_email',
      account_address,
      iat: Math.floor(Date.now() / 1000),
      jti: `${account_address}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
    }

    const changeToken = jwt.sign(payload, JWT_SECRET!, {
      algorithm: 'HS256',
      expiresIn: TOKEN_EXPIRY,
    })

    const changeUrl = `${appUrl}/dashboard/change-email?token=${changeToken}&address=${account_address}`

    // Get user's current notification email from the request body
    const { currentEmail } = req.body

    if (!currentEmail) {
      return res.status(400).json({ error: 'Current email is required' })
    }

    // Send the change email to the current email address
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
