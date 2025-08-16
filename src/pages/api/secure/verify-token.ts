import jwt from 'jsonwebtoken'
import { NextApiRequest, NextApiResponse } from 'next'

// JWT_SECRET must be set in environment variables
const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}

interface TokenPayload {
  type: 'reset_pin' | 'enable_pin' | 'change_email'
  account_address: string
  iat: number
  exp: number
  jti: string
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ error: 'Token is required' })
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, JWT_SECRET!) as TokenPayload

    if (!decoded.account_address || !decoded.type || !decoded.jti) {
      return res.status(400).json({ error: 'Invalid token format' })
    }

    // Check if token is expired
    const currentTime = Math.floor(Date.now() / 1000)
    if (decoded.exp < currentTime) {
      return res.status(400).json({ error: 'Token has expired' })
    }

    return res.status(200).json({
      success: true,
      token: decoded,
    })
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(400).json({ error: 'Invalid token' })
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(400).json({ error: 'Token has expired' })
    }

    console.error('Error verifying token:', error)
    return res.status(500).json({ error: 'Failed to verify token' })
  }
}

export default handler
