import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  createPinHash,
  getPaymentPreferences,
  savePaymentPreferences,
} from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const account_address = req.session.account!.address
    try {
      const preferences = await getPaymentPreferences(account_address)
      return res.status(200).json(preferences)
    } catch (e) {
      return res
        .status(500)
        .json({ error: 'Failed to fetch payment preferences' })
    }
  } else if (req.method === 'POST') {
    const account_address = req.session.account!.address
    const { owner_account_address, data, options } = req.body

    if (owner_account_address !== account_address) {
      return res
        .status(403)
        .send("You can't edit someone else's payment preferences")
    }

    try {
      // Hash the PIN if it's provided
      if (data.pin_hash && typeof data.pin_hash === 'string') {
        data.pin_hash = await createPinHash(data.pin_hash)
      }

      const updatedPreferences = await savePaymentPreferences(
        account_address,
        data,
        options
      )
      return res.status(200).json(updatedPreferences)
    } catch (e) {
      return res
        .status(500)
        .json({ error: 'Failed to save payment preferences' })
    }
  } else if (req.method === 'PATCH') {
    const account_address = req.session.account!.address
    const { owner_account_address, updates } = req.body

    if (owner_account_address !== account_address) {
      return res
        .status(403)
        .send("You can't edit someone else's payment preferences")
    }

    try {
      // Hash the PIN if it's provided
      if (updates.pin_hash && typeof updates.pin_hash === 'string') {
        updates.pin_hash = await createPinHash(updates.pin_hash)
      }

      const updatedPreferences = await savePaymentPreferences(
        account_address,
        updates,
        { operation: 'update' }
      )
      return res.status(200).json(updatedPreferences)
    } catch (e) {
      return res
        .status(500)
        .json({ error: 'Failed to update payment preferences' })
    }
  }

  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
