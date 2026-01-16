import * as Sentry from '@sentry/nextjs'
import jwt from 'jsonwebtoken'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { VerificationChannel } from '@/types/AccountNotifications'
import {
  getAccountNotificationSubscriptions,
  setAccountNotificationSubscriptions,
  verifyVerificationCode,
} from '@/utils/database'
import { sendEmailChangeSuccessEmail } from '@/utils/email_helper'

interface TokenPayload {
  type: string
  account_address: string
  iat: number
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
    const { newEmail, token } = req.body

    if (!newEmail || !token) {
      return res.status(400).json({ error: 'Missing newEmail or token' })
    }

    const decodedToken = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    }) as TokenPayload

    if (decodedToken.type !== 'change_email') {
      return res.status(400).json({ error: 'Invalid token type' })
    }

    const account_address = decodedToken.account_address
    if (account_address !== req.session.account!.address) {
      return res
        .status(401)
        .json({ error: 'Unauthorized: Token does not belong to this user' })
    }

    const isTokenValid = await verifyVerificationCode(
      account_address,
      decodedToken.jti,
      VerificationChannel.RESET_EMAIL
    )

    if (!isTokenValid) {
      return res
        .status(401)
        .json({ error: 'Token has already been used or is invalid' })
    }

    const currentNotifications = await getAccountNotificationSubscriptions(
      account_address
    )

    const emailChannel = currentNotifications.notification_types.find(
      n => n.channel === 'email'
    )

    if (!emailChannel) {
      return res.status(400).json({
        error:
          'No email notification channel found. Please set up email notifications first.',
      })
    }

    const hasEmailChannel = currentNotifications.notification_types.some(
      n => n.channel === 'email'
    )

    if (!hasEmailChannel) {
      return res.status(400).json({
        error: 'Cannot change email: no email notification channel configured',
      })
    }

    const updatedNotifications = {
      ...currentNotifications,
      notification_types: currentNotifications.notification_types.map(
        notification =>
          notification.channel === 'email'
            ? { ...notification, destination: newEmail }
            : notification
      ),
    }

    await setAccountNotificationSubscriptions(
      account_address,
      updatedNotifications
    )

    const oldEmail = emailChannel.destination

    try {
      await sendEmailChangeSuccessEmail(newEmail, oldEmail, newEmail)
    } catch (emailError) {
      console.error('Failed to send email change success email:', emailError)
    }

    return res.status(200).json({
      account: { address: account_address, email: newEmail },
      message: 'Email updated successfully',
      success: true,
    })
  } catch (error) {
    Sentry.captureException(error)
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(400).json({ error: 'Invalid token' })
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(400).json({ error: 'Token has expired' })
    }

    console.error('Error updating email:', error)
    return res.status(500).json({ error: 'Failed to update email' })
  }
}

export default withSessionRoute(handler)
