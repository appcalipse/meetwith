import jwt from 'jsonwebtoken'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { PIN_RESET_TOKEN_EXPIRY } from '@/utils/constants'
import { updatePaymentPreferences } from '@/utils/database'

interface ResetPinBody {
  newPin: string
  token: string
}

interface TokenPayload {
  type: string
  account_address: string
  iat: number
  exp: number
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
    const { newPin, token }: ResetPinBody = req.body
    const account_address = req.session.account!.address

    if (!newPin || !token) {
      return res.status(400).json({ error: 'New PIN and token are required' })
    }

    // Verify the JWT token with expiry check
    let decodedToken: TokenPayload
    try {
      decodedToken = jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256'],
        maxAge: PIN_RESET_TOKEN_EXPIRY,
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

    // Update PIN in payment preferences
    const result = await updatePaymentPreferences(account_address, {
      pin: newPin,
    })

    return res.status(200).json(result)
  } catch (error) {
    console.error('Error resetting PIN:', error)
    return res.status(500).json({ error: 'Failed to reset PIN' })
  }
}

export default withSessionRoute(handler)
