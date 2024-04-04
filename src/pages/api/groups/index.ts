// pages/api/groups.ts

import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { getAccountFromDB, initDB } from '@/utils/database'
import { AccountNotFoundError } from '@/utils/errors'
import { getSlugFromText } from '@/utils/generic_utils'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = req.session
  if (!session || !session.account) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { name } = req.body
  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }

  // Generate slug from group name
  const slug = getSlugFromText(name)

  // Initialize database
  const db = initDB()

  // Check for slug uniqueness
  const { data: existingGroup, error: findError } = await db
    .from('groups')
    .select('slug')
    .eq('slug', slug)
    .single()

  if (findError && findError.message !== 'No rows found') {
    console.error('Error finding existing group:', findError)
    return res.status(500).json({ error: 'Internal server error' })
  }

  if (existingGroup) {
    return res.status(409).json({ error: 'Slug already exists' })
  }

  try {
    // Get user account from database using the account identifier from the session
    const account = await getAccountFromDB(session.account.id)

    // Create the group with the account ID retrieved from the database
    const { data: newGroup, error } = await db
      .from('groups')
      .insert([{ name, slug, createdBy: account.id }])

    if (error) {
      console.error('Error inserting new group:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }

    return res.status(200).json(newGroup)
  } catch (error) {
    // Handle specific errors, e.g., AccountNotFoundError
    if (error instanceof AccountNotFoundError) {
      return res.status(404).json({ error: 'User account not found' })
    } else {
      console.error('Error processing request:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}

// Wrap the handler with iron-session
export default withSessionRoute(handler)
