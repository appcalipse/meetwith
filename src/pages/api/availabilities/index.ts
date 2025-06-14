import { createClient } from '@supabase/supabase-js'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { TimeRange } from '@/types/Account'
import { createAvailabilityBlock, getAccountFromDB } from '@/utils/database'
import { UnauthorizedError } from '@/utils/errors'

const supabase = createClient(
  process.env.NEXT_SUPABASE_URL!,
  process.env.NEXT_SUPABASE_KEY!
)

interface AvailabilityBlock {
  id: string
  title: string
  timezone: string
  weekly_availability: Array<{ weekday: number; ranges: TimeRange[] }>
  is_default?: boolean
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get the account from the session
    const account = req.session.account
    if (!account) {
      throw new UnauthorizedError()
    }

    const address = account.address

    switch (req.method) {
      case 'GET':
        const accountData = await getAccountFromDB(address, true)
        // Get all availability blocks for this account
        const { data: availabilityBlocks, error } = await supabase
          .from('availabilities')
          .select('*')
          .eq('account_owner_address', address)

        if (error) throw error

        // Get account preferences to determine default block
        const { data: accountPrefs } = await supabase
          .from('account_preferences')
          .select('availaibility_id')
          .eq('owner_account_address', address)
          .single()

        // Transform the data into the format expected by the frontend
        const blocks = (availabilityBlocks || []).map(
          (block: AvailabilityBlock) => ({
            id: block.id,
            title: block.title,
            timezone: block.timezone,
            isDefault: accountPrefs?.availaibility_id === block.id,
            availabilities: block.weekly_availability,
          })
        )

        // If no blocks exist, create a default block
        if (blocks.length === 0) {
          const defaultBlock = await createAvailabilityBlock(
            address,
            'Default Availability',
            accountData.preferences.timezone,
            accountData.preferences.availabilities || [],
            true
          )
          blocks.push({
            id: defaultBlock.id,
            title: defaultBlock.title,
            timezone: defaultBlock.timezone,
            isDefault: true,
            availabilities: defaultBlock.weekly_availability,
          })
        }

        return res.status(200).json(blocks)

      case 'POST':
        const { title, timezone, weekly_availability, is_default } = req.body
        const newBlock = await createAvailabilityBlock(
          address,
          title,
          timezone,
          weekly_availability,
          is_default
        )
        return res.status(200).json({
          ...newBlock,
          isDefault: is_default,
        })

      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error: any) {
    console.error('Error in availabilities handler:', error)
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({ error: error.message })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withSessionRoute(handler)
