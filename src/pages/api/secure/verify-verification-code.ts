import { createHmac } from 'crypto'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'

function hmacSha256(value: string, salt: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(`${value}:${salt}`).digest()
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i]
  }
  return result === 0
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { verificationCode } = req.body

    if (!verificationCode) {
      return res.status(400).json({ error: 'Verification code is required' })
    }

    // Check if user has an active verification code in session
    if (!req.session.verificationCodeExpiry) {
      return res.status(400).json({
        error: 'No verification code found. Please request a new one.',
      })
    }

    // Check if verification code has expired
    if (Date.now() > req.session.verificationCodeExpiry) {
      // Clear expired verification data
      req.session.verificationCodeHash = undefined
      req.session.verificationCodeSalt = undefined
      req.session.verificationCodeExpiry = undefined
      req.session.verificationCodeType = undefined
      await req.session.save()

      return res.status(400).json({
        error: 'Verification code has expired. Please request a new one.',
      })
    }

    // Check if verification code type matches
    if (req.session.verificationCodeType !== 'transaction') {
      return res.status(400).json({ error: 'Invalid verification code type' })
    }

    const secret = process.env.JWT_SECRET || ''

    // Hash+salt verification path
    const storedHashHex = req.session.verificationCodeHash
    const salt = req.session.verificationCodeSalt
    if (!storedHashHex || !salt) {
      return res.status(400).json({ error: 'Invalid verification code state' })
    }
    const providedDigest = hmacSha256(verificationCode, salt, secret)
    const storedDigest = Buffer.from(storedHashHex, 'hex')
    if (
      providedDigest.length !== storedDigest.length ||
      !safeEqual(providedDigest, storedDigest)
    ) {
      return res.status(400).json({ error: 'Invalid verification code' })
    }

    // Clear the verification code after successful use (single-use)
    req.session.verificationCodeHash = undefined
    req.session.verificationCodeSalt = undefined
    req.session.verificationCodeExpiry = undefined
    req.session.verificationCodeType = undefined
    await req.session.save()

    return res.status(200).json({
      success: true,
      message: 'Verification code verified successfully',
    })
  } catch (error) {
    console.error('Error verifying verification code:', error)
    return res.status(500).json({ error: 'Failed to verify verification code' })
  }
}

export default withSessionRoute(handler)
