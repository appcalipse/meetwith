import { NextApiRequest, NextApiResponse } from 'next'

import { RequestInvoiceRequest } from '@/types/Requests'
import { getMeetingTypeFromDB } from '@/utils/database'
import { sendInvoiceEmail } from '@/utils/email_helper'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const payload = req.body as RequestInvoiceRequest
      const meetingType = await getMeetingTypeFromDB(payload.meeting_type_id)
      if (!meetingType) {
        return res.status(404).json({ error: 'Meeting type not found' })
      }
      const amount =
        (meetingType?.plan?.price_per_slot || 0) *
        (meetingType?.plan?.no_of_slot || 0)
      await sendInvoiceEmail(payload.guest_email, payload.guest_name, {
        email_address: payload.guest_email,
        full_name: payload.guest_name,
        number_of_sessions: meetingType.plan?.no_of_slot.toString() || '0',
        payment_method: payload.payment_method,
        plan: meetingType.title,
        price: amount.toString(),
        url: payload.url,
      })

      return res.status(200).json({ success: true })
    } catch (_e: unknown) {
      res.status(500).json({ error: 'Error sending transaction invoice' })
    }
  }
  return res.status(404).send('Not found')
}
// add withSessionRoute to handle session management
export default handle
