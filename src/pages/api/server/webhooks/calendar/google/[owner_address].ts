/* eslint-disable no-restricted-syntax */
import { NextApiRequest, NextApiResponse } from 'next'

import {
  GoogleCalendarPushNotification,
  GoogleCalendarWebhookRequest,
} from '@/types/GoogleEvent'

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
    console.log(
      '#################################### received a webhook ######## '
    )
    console.log('Webhook Headers:', req.headers)
    const channelId = req.headers['x-goog-channel-id']
    const resourceId = req.headers['x-goog-resource-id']
    const resourceState = req.headers['x-goog-resource-state']

    console.log(req)

    console.log('Channel ID:', channelId)
    console.log('Resource ID:', resourceId)
    console.log('Resource State:', resourceState)

    // Log the full request body
    console.log('Webhook Payload:', req.body)

    // Parse the data as our defined interface
    const notification = req.body as GoogleCalendarPushNotification

    // Process the calendar event if it exists
    if (notification.event) {
      const event = notification.event
      console.log('Event ID:', event.id)
      console.log('Event Summary:', event.summary)
      console.log('Event Status:', event.status)
      console.log('Start Time:', event.start)
      console.log('End Time:', event.end)

      // Here you would add your business logic to handle the event
      // e.g., update your database, send notifications, etc.
    } else {
      console.log('No event data in this notification')
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
