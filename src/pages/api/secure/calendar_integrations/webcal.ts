/** biome-ignore-all lint/suspicious/noExplicitAny: Implicit typing for Unknown calendar types */
import * as Sentry from '@sentry/nextjs'
import ICAL from 'ical.js'
import type { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { CalendarSyncInfo } from '@/types/CalendarConnections'
import { TimeSlotSource } from '@/types/Meeting'
import { WebcalRequestBody } from '@/types/Requests'
import {
  addOrUpdateConnectedCalendar,
  connectedCalendarExists,
  countCalendarIntegrations,
  getAccountFromDB,
  isProAccountAsync,
  uploadIcsFile,
} from '@/utils/database'
import { CalendarIntegrationLimitExceededError } from '@/utils/errors'
import { SIZE_5_MB, withFileUpload } from '@/utils/uploads'
import { isValidEmail } from '@/utils/validations'

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
  const accountAddress = req.session.account.address
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
      const isPro = await isProAccountAsync(accountAddress)

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

      if (!isPro) {
        const existingIntegration = await connectedCalendarExists(
          accountAddress,
          validationResult.userEmail,
          TimeSlotSource.WEBCAL
        )

        if (!existingIntegration) {
          const integrationCount = await countCalendarIntegrations(
            accountAddress
          )
          if (integrationCount >= 2) {
            throw new CalendarIntegrationLimitExceededError()
          }
        }
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

      await addOrUpdateConnectedCalendar(
        accountAddress,
        validationResult.userEmail,
        TimeSlotSource.WEBCAL,
        calendars,
        { url: url } // Store the URL in payload
      )

      return res.status(200).json({
        calendarName: body.title,
        connected: true,
        email: validationResult.userEmail,
        eventCount: validationResult.eventCount,
      })
    } catch (error) {
      console.error(error)
      Sentry.captureException(error, {
        extra: { accountAddress, url: url },
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
      console.error(error)
      Sentry.captureException(error, {
        extra: { accountAddress, url: body.url },
      })

      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid ICS feed',
        valid: false,
      })
    }
  }

  return res.status(405).json({ message: 'Method not allowed' })
}

/**
 * Validates a webcal/ICS feed URL
 * - Checks if URL is accessible
 * - Validates ICS format
 * - Searches for user's email in calendar events
 * - Extracts calendar metadata
 */
export async function validateWebcalFeed(
  url: string,
  title: string
): Promise<{
  valid: boolean
  error?: string
  calendarName?: string
  eventCount?: number
  userEmail?: string
}> {
  try {
    const feedUrl = url.replace(/^webcal:\/\//i, 'https://')

    // Validate URL format
    try {
      new URL(feedUrl)
    } catch {
      return {
        error: 'Invalid URL format',
        valid: false,
      }
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    let response: Response
    try {
      response = await fetch(feedUrl, {
        headers: {
          Accept: 'text/calendar, application/ics, text/plain',
          'User-Agent': 'MeetWithWallet/1.0',
        },
        method: 'GET',
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      return {
        error: `Feed unavailable: ${response.status} ${response.statusText}`,
        valid: false,
      }
    }

    const contentType = response.headers.get('content-type')
    if (
      contentType &&
      !contentType.includes('text/calendar') &&
      !contentType.includes('text/plain') &&
      !contentType.includes('application/ics')
    ) {
      console.warn(`Unexpected content-type: ${contentType}`)
    }

    const icsData = await response.text()

    if (!icsData || icsData.trim().length === 0) {
      return {
        error: 'Feed is empty',
        valid: false,
      }
    }

    let jcalData: any
    try {
      jcalData = ICAL.parse(icsData)
    } catch (parseError) {
      return {
        error: `Invalid ICS format: ${
          parseError instanceof Error ? parseError.message : 'Parse failed'
        }`,
        valid: false,
      }
    }

    const vcalendar = new ICAL.Component(jcalData)

    if (vcalendar.name !== 'vcalendar') {
      return {
        error: 'Not a valid VCALENDAR resource',
        valid: false,
      }
    }
    const vevents = vcalendar.getAllSubcomponents('vevent')
    const eventCount = vevents.length

    if (eventCount === 0) {
      console.warn('Calendar feed has no events')
    }

    const calendarName =
      vcalendar.getFirstPropertyValue('x-wr-calname') ||
      vcalendar.getFirstPropertyValue('name') ||
      title
    const userEmail = await findUserEmailInCalendar(
      vcalendar,
      vevents,
      calendarName as string
    )

    return {
      eventCount,
      userEmail,
      valid: true,
    }
  } catch (error) {
    Sentry.captureException(error, {
      extra: { url },
    })

    return {
      error:
        error instanceof Error
          ? error.message
          : 'Failed to validate calendar feed',
      valid: false,
    }
  }
}

/**
 * Searches for user's email in calendar events
 * Checks ORGANIZER and ATTENDEE fields
 */
async function findUserEmailInCalendar(
  vcalendar: any,
  vevents: any[],
  calendarName: string
): Promise<string | undefined> {
  const possibleEmails = new Set<string>()

  for (const vevent of vevents) {
    try {
      const event = new ICAL.Event(vevent)

      // Check organizer
      if (event.organizer) {
        const organizerEmail = extractEmailFromICalAddress(event.organizer)
        if (organizerEmail) {
          possibleEmails.add(organizerEmail.toLowerCase())
        }
      }

      // Check attendees
      if (event.attendees && event.attendees.length > 0) {
        for (const attendee of event.attendees) {
          const attendeeValues = attendee.getValues()
          const attendeeEmail = extractEmailFromAttendeeValues(attendeeValues)
          if (attendeeEmail) {
            possibleEmails.add(attendeeEmail.toLowerCase())
          }
        }
      }

      // CRITICAL: Check VALARM components for ATTENDEE (Proton Calendar format)
      const valarms = vevent.getAllSubcomponents('valarm')
      for (const valarm of valarms) {
        const attendeeProp = valarm.getFirstProperty('attendee')
        if (attendeeProp) {
          const attendeeValue = attendeeProp.getFirstValue()
          const email = extractEmailFromICalAddress(attendeeValue)
          if (email) {
            possibleEmails.add(email.toLowerCase())
          }
        }
      }
    } catch (_error) {
      continue
    }
  }

  if (possibleEmails.size === 1) {
    return Array.from(possibleEmails)[0]
  } else if (possibleEmails.size > 1) {
    return Array.from(possibleEmails)[0]
  } else {
    return calendarName
  }

  return undefined
}

/**
 * Extracts email from iCal address format (mailto:email@example.com)
 */
function extractEmailFromICalAddress(address: string): string | undefined {
  if (!address) return undefined

  const mailtoMatch = address.match(/mailto:([^\s]+)/i)
  if (mailtoMatch) {
    return mailtoMatch[1]
  }

  // If it's already just an email
  if (isValidEmail(address)) {
    return address
  }

  return undefined
}

/**
 * Extracts email from attendee values array
 */
function extractEmailFromAttendeeValues(values: string[]): string | undefined {
  if (!values || values.length === 0) return undefined

  for (const value of values) {
    const email = extractEmailFromICalAddress(value)
    if (email) return email
  }

  return undefined
}

export default withSessionRoute(
  withFileUpload(handler, {
    allowedMimeTypes: ['text/calendar', 'application/ics'],
    maxFileSize: SIZE_5_MB,
  })
)
