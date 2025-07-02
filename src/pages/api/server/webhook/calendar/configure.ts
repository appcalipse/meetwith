import { NextApiRequest, NextApiResponse } from 'next'

import { TimeSlotSource } from '@/types/Meeting'
import {
  getConnectedCalendars,
  updateAllRecurringSlots,
} from '@/utils/database'
import { getConnectedCalendarIntegration } from '@/utils/services/connected_calendars.factory'

export default async function recurrenceSync(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const calendarPromises = []
      const calendars = await getConnectedCalendars(
        '0x546f67e57a3980f41251b1cace8abd10d764cc3f',
        {
          activeOnly: true,
          syncOnly: true,
        }
      )
      if (calendars.length === 0) {
        return res.status(404).json({ error: 'No connected calendars found' })
      }
      for (const calendar of calendars) {
        if (calendar.provider !== TimeSlotSource.GOOGLE) return
        const integration = getConnectedCalendarIntegration(
          calendar.account_address,
          calendar.email,
          calendar.provider,
          calendar.payload
        )

        for (const cal of calendar.calendars.filter(c => c.enabled && c.sync)) {
          calendarPromises.push(
            (async () => {
              const { calendarId, channelId, expiration, resourceId } =
                await integration.setWebhookUrl(
                  'https://webhook.site/9e0b3d97-9e1b-4f74-b1ba-13ae510b2456',
                  cal.calendarId
                )
            })()
          )
        }
      }
      const result = await Promise.all(calendarPromises)
      return res.status(200).json('OK')
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message })
    }
  }

  return res.status(404).send('Not found')
}
