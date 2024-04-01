import { NextApiRequest, NextApiResponse } from 'next'

// import { getAccountFromDB, initDB, leaveGroup, isNonAdminMember } from '@/utils/database';
import { AccountNotFoundError, UnauthorizedError } from '@/utils/errors'

// Initializes the database connection
// const { db } = initDB();

// Simulated database entries
const DUMMY_ACCOUNTS = [
  {
    userId: 'test-user-id',
    groupId: 'test-group-id',
    role: 'member',
  },
  {
    userId: 'admin-user-id',
    groupId: 'test-group-id',
    role: 'admin',
  },
]

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const userId = req.headers['x-user-id'] as string
  const groupId = 'test-group-id' as string // Add this line for testing

  console.log('userId:', userId)
  console.log('groupId:', groupId)

  if (!userId) {
    return res.status(401).json(new UnauthorizedError())
  }

  if (!userId || !groupId) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Simulate fetching account from DB
  const account = DUMMY_ACCOUNTS.find(
    acc => acc.userId === userId && acc.groupId === groupId
  )

  console.log(`Account match found: ${!!account}`)

  if (!account) {
    return res
      .status(404)
      .json(
        new AccountNotFoundError(`Account for user ID ${userId} not found.`)
      )
  }

  // Simulate checking group membership and admin status
  if (account.role !== 'admin') {
    // Simulate leaving the group by not actually modifying any persistent data
    return res.status(205).send('Group left successfully.')
  } else {
    return res.status(403).send('Operation not allowed.')
  }

  // try {
  //   const account = await getAccountFromDB(userId);
  //   if (!account) {
  //     throw new AccountNotFoundError(`Account for user ID ${userId} not found.`);
  //   }
  //   const isEligibleToLeave = await isNonAdminMember(
  //     userId.toString(),
  //     groupId.toString()
  //   );
  //   if (!isEligibleToLeave) {
  //     return res.status(403).send('Operation not allowed.');
  //   }
  //   await leaveGroup(userId.toString(), groupId.toString());
  //   res.status(205).send('Group left successfully.');
  // } catch (error) {
  //   console.error('Error leaving group:', error);
  //   if (error instanceof AccountNotFoundError) {
  //     return res.status(404).send(error.message);
  //   } else {
  //     return res.status(500).send('Internal Server Error');
  //   }
  // }
}

export default handler
