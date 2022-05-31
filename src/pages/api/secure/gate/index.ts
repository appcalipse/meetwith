import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { GateConditionObject } from '@/types/TokenGating'
import { withSessionRoute } from '@/utils/auth/withSessionApiRoute'
import { UnauthorizedError } from '@/utils/errors'

import { upsertGateCondition } from '../../../../utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const gateObject = req.body.gateCondition as GateConditionObject
      const upserted = await upsertGateCondition(
        req.session.account!.address,
        gateObject
      )
      res.status(200).json(upserted)
    } catch (err: any) {
      if (err instanceof UnauthorizedError) {
        res.status(503).json({
          error: err.message,
        })
      } else {
        res.status(503).json({
          error: err.message,
        })
      }
    }
  }
}

export default withSentry(withSessionRoute(handle))
