import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '../../../utils/auth/withSessionApiRoute'

function logoutRoute(req: NextApiRequest, res: NextApiResponse) {
  req.session.destroy()
  res.send({ ok: true })
}

export default withSessionRoute(logoutRoute)
