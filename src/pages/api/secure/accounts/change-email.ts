import jwt from 'jsonwebtoken'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { EMAIL_CHANGE_TOKEN_EXPIRY } from '@/utils/constants'
import {
  getAccountNotificationSubscriptions,
  setAccountNotificationSubscriptions,
} from '@/utils/database'

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
    return res
      .status(500)
      .json({ error: 'JWT_SECRET environment variable is required' })
  }

  try {
    const { newEmail, token } = req.body

    if (!newEmail || !token) {
      return res.status(400).json({ error: 'Missing newEmail or token' })
    }

    const decodedToken = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      maxAge: EMAIL_CHANGE_TOKEN_EXPIRY,
    }) as TokenPayload

    if (decodedToken.type !== 'change_email') {
      return res.status(400).json({ error: 'Invalid token type' })
    }

    const account_address = decodedToken.account_address

    const currentNotifications = await getAccountNotificationSubscriptions(
      account_address
    )

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

    return res.status(200).json({
      success: true,
      message: 'Email updated successfully',
      account: { address: account_address, email: newEmail },
    })
  } catch (error) {
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
