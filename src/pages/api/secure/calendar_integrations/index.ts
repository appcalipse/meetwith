import type { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'

import {
  addOrUpdateConnectedCalendar,
  getConnectedCalendars,
  removeConnectedCalendar,
} from '../../../../utils/database'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    // sanity check
    if (!req.session.account) {
      return res.status(400).json({ message: 'SHOULD BE LOGGED IN' })
    }

    const { syncOnly } = req.query

    const calendars = await getConnectedCalendars(
      req.session.account!.address,
      { syncOnly: syncOnly === 'true', activeOnly: false }
    )
    return res.status(200).json(
      calendars.map(it => ({
        provider: it.provider,
        email: it.email,
        calendars: it.calendars,
      }))
    )
  } else if (req.method === 'DELETE') {
    const { email, provider } = req.body
    await removeConnectedCalendar(req.session.account!.address, email, provider)
    return res.status(200).json({})
  } else if (req.method === 'PUT') {
    const { email, provider, calendars } = req.body
    const result = await addOrUpdateConnectedCalendar(
      req.session.account!.address,
      email,
      provider,
      calendars
    )
    return res.status(200).json(result)
  }
}

export default withSessionRoute(handler)
