import jwt from 'jsonwebtoken'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { supportedChains } from '@/types/chains'
import { PIN_ENABLE_TOKEN_EXPIRY } from '@/utils/constants'
import {
  createPaymentPreferences,
  getPaymentPreferences,
  updatePaymentPreferences,
} from '@/utils/database'

interface EnablePinBody {
  pin: string
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
    const { pin, token }: EnablePinBody = req.body
    const account_address = req.session.account!.address

    if (!pin || !token) {
      return res.status(400).json({ error: 'PIN and token are required' })
    }

    // Verify the JWT token with expiry check
    let decodedToken: TokenPayload
    try {
      decodedToken = jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256'],
        maxAge: PIN_ENABLE_TOKEN_EXPIRY,
      }) as TokenPayload
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: 'Token has expired' })
      }
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Check token type and address
    if (
      decodedToken.type !== 'enable_pin' ||
      decodedToken.account_address !== account_address
    ) {
      return res.status(401).json({ error: 'Invalid token for this operation' })
    }

    // Check if payment preferences already exist
    const existingPreferences = await getPaymentPreferences(account_address)

    if (existingPreferences) {
      // Update existing preferences with new PIN
      const result = await updatePaymentPreferences(account_address, {
        pin: pin,
      })
      return res.status(200).json(result)
    } else {
      // Create new preferences with default values
      const result = await createPaymentPreferences(account_address, {
        pin: pin,
        notification: [],
        default_chain_id:
          supportedChains.find(chain => chain.walletSupported)?.id ||
          supportedChains[0].id,
      })
      return res.status(200).json(result)
    }
  } catch (error) {
    console.error('Error enabling PIN:', error)
    return res.status(500).json({ error: 'Failed to enable PIN' })
  }
}

export default withSessionRoute(handler)
