import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { VerificationChannel } from '@/types/AccountNotifications'
import { verifyVerificationCode } from '@/utils/database'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { code } = req.body
    const account_address = req.session.account!.address

    if (!code) {
      return res.status(400).json({ error: 'Code is required' })
    }

    const isValid = await verifyVerificationCode(
      account_address,
      code,
      VerificationChannel.TRANSACTION_PIN
    )

    if (isValid) {
      return res.status(200).json({
        message: 'Verification code verified successfully',
        success: true,
      })
    } else {
      return res.status(400).json({
        error: 'Invalid or expired verification code',
        success: false,
      })
    }
  } catch (error) {
    Sentry.captureException(error)
    console.error('Error verifying code:', error)
    return res.status(500).json({
      error: 'Failed to verify code',
    })
  }
}

export default withSessionRoute(handler)
