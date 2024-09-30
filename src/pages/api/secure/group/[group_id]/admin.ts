import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { MemberType } from '@/types/Group'
import { ChangeGroupAdminRequest } from '@/types/Requests'
import { changeGroupRole, initDB, isGroupAdmin } from '@/utils/database'
import {
  AdminBelowOneError,
  GroupNotExistsError,
  NotGroupAdminError,
} from '@/utils/errors'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'PATCH') {
    initDB()
    const account_address = req.session.account!.address
    if (!account_address) {
      return res.status(401).send('Unauthorized')
    }
    const group_id = req.query.group_id as string
    const { role, address, userId, invitePending } =
      req.body as ChangeGroupAdminRequest
    const userIdentifier = address || userId
    if (!(Object.values(MemberType).includes(role) && userIdentifier)) {
      return res.status(400).send('Invalid request')
    }
    try {
      if (await isGroupAdmin(group_id, account_address)) {
        const isUpdated = await changeGroupRole(
          group_id,
          userIdentifier,
          role,
          invitePending
        )
        if (isUpdated) {
          res.status(200).json({ success: true })
        }
      } else {
        throw new NotGroupAdminError()
      }
    } catch (error: unknown) {
      if (error instanceof NotGroupAdminError) {
        return res.status(403).json({ error: error.message })
      }
      if (error instanceof GroupNotExistsError) {
        return res.status(404).json({ error: error.message })
      }
      if (error instanceof AdminBelowOneError) {
        return res.status(405).json({ error: error.message })
      }
      if (error instanceof Error) {
        return res.status(500).send(error.message)
      }
      return res.status(500).send('Something went wrong')
    }
  }
  return res.status(405).send('Method not allowed')
}
export default withSessionRoute(handle)
