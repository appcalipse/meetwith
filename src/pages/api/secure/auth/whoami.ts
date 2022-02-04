import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '../../../../utils/auth/withSessionApiRoute'

function userRoute(req: NextApiRequest, res: NextApiResponse) {
  res.send({ account: req.session.account })
}

export default withSessionRoute(userRoute)
