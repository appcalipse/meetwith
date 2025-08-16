import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { appUrl } from '@/utils/constants'
import { sendResetPinEmail } from '@/utils/email_helper'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const account_address = req.session.account!.address

    // Generate a simple reset token (in production, use a proper JWT or crypto token)
    const resetToken = Buffer.from(`${account_address}-${Date.now()}`).toString(
      'base64'
    )
    const resetUrl = `${appUrl}/dashboard/reset-pin?token=${resetToken}&address=${account_address}`

    // Get user's notification email from the request body
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    // Send the reset email
    await sendResetPinEmail(email, resetUrl)

    // TODO: Store the reset token in database with expiration

    return res.status(200).json({
      success: true,
      message: 'Reset PIN email sent successfully',
    })
  } catch (error) {
    console.error('Error sending reset PIN email:', error)
    return res.status(500).json({
      error: 'Failed to send reset PIN email',
    })
  }
}

export default withSessionRoute(handler)
