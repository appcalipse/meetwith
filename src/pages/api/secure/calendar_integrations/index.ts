/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Time } from '@faker-js/faker/time'
import type { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { googleScopes } from '@/pages/api/secure/calendar_integrations/google/connect'
import { officeScopes } from '@/pages/api/secure/calendar_integrations/office365/connect'
import { TimeSlotSource } from '@/types/Meeting'
import {
  CalendarSyncInfo,
  ConnectedCalendar,
} from '@/types/CalendarConnections'
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
          provider: it.provider,
          email: it.email,
          calendars: it.calendars,
          expectedPermissions,
          grantedPermissions,
        }
      })
    )
    //https://www.googleapis.com/auth/calendar.events.freebusy https://www.googleapis.com/auth/calendar.freebusy https://www.googleapis.com/auth/calendar.events.owned https://www.googleapis.com/auth/calendar.readonly openid https://www.googleapis.com/auth/userinfo.email
  } else if (req.method === 'DELETE') {
    // Delete a Calendar
    const { email, provider } = req.body
    await removeConnectedCalendar(req.session.account!.address, email, provider)
    return res.status(200).json({})
    // eslint-disable-next-line prettier/prettier
  } else if (req.method === 'PUT') {
    // Update a Calendar
    const { email, provider, calendars } = req.body as {
      email: string
      provider: TimeSlotSource
      calendars: CalendarSyncInfo[]
    }

    const ownerAddress = req.session.account!.address

    console.log('updating calendar')
    const result = await addOrUpdateConnectedCalendar(
      ownerAddress,
      email,
      provider,
      calendars
    )

    // get all connected calendars
    const connectedCalendars = await getConnectedCalendars(ownerAddress, {
      syncOnly: true,
      activeOnly: false,
    })

    // For google calendars
    if (provider.toLowerCase() === 'google') {
      const googleCalendar = connectedCalendars.find(
        (k: ConnectedCalendar) =>
          k.provider.toLowerCase() === provider.toLowerCase()
      )
      if (googleCalendar) {
        // filter for calendar where webhook is true
        calendars.forEach(async (calendar: CalendarSyncInfo) => {
          const webhook = calendar.webhook
          const calendarId = calendar.calendarId

          const integration = getConnectedCalendarIntegration(
            ownerAddress,
            email,
            googleCalendar.provider,
            googleCalendar.payload
          )

          if (webhook) {
            console.log('setup calendar webhook')
            calendar.webhook = true
            calendar.webhookType = TimeSlotSource.GOOGLE

            if (integration) {
              const resp = await integration.setupCalendarWebhook(
                calendarId,
                ownerAddress
              )

              console.log('setup calendar webhook response')

              if (resp) {
                calendar.webhookId = resp.webhookId
                calendar.webhookAddress = resp.webhookAddress
                calendar.webhookResourceId = resp.webhookResourceId
                calendar.webhookExpiration = resp.webhookExpiration
              }
            }
            console.log('updating webhooks in database')
            const result = await addOrUpdateConnectedCalendar(
              ownerAddress,
              email,
              provider,
              calendars
            )
            console.log('updated calendar', result)
          } else {
            calendar.webhook = false
            calendar.webhookType = undefined
            calendar.webhookId = ''
            calendar.webhookAddress = ''
            calendar.webhookResourceId = ''
            calendar.webhookExpiration = undefined

            if (integration && integration.stopChannel) {
              console.log('stopping calendar webhook')
              await integration.stopChannel(
                calendar.webhookId || `id-${ownerAddress}`,
                calendar.webhookResourceId
              )
            }
            // console.log('updating webhooks in database')
            const _result = await addOrUpdateConnectedCalendar(
              ownerAddress,
              email,
              provider,
              calendars
            )
            // console.log('updated calendar', result)
          }
        })
      }
    }

    return res.status(200).json(result)
  }
}

export default withSessionRoute(handler)
