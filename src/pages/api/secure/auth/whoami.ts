import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '../../../../utils/auth/withSessionApiRoute'

function userRoute(req: NextApiRequest, res: NextApiResponse) {
  console.log('whoami', req.session.account)
  res.send({ account: req.session.account })
}

export default withSessionRoute(userRoute)
