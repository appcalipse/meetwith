import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { GateConditionObject } from '@/types/TokenGating'
import { deleteGateCondition, upsertGateCondition } from '@/utils/database'
import { GateInUseError, UnauthorizedError } from '@/utils/errors'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const gateObject = req.body.gateCondition as GateConditionObject
      const upserted = await upsertGateCondition(
        req.session.account!.address,
        gateObject
      )
      return res.status(200).json(upserted)
    } catch (err: any) {
      if (err instanceof UnauthorizedError) {
        return res.status(503).json({
          error: err.message,
        })
      } else {
        return res.status(503).json({
          error: err.message,
        })
      }
    }
  } else if (req.method === 'DELETE') {
    try {
      const idToDelete = req.body.id as string
      const deleted = await deleteGateCondition(
        req.session.account!.address,
        idToDelete
      )
      return res.status(200).json({ result: deleted })
    } catch (err: any) {
      if (err instanceof UnauthorizedError) {
        return res.status(503).json({
          error: err.message,
        })
      } else if (err instanceof GateInUseError) {
        return res.status(409).json({
          error: err.message,
        })
      } else {
        return res.status(503).json({
          error: err.message,
        })
      }
    }
  }
}

export default withSessionRoute(handle)
