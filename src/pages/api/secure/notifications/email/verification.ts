import { createHmac, randomBytes, randomInt } from 'crypto'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { VERIFICATION_CODE_EXPIRY_MS } from '@/utils/constants'
import { sendVerificationCodeEmail } from '@/utils/email_helper'

function hmacSha256(value: string, salt: string, secret: string): string {
  return createHmac('sha256', secret).update(`${value}:${salt}`).digest('hex')
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
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    // Generate a 5-digit verification code
    const verificationCode = randomInt(10000, 100000).toString()

    // Create salt and hash
    const salt = randomBytes(16).toString('hex')
    const hash = hmacSha256(verificationCode, salt, JWT_SECRET)

    req.session.verificationCodeHash = hash
    req.session.verificationCodeSalt = salt
    req.session.verificationCodeExpiry =
      Date.now() + VERIFICATION_CODE_EXPIRY_MS
    req.session.verificationCodeType = 'transaction'

    // Save the session
    await req.session.save()

    // Send the verification code email
    await sendVerificationCodeEmail(email, verificationCode)

    return res.status(200).json({
      success: true,
      message: 'Verification code sent successfully',
    })
  } catch (error) {
    console.error('Error sending verification code:', error)
    return res.status(500).json({
      error: 'Failed to send verification code',
    })
  }
}

export default withSessionRoute(handler)
