import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'

import { createGroup } from './create-group'
// import { deleteGroup } from './delete-group'
// import { getGroupInfo } from './get-group-info'
// import { updateGroupDetails } from './update-group-details'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  const account_address = req.session.account!.address

  switch (req.method) {
    case 'POST':
      return createGroup(account_address, req, res)
    // case 'GET':
    //   return getGroupInfo(account_address, req, res)
    // case 'PUT':
    //   return updateGroupDetails(account_address, req, res)
    // case 'DELETE':
    //   return deleteGroup(account_address, req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

export default withSessionRoute(handle)
