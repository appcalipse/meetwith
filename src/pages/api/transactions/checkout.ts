import { NextApiRequest, NextApiResponse } from 'next'

import { PaymentAccountStatus } from '@/types/PaymentAccount'
import { MeetingCheckoutRequest } from '@/types/Requests'
import {
  createCheckOutTransaction,
  getAccountAvatarUrl,
  getActivePaymentAccount,
  getMeetingTypeFromDBLean,
} from '@/utils/database'
import { StripeService } from '@/utils/services/stripe.service'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const payload = req.body as MeetingCheckoutRequest
      const stripe = new StripeService()
      const meetingType = await getMeetingTypeFromDBLean(
        payload.meeting_type_id
      )
      const paymentAccount = await getActivePaymentAccount(
        meetingType.account_owner_address
      )
      if (
        !paymentAccount.provider_account_id ||
        paymentAccount.status !== PaymentAccountStatus.CONNECTED
      ) {
        return res
          .status(400)
          .json({ error: 'Payment account is not properly connected' })
      }
      const transaction = await createCheckOutTransaction(payload)
      const avatarUrl = await getAccountAvatarUrl(
        meetingType.account_owner_address
      )
      const metadata = {
        guest_address: payload?.guest_address || '',
        guest_email: payload?.guest_email || '',
        guest_name: payload?.guest_name || '',
        meeting_type_id: payload?.meeting_type_id || '',
        transaction_id: transaction.id,
      }
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: meetingType.title || 'Meeting',
                description: meetingType.description || undefined,
                images: avatarUrl ? [avatarUrl] : [],
              },
              unit_amount: meetingType.plan.price_per_slot * 100,
            },
            quantity: meetingType.plan.no_of_slot || 1,
          },
        ],
        metadata,
        mode: 'payment',
        payment_intent_data: {
          metadata,
          application_fee_amount: Math.ceil(payload.amount * 0.005 * 100), // 0.5% platform fee
          on_behalf_of: paymentAccount?.provider_account_id,
          transfer_data: {
            destination: paymentAccount?.provider_account_id || '',
          },
        },
        success_url:
          payload.redirectUrl +
          `&transaction_id=${transaction.id}&checkoutState=success`,
        cancel_url: payload.redirectUrl + `&checkoutState=cancelled`,
      })
      return res.status(200).json({ url: session.url })
    } catch (e: unknown) {
      console.error(e)
      res.status(500).json({ error: 'Error sending transaction invoice' })
    }
  }
  return res.status(404).send('Not found')
}
// add withSessionRoute to handle session management
export default handle
