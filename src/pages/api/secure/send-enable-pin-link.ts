import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { appUrl } from '@/utils/constants'
import { sendEnablePinEmail } from '@/utils/email_helper'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const account_address = req.session.account!.address

    // Generate a simple enable token (in production, use a proper JWT or crypto token)
    const enableToken = Buffer.from(
      `${account_address}-${Date.now()}`
    ).toString('base64')
    const enableUrl = `${appUrl}/dashboard/enable-pin?token=${enableToken}&address=${account_address}`

    // Get user's notification email from the request body
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    // Send the enable email
    await sendEnablePinEmail(email, enableUrl)

    // TODO: Store the enable token in database with expiration

    return res.status(200).json({
      success: true,
      message: 'Enable PIN email sent successfully',
    })
  } catch (error) {
    console.error('Error sending enable PIN email:', error)
    return res.status(500).json({
      error: 'Failed to send enable PIN email',
    })
  }
}

export default withSessionRoute(handler)
