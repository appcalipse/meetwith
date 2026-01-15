import * as Sentry from '@sentry/nextjs'
import jwt from 'jsonwebtoken'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { VerificationChannel } from '@/types/AccountNotifications'
import { appUrl, PIN_ENABLE_TOKEN_EXPIRY } from '@/utils/constants'
import {
  createVerification,
  getAccountNotificationSubscriptionEmail,
  invalidatePreviousVerifications,
} from '@/utils/database'
import { sendEnablePinEmail } from '@/utils/email_helper'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const JWT_SECRET = process.env.JWT_SECRET
  if (!JWT_SECRET) {
    return res.status(500).json({
      error:
        'There was an issue updating preferences. Please contact us at support@meetwith.xyz',
    })
  }

  try {
    const account_address = req.session.account!.address

    const jti = `${account_address}-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`

    const payload = {
      account_address,
      iat: Math.floor(Date.now() / 1000),
      jti,
      type: 'enable_pin',
    }

    const enableToken = jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: PIN_ENABLE_TOKEN_EXPIRY,
    })

    await invalidatePreviousVerifications(
      account_address,
      VerificationChannel.TRANSACTION_PIN
    )

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
    await createVerification(
      account_address,
      jti,
      VerificationChannel.TRANSACTION_PIN,
      expiresAt
    )

    const enableUrl = `${appUrl}/dashboard/enable-pin?token=${enableToken}`

    const email = await getAccountNotificationSubscriptionEmail(account_address)

    if (!email) {
      return res.status(400).json({ error: 'No email found for this account' })
    }

    await sendEnablePinEmail(email, enableUrl)

    return res.status(200).json({
      message: 'Enable PIN email sent successfully',
      success: true,
    })
  } catch (error) {
    Sentry.captureException(error)
    console.error('Error sending enable PIN email:', error)
    return res.status(500).json({
      error: 'Failed to send enable PIN email',
    })
  }
}

export default withSessionRoute(handler)
