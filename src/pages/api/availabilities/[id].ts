/* eslint-disable no-restricted-syntax */
import { createClient } from '@supabase/supabase-js'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  deleteAvailabilityBlock,
  duplicateAvailabilityBlock,
  getAvailabilityBlock,
  updateAvailabilityBlock,
} from '@/utils/database'
import { UnauthorizedError } from '@/utils/errors'

const supabase = createClient(
  process.env.NEXT_SUPABASE_URL!,
  process.env.NEXT_SUPABASE_KEY!
)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get the account from the session
    const account = req.session.account
    if (!account) {
      throw new UnauthorizedError()
    }

    const { id } = req.query
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid availability block ID' })
    }

    switch (req.method) {
      case 'GET':
        const availability = await getAvailabilityBlock(id, account.address)
        return res.status(200).json(availability)

      case 'PUT':
        const { title, timezone, weekly_availability, is_default } = req.body

        // Get current account preferences to check if this block is currently default
        const { data: accountPrefs } = await supabase
          .from('account_preferences')
          .select('availaibility_id')
          .eq('owner_account_address', account.address)
          .single()

        const isCurrentlyDefault = accountPrefs?.availaibility_id === id

        // If this block is being set as default, update account preferences
        if (is_default) {
          console.log('Setting block as default:', {
            blockId: id,
            accountAddress: account.address,
            isDefault: is_default,
          })

          const { error: prefError } = await supabase
            .from('account_preferences')
            .update({
              availabilities: weekly_availability,
              timezone: timezone,
              availaibility_id: id,
            })
            .eq('owner_account_address', account.address)

          if (prefError) {
            console.error('Error updating account preferences:', prefError)
            throw prefError
          }

          // Log the updated account preferences
          const { data: updatedPrefs } = await supabase
            .from('account_preferences')
            .select('*')
            .eq('owner_account_address', account.address)
            .single()

          console.log('Updated account preferences:', updatedPrefs)
        } else if (isCurrentlyDefault) {
          // If this block is currently default but is being unset, set availaibility_id to null
          console.log('Unsetting default block:', {
            blockId: id,
            accountAddress: account.address,
          })

          const { error: prefError } = await supabase
            .from('account_preferences')
            .update({
              availaibility_id: null,
            })
            .eq('owner_account_address', account.address)

          if (prefError) {
            console.error('Error updating account preferences:', prefError)
            throw prefError
          }

          // Log the updated account preferences
          const { data: updatedPrefs } = await supabase
            .from('account_preferences')
            .select('*')
            .eq('owner_account_address', account.address)
            .single()

          console.log('Updated account preferences:', updatedPrefs)
        }

        const updatedAvailability = await updateAvailabilityBlock(
          id,
          account.address,
          title,
          timezone,
          weekly_availability,
          is_default
        )

        // Log the updated availability block
        console.log('Updated availability block:', updatedAvailability)

        return res.status(200).json({
          ...updatedAvailability,
          isDefault: is_default,
        })

      case 'DELETE':
        try {
          await deleteAvailabilityBlock(id, account.address)
          return res.status(200).json({ success: true })
        } catch (error: any) {
          if (
            error.message === 'Cannot delete the default availability block'
          ) {
            return res.status(400).send(error.message)
          }
          throw error
        }

      case 'POST':
        // Handle duplication with optional modifications
        const modifiedData = req.body
        const duplicatedBlock = await duplicateAvailabilityBlock(
          id,
          account.address,
          modifiedData
        )

        // Log the duplicated block
        console.log('Duplicated block:', duplicatedBlock)

        return res.status(200).json({
          ...duplicatedBlock,
          isDefault: modifiedData.is_default,
        })

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE', 'POST'])
        res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('Error in availability block handler:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export default withSessionRoute(handler)
