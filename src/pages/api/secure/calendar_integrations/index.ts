import type { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '../../../../utils/auth/withSessionApiRoute'
import {
  changeConnectedCalendarSync,
  getConnectedCalendars,
  removeConnectedCalendar,
} from '../../../../utils/database'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    // sanity check
    if (!req.session.account) {
      res.status(400).json({ message: 'SHOULD BE LOGGED IN' })
      return
    }

    const { syncOnly } = req.query

    const calendars = await getConnectedCalendars(
      req.session.account!.address,
      syncOnly === 'true'
    )
    res.status(200).json(
      calendars.map(it => ({
        provider: it.provider,
        email: it.email,
        sync: it.sync,
      }))
    )
  } else if (req.method === 'DELETE') {
    const { email, provider } = req.body
    await removeConnectedCalendar(req.session.account!.address, email, provider)
    res.status(200).json({})
  } else if (req.method === 'PUT') {
    const { email, provider, sync, payload } = req.body
    await changeConnectedCalendarSync(
      req.session.account!.address,
      email,
      provider,
      sync,
      payload
    )
    res.status(200).json({})
  }
}

export default withSessionRoute(handler)
