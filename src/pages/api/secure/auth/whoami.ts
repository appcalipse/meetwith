import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'

function userRoute(req: NextApiRequest, res: NextApiResponse) {
  res.send({ account: req.session.account })
}

export default withSessionRoute(userRoute)
