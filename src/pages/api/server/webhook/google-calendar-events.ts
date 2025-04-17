/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-restricted-syntax */
// pages/api/calendar-webhook.ts (adjust path as needed)

import * as Sentry from '@sentry/nextjs' // Optional
import { NextApiRequest, NextApiResponse } from 'next'

import { processWebhookNotification } from '@/utils/services/calendar.sync.service'

// Define expected header types more explicitly
interface GoogleWebhookHeaders {
  channelId?: string | string[]
  resourceId?: string | string[]
  resourceState?: string | string[]
  messageNumber?: string | string[]
  channelToken?: string | string[]
  resourceUri?: string | string[]
  changed?: string | string[]
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    console.warn('Webhook received non-POST request method:', req.method)
    Sentry.captureMessage('Webhook received non-POST request', {
      extra: { method: req.method },
    })
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Extract headers defensively
  const headers: GoogleWebhookHeaders = {
    channelId: req.headers['x-goog-channel-id'] || undefined,
    resourceId: req.headers['x-goog-resource-id'] || undefined,
    resourceState: req.headers['x-goog-resource-state'] || undefined,
    messageNumber: req.headers['x-goog-message-number'] || undefined,
    channelToken: req.headers['x-goog-channel-token'] || undefined, // Optional
    resourceUri: req.headers['x-goog-resource-uri'] || undefined,
    changed: req.headers['x-goog-changed'] || undefined, // Optional
  }

  // Log essential info immediately
  console.log(
    `Received webhook POST. Channel: ${headers.channelId || 'N/A'}, State: ${
      headers.resourceState || 'N/A'
    }, Resource: ${headers.resourceId || 'N/A'}`
  )

  // --- IMPORTANT: Acknowledge Google Quickly ---
  // Send 200 OK immediately before doing any heavy processing.
  res.status(200).json({
    success: true,
    message: 'Webhook received and acknowledged. Processing initiated.',
  })
  // --- End Immediate Acknowledgement ---

  // --- Trigger Asynchronous Processing ---
  // Use setImmediate for quick release. Replace with a job queue (BullMQ, etc.) for production.
  setImmediate(() => {
    // Pass the extracted headers to the processing function
    processWebhookNotification(headers).catch((err: any) => {
      // Catch unexpected errors *during the invocation* of the async task
      // Errors *within* processWebhookNotification should be handled inside it
      console.error('FATAL: Error invoking background webhook processing:', err)
      Sentry.captureException(err, { tags: { webhook_invocation: 'failed' } })
    })
  })

  // The response has already been sent.
}

export default handler
