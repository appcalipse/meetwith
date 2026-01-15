import * as Sentry from '@sentry/nextjs'
import { randomInt } from 'crypto'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { VerificationChannel } from '@/types/AccountNotifications'
import { VERIFICATION_CODE_EXPIRY_MS } from '@/utils/constants'
import { createVerification } from '@/utils/database'
import { sendVerificationCodeEmail } from '@/utils/email_helper'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email } = req.body
    const account_address = req.session.account!.address

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    // Generate a 5-digit verification code
    const verificationCode = randomInt(10000, 100000).toString()

    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MS)

    await createVerification(
      account_address,
      verificationCode,
      VerificationChannel.TRANSACTION_PIN,
      expiresAt
    )

    // Send the verification code email
    await sendVerificationCodeEmail(email, verificationCode)

    return res.status(200).json({
      message: 'Verification code sent successfully',
      success: true,
    })
  } catch (error) {
    Sentry.captureException(error)
    console.error('Error sending verification code:', error)
    return res.status(500).json({
      error: 'Failed to send verification code',
    })
  }
}

export default withSessionRoute(handler)
