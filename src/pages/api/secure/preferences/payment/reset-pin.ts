import * as Sentry from '@sentry/nextjs'
import jwt from 'jsonwebtoken'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { VerificationChannel } from '@/types/AccountNotifications'
import {
  getAccountNotificationSubscriptionEmail,
  updatePaymentPreferences,
  verifyVerificationCode,
} from '@/utils/database'
import { sendPinResetSuccessEmail } from '@/utils/email_helper'

interface ResetPinBody {
  newPin: string
  token: string
}

interface TokenPayload {
  type: string
  account_address: string
  iat: number
  exp: number
  jti: string
}

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
    const { newPin, token }: ResetPinBody = req.body
    const account_address = req.session.account!.address

    if (!newPin || !token) {
      return res.status(400).json({ error: 'New PIN and token are required' })
    }

    // Verify the JWT token
    let decodedToken: TokenPayload
    try {
      decodedToken = jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256'],
      }) as TokenPayload
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: 'Token has expired' })
      }
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Check token type and address
    if (
      decodedToken.type !== 'reset_pin' ||
      decodedToken.account_address !== account_address
    ) {
      return res.status(401).json({ error: 'Invalid token for this operation' })
    }

    const isTokenValid = await verifyVerificationCode(
      account_address,
      decodedToken.jti,
      VerificationChannel.TRANSACTION_PIN
    )

    if (!isTokenValid) {
      return res
        .status(401)
        .json({ error: 'Token has already been used or is invalid' })
    }

    // Update PIN in payment preferences
    const result = await updatePaymentPreferences(account_address, {
      pin: newPin,
    })

    try {
      const email =
        await getAccountNotificationSubscriptionEmail(account_address)
      if (email) {
        await sendPinResetSuccessEmail(email)
      }
    } catch (emailError) {
      console.error('Failed to send PIN reset success email:', emailError)
    }

    return res.status(200).json(result)
  } catch (error) {
    Sentry.captureException(error)
    console.error('Error resetting PIN:', error)
    return res.status(500).json({ error: 'Failed to reset PIN' })
  }
}

export default withSessionRoute(handler)
