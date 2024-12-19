import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { getNewestCoupon } from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const coupon = await getNewestCoupon()
    if (coupon) {
      return res.status(200).json(coupon)
    }
  }

  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
