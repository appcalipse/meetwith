// pages/api/groups.ts

import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { getAccountFromDB, initDB } from '@/utils/database'
import { AccountNotFoundError } from '@/utils/errors'
import { getSlugFromText } from '@/utils/generic_utils'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  console.log('Received request for /api/groups:', {
    method: req.method,
    body: req.body,
  })
  console.log('Session data:', req.session)

  if (req.method !== 'POST') {
    console.error(
      'Attempted to call /api/groups with incorrect method:',
      req.method
    )
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // const session = req.session
  if (!req.session || !req.session.account || !req.session.account.id) {
    console.error('Session or account data not found in session')
    console.error('Unauthorized access attempt:', { session: req.session })
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Extract identifier from session
  const identifier = req.session.account.address

  // Ensure identifier exists
  if (!identifier) {
    console.error('Identifier not found in session')
    return res.status(400).json({ error: 'Identifier not found' })
  }

  const { name } = req.body
  if (!name) {
    console.error('Name not provided in request body:', req.body)
    return res.status(400).json({ error: 'Name is required' })
  }

  // Generate slug from group name
  const slug = getSlugFromText(name)
  console.log('Generated slug for group:', slug)

  // Initialize database
  const db = initDB()

  // Directly fetch account from the database for comparison
  try {
    const { data: directAccount, error: directError } = await db.supabase
      .from('accounts')
      .select('*')
      .eq('id', req.session.account.id)
      .single()

    console.log('Direct DB fetch account result:', directAccount)
    console.log('Direct DB fetch error:', directError)
  } catch (error) {
    console.error('Direct DB fetch error:', error)
  }

  try {
    console.log(
      'req.session.account:',
      JSON.stringify(req.session.account, null, 2)
    )
    console.log('Get identifier before getting getAccountFromDB:', identifier)
    const account = await getAccountFromDB(identifier)
    console.log('Account retrieved successfully:', account)

    // Proceed with the logic to handle the account information
    const { data: newGroup, error: groupCreationError } = await db.supabase
      .from('groups')
      .insert([{ name, slug, createdBy: account.id }])

    if (groupCreationError) {
      console.error('Error inserting new group:', groupCreationError)
      return res.status(500).json({ error: 'Internal server error' })
    }

    console.log('Group created successfully:', newGroup)
    return res.status(200).json(newGroup)
  } catch (error) {
    console.error('Error during account retrieval or group creation:', error)
    // Handle the error appropriately
    if (error instanceof AccountNotFoundError) {
      return res.status(404).json({ error: 'User account not found' })
    } else {
      return res
        .status(500)
        .json({ error: (error as Error).message || 'Internal server error' })
    }
  }
}

export default withSessionRoute(handler)
