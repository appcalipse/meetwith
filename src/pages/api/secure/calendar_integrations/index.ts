import type { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { googleScopes } from '@/pages/api/secure/calendar_integrations/google/connect'
import { officeScopes } from '@/pages/api/secure/calendar_integrations/office365/connect'
import { TimeSlotSource } from '@/types/Meeting'
import {
  addOrUpdateConnectedCalendar,
  getConnectedCalendars,
  removeConnectedCalendar,
} from '@/utils/database'
import { getConnectedCalendarIntegration } from '@/utils/services/connected_calendars.factory'

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

    // Force all connected calendars to renew its Tokens
    // if needed for displaying calendars...
    for (const calendar of calendars) {
      try {
        const integration = getConnectedCalendarIntegration(
          req.session.account!.address,
          calendar.email,
          calendar.provider,
          calendar.payload
        )
        await integration.refreshConnection()
      } catch (e) {
        await removeConnectedCalendar(
          req.session.account!.address,
          calendar.email,
          calendar.provider
        )
      }
    }

    return res.status(200).json(
      calendars.map(it => {
        let grantedPermissions = 0
        let expectedPermissions = 0
        if (it.payload) {
          const payload = JSON.parse(it.payload)
          const permissions = payload.scope
            .split(' ')
            .filter(
              (permission: string) =>
                !['offline_access', 'openid'].includes(permission)
            )
          if (it.provider === TimeSlotSource.GOOGLE) {
            expectedPermissions = googleScopes.length
            grantedPermissions = permissions.filter((permission: string) =>
              googleScopes.includes(permission)
            ).length
          } else if (it.provider === TimeSlotSource.OFFICE) {
            expectedPermissions = officeScopes.filter(
              scope => scope !== 'offline_access'
            ).length
            grantedPermissions = permissions.filter((permission: string) =>
              officeScopes.includes(permission)
            ).length
          }
        }
        return {
          id: it.id,
          provider: it.provider,
          email: it.email,
          calendars: it.calendars,
          expectedPermissions,
          grantedPermissions,
        }
      })
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
