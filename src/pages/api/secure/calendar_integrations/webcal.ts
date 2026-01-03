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
} from '@/utils/database'
import { CalendarIntegrationLimitExceededError } from '@/utils/errors'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session.account) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  const body: WebcalRequestBody = req.body
  const accountAddress = req.session.account.address

  if (!body.url) {
    return res.status(400).json({ message: 'Calendar URL is required' })
  }

  if (req.method === 'POST') {
    try {
      const account = await getAccountFromDB(accountAddress)

      const isPro = await isProAccountAsync(accountAddress)

      const validationResult = await validateWebcalFeed(
        body.url!,
        body.email,
        account
      )

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
          if (integrationCount >= 1) {
            throw new CalendarIntegrationLimitExceededError()
          }
        }
      }

      const calendars: CalendarSyncInfo[] = [
        {
          calendarId: body.url!,
          name: validationResult.calendarName || 'External Calendar',
          color: undefined,
          sync: false, // Webcal is read-only, no sync
          enabled: true,
          isReadOnly: true,
        },
      ]

      await addOrUpdateConnectedCalendar(
        accountAddress,
        validationResult.userEmail,
        TimeSlotSource.WEBCAL,
        calendars,
        { url: body.url } // Store the URL in payload
      )

      return res.status(200).json({
        connected: true,
        email: validationResult.userEmail,
        calendarName: validationResult.calendarName,
        eventCount: validationResult.eventCount,
      })
    } catch (error) {
      Sentry.captureException(error, {
        extra: { accountAddress, url: body.url },
      })

      if (error instanceof CalendarIntegrationLimitExceededError) {
        return res.status(403).json({ message: error.message })
      }

      return res.status(500).json({
        message: 'Failed to connect webcal feed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  } else if (req.method === 'PUT') {
    try {
      const account = await getAccountFromDB(accountAddress)
      const validationResult = await validateWebcalFeed(
        body.url!,
        body.email,
        account
      )

      if (!validationResult.valid) {
        return res.status(400).json({
          valid: false,
          error: validationResult.error,
        })
      }

      return res.status(200).json({
        valid: true,
        calendarName: validationResult.calendarName,
        eventCount: validationResult.eventCount,
        userEmail: validationResult.userEmail,
        emailFound: !!validationResult.userEmail,
        url: body.url,
      })
    } catch (error) {
      Sentry.captureException(error, {
        extra: { accountAddress, url: body.url },
      })

      return res.status(400).json({
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid ICS feed',
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
async function validateWebcalFeed(
  url: string,
  providedEmail?: string,
  account?: any
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
        valid: false,
        error: 'Invalid URL format',
      }
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    let response: Response
    try {
      response = await fetch(feedUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'MeetWithWallet/1.0',
          Accept: 'text/calendar, application/ics, text/plain',
        },
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      return {
        valid: false,
        error: `Feed unavailable: ${response.status} ${response.statusText}`,
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
        valid: false,
        error: 'Feed is empty',
      }
    }

    let jcalData: any
    try {
      jcalData = ICAL.parse(icsData)
    } catch (parseError) {
      return {
        valid: false,
        error: `Invalid ICS format: ${
          parseError instanceof Error ? parseError.message : 'Parse failed'
        }`,
      }
    }

    const vcalendar = new ICAL.Component(jcalData)

    if (vcalendar.name !== 'vcalendar') {
      return {
        valid: false,
        error: 'Not a valid VCALENDAR resource',
      }
    }

    const calendarName =
      vcalendar.getFirstPropertyValue('x-wr-calname')?.toString() ||
      vcalendar.getFirstPropertyValue('name')?.toString() ||
      'External Calendar'

    const vevents = vcalendar.getAllSubcomponents('vevent')
    const eventCount = vevents.length

    if (eventCount === 0) {
      console.warn('Calendar feed has no events')
    }

    let userEmail = providedEmail

    if (!userEmail && account) {
      userEmail = await findUserEmailInCalendar(vcalendar, vevents, account)
    }

    return {
      valid: true,
      calendarName,
      eventCount,
      userEmail,
    }
  } catch (error) {
    Sentry.captureException(error, {
      extra: { url },
    })

    return {
      valid: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to validate calendar feed',
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
  account: any
): Promise<string | undefined> {
  const possibleEmails = new Set<string>()

  // Get user's known emails from account preferences if available
  const accountEmail = account.preferences?.name // Sometimes stored here
  if (accountEmail && isValidEmail(accountEmail)) {
    possibleEmails.add(accountEmail.toLowerCase())
  }

  // Search through all events
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
    } catch (error) {
      // Skip malformed events
      continue
    }
  }

  // Return the most common email (simple heuristic)
  // In a real scenario, you might want to prompt the user to select
  if (possibleEmails.size === 1) {
    return Array.from(possibleEmails)[0]
  } else if (possibleEmails.size > 1) {
    // Return first valid email (could be improved with better logic)
    return Array.from(possibleEmails)[0]
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

/**
 * Simple email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export default withSessionRoute(handler)
