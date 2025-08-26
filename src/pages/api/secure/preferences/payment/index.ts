import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  createPaymentPreferences,
  createPinHash,
  getPaymentPreferences,
  updatePaymentPreferences,
  verifyUserPin,
} from '@/utils/database'

interface CreatePaymentPreferencesBody {
  data: Partial<{
    pin?: string
    pin_hash?: string
    default_chain_id?: number
    notification?: Array<'send-tokens' | 'receive-tokens'>
  }>
  options?: { operation?: 'create' | 'update' }
}

interface UpdatePaymentPreferencesBody {
  updates: Partial<{
    pin?: string
    pin_hash?: string
    default_chain_id?: number
    notification?: Array<'send-tokens' | 'receive-tokens'>
  }>
  oldPin?: string
}

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const account_address = req.session.account!.address
    try {
      const preferences = await getPaymentPreferences(account_address)
      return res.status(200).json(preferences)
    } catch (e) {
      Sentry.captureException(e)
      return res
        .status(500)
        .json({ error: 'Failed to fetch payment preferences' })
    }
  } else if (req.method === 'POST') {
    const account_address = req.session.account!.address
    const { data }: CreatePaymentPreferencesBody = req.body

    try {
      // Hash the PIN if it's provided
      if (data.pin && typeof data.pin === 'string') {
        data.pin_hash = await createPinHash(data.pin)
        delete data.pin // Remove pin field before calling database function
      }

      const updatedPreferences = await createPaymentPreferences(
        account_address,
        data
      )
      return res.status(200).json(updatedPreferences)
    } catch (e) {
      Sentry.captureException(e)
      return res
        .status(500)
        .json({ error: 'Failed to save payment preferences' })
    }
  } else if (req.method === 'PATCH') {
    const account_address = req.session.account!.address
    const { updates, oldPin }: UpdatePaymentPreferencesBody = req.body

    try {
      if (updates.pin && typeof updates.pin === 'string') {
        if (!oldPin || typeof oldPin !== 'string') {
          return res.status(400).json({
            error: 'Current PIN is required to update to a new PIN',
          })
        }

        const isOldPinValid = await verifyUserPin(account_address, oldPin)
        if (!isOldPinValid) {
          return res.status(401).json({
            error: 'Current PIN is incorrect',
          })
        }

        updates.pin_hash = await createPinHash(updates.pin)
        delete updates.pin
      }

      const updatedPreferences = await updatePaymentPreferences(
        account_address,
        updates
      )
      return res.status(200).json(updatedPreferences)
    } catch (e) {
      Sentry.captureException(e)
      return res
        .status(500)
        .json({ error: 'Failed to update payment preferences' })
    }
  }

  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
