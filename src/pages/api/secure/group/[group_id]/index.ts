import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { UpdateGroupPayload } from '@/types/Group'
import { deleteGroup, editGroup, getGroup, initDB } from '@/utils/database'
import {
  GroupNotExistsError,
  NotGroupAdminError,
  NotGroupMemberError,
} from '@/utils/errors'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    initDB()
    const account_address = req.session.account!.address
    if (!account_address) {
      return res.status(401).send('Unauthorized')
    }
    const group_id = req.query.group_id as string
    if (req.method === 'GET') {
      const group = await getGroup(group_id, account_address)
      return res.status(200).json(group)
    }
    if (req.method === 'PUT') {
      const { slug, name } = req.body as UpdateGroupPayload
      await editGroup(group_id, account_address, name, slug)
      return res.status(200).json({
        success: true,
      })
    }
    if (req.method === 'DELETE') {
      await deleteGroup(group_id, account_address)
      return res.status(200).json({
        success: true,
      })
    }
  } catch (error) {
    if (error instanceof NotGroupMemberError) {
      return res.status(403).json({ error: error.message })
    }
    if (error instanceof NotGroupAdminError) {
      return res.status(403).json({ error: error.message })
    }
    if (error instanceof GroupNotExistsError) {
      return res.status(404).json({ error: error.message })
    }
    return res.status(500).send(error)
  }
  return res.status(405).send('Method not allowed')
}
export default withSessionRoute(handle)
