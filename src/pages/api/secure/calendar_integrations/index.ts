/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { ConnectedCalendar } from '@/types/CalendarConnections'
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

    // get all connected calendars
    const connectedCalendars = await getConnectedCalendars(
      req.session.account!.address,
      { syncOnly: true, activeOnly: false }
    )

    // For google calendars
    if (provider.toLowerCase() === 'google') {
      const googleCalendar = connectedCalendars.find(
        (k: ConnectedCalendar) =>
          k.provider.toLowerCase() === provider.toLowerCase()
      )
      if (googleCalendar) {
        // filter for calendar where webhook is true
        calendars.forEach(async ({ webhook, calendarId }: any) => {
          if (webhook) {
            const ownerAddress = req.session.account!.address
            console.log('PUT', email, calendarId, ownerAddress)
            const calendar = calendars.find(
              (k: any) =>
                k.calendarId.toLowerCase() === calendarId.toLowerCase()
            )

            if (calendar) {
              const integration = getConnectedCalendarIntegration(
                ownerAddress,
                email,
                googleCalendar.provider,
                googleCalendar.payload
              )
              console.log('setup calendar webhook')

              // removing a webhook
              // if (integration && integration.stopChannel) {
              //   console.log('stopping calendar webhook')
              //   const resourceId = 'Vx-_Bil7EmsSwbBnj_y-Pz6hYw8'
              //   await integration.stopChannel(ownerAddress, resourceId)
              // }
              await integration.setupCalendarWebhook(calendarId, ownerAddress)

              // fetch all events
              // if (integration.getEvents) {
              //   console.log('get events')
              //   await integration.getGoogleEvents(calendarId)
              // }
            }
          }
        })
      }
    }

    return res.status(200).json(result)
  }
}

export default withSessionRoute(handler)
