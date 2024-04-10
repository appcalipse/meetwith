import { NextApiRequest, NextApiResponse } from 'next'
import { v4 as uuidv4 } from 'uuid'

import { getAccountFromDB, initDB } from '@/utils/database'
import { AccountNotFoundError } from '@/utils/errors'
import { getSlugFromText } from '@/utils/generic_utils'

export const createGroup = async (
  account_address: string,
  req: NextApiRequest,
  res: NextApiResponse
) => {
  // Extract identifier from session
  const identifier = account_address

  // Ensure identifier exists
  if (!identifier) {
    console.error('Identifier not found in session')
    return res.status(400).json({ error: 'Identifier not found' })
  }

  // Parse the request body
  let requestBody = req.body

  if (typeof requestBody === 'string') {
    try {
      requestBody = JSON.parse(requestBody)
    } catch (error) {
      console.error('Error parsing request body:', error)
      return res.status(400).json({ error: 'Invalid request body' })
    }
  }

  if (typeof requestBody !== 'object' || requestBody === null) {
    console.error('Invalid request body:', requestBody)
    return res.status(400).json({ error: 'Invalid request body' })
  }

  const { name } = requestBody

  if (!name) {
    console.error('Name not provided in request body:', requestBody)
    return res.status(400).json({ error: 'Name is required' })
  }

  const slug = getSlugFromText(name)
  console.log('Generated slug for group:', slug)

  const groupId = uuidv4()

  const db = initDB()

  try {
    const account = await getAccountFromDB(identifier)
    console.log('Account retrieved successfully:', account)

    // Handle the account information
    const { data: newGroup, error: groupCreationError } = await db.supabase
      .from('groups')
      .insert([
        {
          id: groupId,
          name,
          slug,
        },
      ])

    if (groupCreationError) {
      console.error('Error inserting new group:', groupCreationError)
      return res.status(500).json({ error: 'Internal server error' })
    }

    console.log('Group created successfully:', newGroup)
    return res.status(200).json(newGroup)
  } catch (error) {
    console.error('Error during account retrieval or group creation:', error)
    // Error handling
    if (error instanceof AccountNotFoundError) {
      return res.status(404).json({ error: 'User account not found' })
    } else {
      return res
        .status(500)
        .json({ error: (error as Error).message || 'Internal server error' })
    }
  }
}
