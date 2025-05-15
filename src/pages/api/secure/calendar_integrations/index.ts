/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Time } from '@faker-js/faker/time'
import type { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
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
      calendars.map(it => ({
        provider: it.provider,
        email: it.email,
        calendars: it.calendars,
      }))
    )
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
          const webhookUrl =
            'https://6683-2401-4900-8842-1889-d814-c1ce-c4c3-2883.ngrok-free.app/api'

          const integration = getConnectedCalendarIntegration(
            ownerAddress,
            email,
            googleCalendar.provider,
            googleCalendar.payload
          )
          // if (integration && integration.stopChannel) {
          //   await integration.stopChannel(
          //     // calendar.webhookId || '',
          //     // calendar.webhookResourceId || ''
          //     'id-0x2b8ef56fb6777964e83e183fa3076bf553f1822d',
          //     'Vx-_Bil7EmsSwbBnj_y-Pz6hYw8'
          //   )
          // }

          // const currentCalendar = googleCalendar.calendars.find(
          //   (k: CalendarSyncInfo) => k.calendarId === calendarId
          // )

          if (webhook) {
            console.log('setup calendar webhook')
            calendar.webhook = true
            calendar.webhookType = TimeSlotSource.GOOGLE

            if (integration) {
              const resp = await integration.setupCalendarWebhook(
                calendarId,
                ownerAddress,
                webhookUrl
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
                calendar.webhookResourceId || 'Vx-_Bil7EmsSwbBnj_y-Pz6hYw8'
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
