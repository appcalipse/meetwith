/* eslint-disable no-restricted-syntax */
import { NextApiRequest, NextApiResponse } from 'next'

import {
  CalendarSyncInfo,
  ConnectedCalendar,
} from '@/types/CalendarConnections'
import { GoogleCalendarWebhookRequest } from '@/types/GoogleEvent'
import { getConnectedCalendars } from '@/utils/database'
import { getConnectedCalendarIntegration } from '@/utils/services/connected_calendars.factory'

/**
 * Google Calendar Webhook Handler
 *
 * This endpoint receives webhook notifications from Google Calendar
 * and logs the incoming data for processing.
 *
 * @param req - The incoming request from Google
 * @param res - The response object
 */
const handler = async (
  req: GoogleCalendarWebhookRequest | NextApiRequest,
  res: NextApiResponse
) => {
  // Only allow POST requests for the webhook
  if (req.method === 'GET') {
    return res.status(200).json({ message: 'webhook route' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Log the headers (important for verification of Google webhook)
    const channelId = req.headers['x-goog-channel-id']
    const resourceId = req.headers['x-goog-resource-id']

    const ownerAddress = (channelId as string)?.replace('id-', '').trim() || ''
    const allCalendars = await getConnectedCalendars(ownerAddress, {
      syncOnly: true,
      activeOnly: false,
    })
    const googleCalendar = allCalendars.find(
      (k: ConnectedCalendar) => k.provider.toLowerCase() === 'google'
    )
    if (googleCalendar) {
      const calendar = googleCalendar.calendars.find(
        (c: CalendarSyncInfo) => c.webhookResourceId === resourceId
      )
      const integration = getConnectedCalendarIntegration(
        ownerAddress,
        googleCalendar.email,
        googleCalendar.provider,
        googleCalendar.payload
      )
      if (calendar && integration && integration.syncCalendarEvents) {
        await integration.syncCalendarEvents(
          ownerAddress,
          calendar.calendarId,
          2
        )
      }
    }

    // Always respond quickly to Google to acknowledge receipt
    res.status(200).json({
      status: 'success',
      message: 'Google Calendar webhook received and processed',
    })
  } catch (error) {
    console.error('Error processing Google Calendar webhook:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process webhook',
    })
  }
}

export default handler

// Configure the API route to handle larger payloads if needed
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}
