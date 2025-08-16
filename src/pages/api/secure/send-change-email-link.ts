import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { appUrl } from '@/utils/constants'
import { sendChangeEmailEmail } from '@/utils/email_helper'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const account_address = req.session.account!.address

    // Generate a simple change email token (in production, use a proper JWT or crypto token)
    const changeToken = Buffer.from(
      `${account_address}-${Date.now()}`
    ).toString('base64')
    const changeUrl = `${appUrl}/dashboard/change-email?token=${changeToken}&address=${account_address}`

    // Get user's current notification email and new email from the request body
    const { currentEmail, newEmail } = req.body

    if (!currentEmail || !newEmail) {
      return res
        .status(400)
        .json({ error: 'Current email and new email are required' })
    }

    // Send the change email to the current email address
    await sendChangeEmailEmail(currentEmail, changeUrl)

    // TODO: Store the change email token in database with expiration and new email

    return res.status(200).json({
      success: true,
      message: 'Change email link sent successfully',
    })
  } catch (error) {
    console.error('Error sending change email link:', error)
    return res.status(500).json({
      error: 'Failed to send change email link',
    })
  }
}

export default withSessionRoute(handler)
