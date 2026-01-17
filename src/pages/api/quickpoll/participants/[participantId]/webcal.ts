/** biome-ignore-all lint/suspicious/noExplicitAny: Implicit typing for Unknown calendar types */
import * as Sentry from '@sentry/nextjs'
import ICAL from 'ical.js'
import type { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { validateWebcalFeed } from '@/pages/api/secure/calendar_integrations/webcal'
import { CalendarSyncInfo } from '@/types/CalendarConnections'
import { TimeSlotSource } from '@/types/Meeting'
import { WebcalRequestBody } from '@/types/Requests'
import {
  addOrUpdateConnectedCalendar,
  connectedCalendarExists,
  countCalendarIntegrations,
  getAccountFromDB,
  isProAccountAsync,
  saveQuickPollCalendar,
  uploadIcsFile,
} from '@/utils/database'
import { CalendarIntegrationLimitExceededError } from '@/utils/errors'
import { SIZE_5_MB, withFileUpload } from '@/utils/uploads'

export const config = {
  api: {
    bodyParser: false,
  },
}
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session.account) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  const body: WebcalRequestBody = req.body
  const participantId = req.query.participantId as string
  const { resource } = req.body?.files

  if (!body.url && !resource) {
    return res.status(400).json({ message: 'Calendar URL is required' })
  }
  let url
  if (body.url) {
    url = body.url
  } else {
    const { filename, buffer, mimeType } = resource
    url = await uploadIcsFile(filename, buffer, mimeType)
  }
  if (!url) {
    return res.status(400).json({ message: 'Calendar URL is required' })
  }
  if (req.method === 'POST') {
    try {
      const validationResult = await validateWebcalFeed(url, body.title)

      if (!validationResult.valid) {
        return res.status(400).json({
          message: validationResult.error || 'Invalid ICS feed',
        })
      }

      if (!validationResult.userEmail) {
        return res.status(400).json({
          message:
            'Could not find your email address in the calendar feed. Please provide your email address manually.',
          requiresEmail: true,
        })
      }

      const calendars: CalendarSyncInfo[] = [
        {
          calendarId: url,
          color: undefined,
          enabled: true,
          isReadOnly: true,
          name: body.title || 'External Calendar',
          sync: false, // Webcal is read-only, no sync
        },
      ]

      await saveQuickPollCalendar(
        participantId,
        validationResult.userEmail,
        TimeSlotSource.WEBCAL,
        { url: url }, // Store the URL in payload
        calendars
      )

      return res.status(200).json({
        calendarName: body.title,
        connected: true,
        email: validationResult.userEmail,
        eventCount: validationResult.eventCount,
      })
    } catch (error) {
      Sentry.captureException(error, {
        extra: { participantId, url: url },
      })

      if (error instanceof CalendarIntegrationLimitExceededError) {
        return res.status(403).json({ message: error.message })
      }

      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to connect webcal feed',
      })
    }
  } else if (req.method === 'PUT') {
    try {
      const validationResult = await validateWebcalFeed(body.url!, body.title)

      if (!validationResult.valid) {
        return res.status(400).json({
          error: validationResult.error,
          valid: false,
        })
      }

      return res.status(200).json({
        calendarName: validationResult.calendarName,
        emailFound: !!validationResult.userEmail,
        eventCount: validationResult.eventCount,
        url: body.url,
        userEmail: validationResult.userEmail,
        valid: true,
      })
    } catch (error) {
      Sentry.captureException(error, {
        extra: { participantId, url: body.url },
      })

      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid ICS feed',
        valid: false,
      })
    }
  }

  return res.status(405).json({ message: 'Method not allowed' })
}

export default withFileUpload(handler, {
  allowedMimeTypes: ['text/calendar', 'application/ics'],
  maxFileSize: SIZE_5_MB,
})
