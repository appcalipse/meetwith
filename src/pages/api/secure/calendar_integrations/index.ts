import * as Sentry from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { googleScopes } from '@/pages/api/secure/calendar_integrations/google/connect'
import { officeScopes } from '@/pages/api/secure/calendar_integrations/office365/connect'
import { TimeSlotSource } from '@/types/Meeting'
import {
  addOrUpdateConnectedCalendar,
  countCalendarSyncs,
  getConnectedCalendars,
  removeConnectedCalendar,
} from '@/utils/database'
import { isProAccountAsync } from '@/utils/database'
import { CalendarSyncLimitExceededError } from '@/utils/errors'
import { getConnectedCalendarIntegration } from '@/utils/services/connected_calendars.factory'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    // sanity check
    if (!req.session.account) {
      return res.status(400).json({ message: 'SHOULD BE LOGGED IN' })
    }

    const accountAddress = req.session.account!.address
    const { syncOnly } = req.query

    const allCalendars = await getConnectedCalendars(accountAddress, {
      syncOnly: syncOnly === 'true',
      activeOnly: false,
    })

    // Check subscription status for filtering
    const isPro = await isProAccountAsync(accountAddress)

    // Force all connected calendars to renew its Tokens
    // if needed for displaying calendars...
    for (const calendar of allCalendars) {
      try {
        const integration = getConnectedCalendarIntegration(
          accountAddress,
          calendar.email,
          calendar.provider,
          calendar.payload
        )
        await integration.refreshConnection()
      } catch (e) {
        console.error(e)
        // await removeConnectedCalendar(
        //   req.session.account!.address,
        //   calendar.email,
        //   calendar.provider
        // )
      }
    }

    try {
      // Filter calendars based on subscription status
      let calendars = allCalendars
      let hidden = 0
      let upgradeRequired = false

      if (!isPro) {
        // Free tier: return only first 1 integration
        calendars = allCalendars.slice(0, 1)
        hidden = Math.max(0, allCalendars.length - 1)
        upgradeRequired = allCalendars.length > 1
      }

      const response = calendars.map(it => {
        let grantedPermissions = 0
        let expectedPermissions = 0
        if (
          it.payload &&
          [TimeSlotSource.GOOGLE, TimeSlotSource.OFFICE].includes(it.provider)
        ) {
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

      return res.status(200).json({
        calendars: response,
        total: allCalendars.length,
        hidden,
        upgradeRequired,
      })
    } catch (e) {
      Sentry.captureException(e)
      return res.status(500).json({ message: 'An unexpected error occurred.' })
    }
  } else if (req.method === 'PUT') {
    try {
      const { email, provider, calendars } = req.body
      const accountAddress = req.session.account!.address

      // Check subscription status for feature limits
      const isPro = await isProAccountAsync(accountAddress)

      if (!isPro) {
        // Count sync calendars in other integrations (excluding current one being updated)
        const existingSyncCount = await countCalendarSyncs(
          accountAddress,
          provider,
          email
        )

        // Count sync calendars in the new calendars array
        const newSyncCount = calendars.filter(
          (cal: { sync: boolean }) => cal.sync === true
        ).length

        // Free tier restriction: Maximum 1 calendar sync total
        if (existingSyncCount + newSyncCount > 1) {
          throw new CalendarSyncLimitExceededError()
        }
      }

      const result = await addOrUpdateConnectedCalendar(
        accountAddress,
        email,
        provider,
        calendars
      )
      return res.status(200).json(result)
    } catch (error) {
      Sentry.captureException(error)

      if (error instanceof CalendarSyncLimitExceededError) {
        return res.status(403).json({ error: error.message })
      }

      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      })
    }
  } else if (req.method === 'DELETE') {
    const { email, provider } = req.body
    await removeConnectedCalendar(req.session.account!.address, email, provider)
    return res.status(200).json({})
  }
}

export default withSessionRoute(handler)
