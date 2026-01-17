import { calendar_v3 } from 'googleapis'
import { DateTime } from 'luxon'
import { Frequency, RRule, RRuleSet, rrulestr } from 'rrule'

import {
  AttendeeStatus,
  DayOfWeek,
  EventStatus,
  Optional,
  UnifiedAttendee,
  UnifiedEvent,
  UnifiedRecurrence,
} from '@/types/Calendar'
import { MeetingRepeat, TimeSlotSource } from '@/types/Meeting'

import { getBaseEventId } from '../calendar_sync_helpers'
import { MeetingPermissions } from '../constants/schedule'
import { isJson } from '../generic_utils'
import { isValidUrl } from '../validations'
import { CalendarServiceHelper } from './calendar.helper'

interface DateTimeTimeZone {
  dateTime: string
  timeZone: string
}

export class GoogleEventMapper {
  /**
   * Converts a Google Calendar Event to a Unified Event
   */
  static toUnified(
    googleEvent: calendar_v3.Schema$Event,
    calendarId: string,
    calendarName: string,
    accountEmail: string,
    isReadOnlyCalendar: boolean = false
  ): UnifiedEvent {
    const permissions: MeetingPermissions[] = []
    const isOrganizer = googleEvent.organizer?.self
    if (googleEvent.guestsCanModify || isOrganizer) {
      permissions.push(MeetingPermissions.EDIT_MEETING)
    }
    if (googleEvent.guestsCanInviteOthers || isOrganizer) {
      permissions.push(MeetingPermissions.INVITE_GUESTS)
    }
    if (googleEvent.guestsCanSeeOtherGuests || isOrganizer) {
      permissions.push(MeetingPermissions.SEE_GUEST_LIST)
    }

    return {
      accountEmail,
      attendees: this.mapAttendees(googleEvent.attendees || []),
      calendarId,
      calendarName,
      description: CalendarServiceHelper.parseDescriptionToRichText(
        googleEvent.description?.trim()
      ),
      end: this.parseDateTime(googleEvent.end!),
      etag: googleEvent.etag,
      id: this.generateInternalId(googleEvent),
      isAllDay: !googleEvent.start?.dateTime, // If no dateTime, it's all-day
      isReadOnlyCalendar,

      lastModified: googleEvent.updated
        ? new Date(googleEvent.updated)
        : new Date(),

      meeting_url: this.getCalendarMeetingUrl(googleEvent) || '',
      permissions,
      providerData: {
        google: {
          anyoneCanAddSelf: googleEvent.anyoneCanAddSelf,
          attachments: googleEvent.attachments,
          colorId: googleEvent.colorId,
          conferenceData: googleEvent.conferenceData,
          eventType: googleEvent.eventType,
          extendedProperties: googleEvent.extendedProperties,
          gadget: googleEvent.gadget,
          guestsCanInviteOthers: googleEvent.guestsCanInviteOthers,
          guestsCanModify: googleEvent.guestsCanModify,
          guestsCanSeeOtherGuests: googleEvent.guestsCanSeeOtherGuests,
          hangoutLink: googleEvent.hangoutLink,
          iCalUID: googleEvent.iCalUID,
          locked: googleEvent.locked,
          originalStartTime: googleEvent.originalStartTime,
          privateCopy: googleEvent.privateCopy,
          recurringEventId: googleEvent.recurringEventId,
          reminders: googleEvent.reminders,
          sequence: googleEvent.sequence,
          source: googleEvent.source,
          transparency: googleEvent.transparency,
          visibility: googleEvent.visibility,
        },
      },
      recurrence: this.mapRecurrence(googleEvent.recurrence),

      source: TimeSlotSource.GOOGLE,
      sourceEventId: googleEvent.id!,
      start: this.parseDateTime(googleEvent.start!, true),
      status: this.mapEventStatus(googleEvent),
      title: googleEvent.summary || '(No title)',
      webLink: googleEvent.htmlLink,
    }
  }

  /**
   * Converts a Unified Event back to Google Calendar Event format
   */
  static fromUnified(unifiedEvent: UnifiedEvent): calendar_v3.Schema$Event {
    const googleData = unifiedEvent.providerData?.google || {}

    const googleEvent: calendar_v3.Schema$Event = {
      anyoneCanAddSelf: googleData.anyoneCanAddSelf,
      attachments: googleData.attachments ?? undefined,
      attendees: this.createGoogleAttendees(unifiedEvent.attendees || []),

      colorId: googleData.colorId,
      conferenceData: googleData.conferenceData ?? undefined,
      description: CalendarServiceHelper.convertHtmlToPlainText(
        unifiedEvent.description || ''
      ),
      end: this.createDateTime(unifiedEvent.end, unifiedEvent.isAllDay),
      eventType: googleData.eventType,
      extendedProperties: googleData.extendedProperties,
      gadget: googleData.gadget,
      guestsCanInviteOthers: googleData.guestsCanInviteOthers,
      guestsCanModify: googleData.guestsCanModify,
      guestsCanSeeOtherGuests: googleData.guestsCanSeeOtherGuests,
      id: unifiedEvent.sourceEventId,

      location: unifiedEvent.meeting_url,
      locked: googleData.locked,
      privateCopy: googleData.privateCopy,
      recurrence: unifiedEvent.recurrence?.providerRecurrence?.google?.rrule,
      reminders: googleData.reminders,
      sequence: googleData.sequence,
      source: googleData.source,
      start: this.createDateTime(unifiedEvent.start, unifiedEvent.isAllDay),
      status: this.mapUnifiedStatusToGoogle(unifiedEvent.status),
      summary: unifiedEvent.title,
      transparency: googleData.transparency,
      visibility: googleData.visibility,
    }

    return googleEvent
  }

  // Helper Methods
  private static getCalendarMeetingUrl(googleEvent: calendar_v3.Schema$Event) {
    const entryPointUrl = googleEvent.conferenceData?.entryPoints?.find(
      ep => ep.uri
    )?.uri
    if (entryPointUrl && isValidUrl(entryPointUrl)) {
      return entryPointUrl
    }
    const hangoutUrl = googleEvent.hangoutLink
    if (hangoutUrl && isValidUrl(hangoutUrl)) {
      return hangoutUrl
    }
    if (googleEvent.location) {
      if (isValidUrl(googleEvent.location)) {
        return googleEvent.location
      }
      // Try to extract URL from location text (e.g., "Meeting at https://zoom.us/j/123456")
      const extractedUrl = this.extractUrlFromText(googleEvent.location)
      if (extractedUrl) {
        return extractedUrl
      }
    }
  }

  private static generateInternalId(
    googleEvent: calendar_v3.Schema$Event
  ): string {
    const extendedProperties = googleEvent.extendedProperties?.private
    const isMeetwithEvent = extendedProperties?.['updatedBy'] === 'meetwith'
    return isMeetwithEvent
      ? extendedProperties.meetingId || getBaseEventId(googleEvent.id!)
      : googleEvent.id!
  }
  private static parseCalendarDateTime(dto: DateTimeTimeZone): DateTime {
    const parsed = DateTime.fromISO(dto.dateTime, { setZone: true })

    return parsed.setZone(dto.timeZone, { keepLocalTime: false })
  }

  private static parseDateTime(
    dateTime: calendar_v3.Schema$EventDateTime,
    isStart?: boolean
  ): Date {
    if (dateTime.dateTime) {
      return this.parseCalendarDateTime({
        dateTime: dateTime.dateTime,
        timeZone: dateTime.timeZone || 'UTC',
      }).toJSDate()
    } else if (dateTime.date) {
      const date = DateTime.fromISO(dateTime.date, {
        zone: dateTime.timeZone || 'UTC',
      })
      if (isStart) {
        return date.startOf('day').toJSDate()
      } else {
        return date.endOf('day').toJSDate()
      }
    }
    return new Date()
  }

  private static mapAttendees(
    googleAttendees: calendar_v3.Schema$EventAttendee[]
  ): UnifiedAttendee[] {
    return googleAttendees.map(attendee => ({
      email: attendee.email!,
      isOrganizer: attendee.organizer || false,
      name: attendee.displayName,
      providerData: {
        google: {
          additionalGuests: attendee.additionalGuests,
          comment: attendee.comment,
          id: attendee.id,
          optional: attendee.optional,
          resource: attendee.resource,
          responseStatus: attendee.responseStatus,
          self: attendee.self,
        },
      },
      status: this.mapAttendeeStatus(attendee.responseStatus),
    }))
  }

  private static mapAttendeeStatus(
    responseStatus?: string | null
  ): AttendeeStatus {
    switch (responseStatus) {
      case 'accepted':
        return AttendeeStatus.ACCEPTED
      case 'declined':
        return AttendeeStatus.DECLINED
      case 'tentative':
        return AttendeeStatus.TENTATIVE
      case 'needsAction':
        return AttendeeStatus.NEEDS_ACTION
      default:
        return AttendeeStatus.NEEDS_ACTION
    }
  }

  private static mapEventStatus(
    googleEvent: calendar_v3.Schema$Event
  ): EventStatus {
    switch (googleEvent.status) {
      case 'confirmed':
        return EventStatus.CONFIRMED
      case 'tentative':
        return EventStatus.TENTATIVE
      case 'cancelled':
        return EventStatus.CANCELLED
      default:
        return EventStatus.CONFIRMED
    }
  }

  private static mapRecurrence(
    recurrence: Optional<string[]>
  ): UnifiedRecurrence | undefined {
    if (!recurrence || recurrence.length === 0) return undefined
    // Google uses RRULE format - parse the first rule
    if (recurrence.some(rec => !rec.startsWith('RRULE:'))) return undefined

    const rrule = rrulestr(recurrence[0])
    const ruleset = new RRuleSet()
    ruleset.rrule(rrule)
    return {
      dayOfMonth: Array.isArray(rrule.options.bymonthday)
        ? rrule.options.bymonthday[0]
        : rrule.options.bymonthday,
      daysOfWeek: rrule.options.byweekday,
      endDate: rrule.options.until,
      excludeDates: ruleset.exdates(),
      frequency: rrule.options.freq,
      interval: rrule.options.interval || 1,
      occurrenceCount: rrule.options.count,

      providerRecurrence: {
        google: {
          rrule: recurrence,
        },
      },
      weekOfMonth: Array.isArray(rrule.options.bysetpos)
        ? rrule.options.bysetpos[0]
        : rrule.options.bysetpos,
    }
  }

  private static parseRRule(rrule: string): Record<string, string> {
    const rules: Record<string, string> = {}
    const parts = rrule.split(';')

    for (const part of parts) {
      const [key, value] = part.split('=')
      if (key && value) {
        rules[key] = value
      }
    }

    return rules
  }

  private static mapGoogleFrequency(freq?: Frequency): MeetingRepeat {
    switch (freq) {
      case Frequency.DAILY:
        return MeetingRepeat.DAILY
      case Frequency.WEEKLY:
        return MeetingRepeat.WEEKLY
      case Frequency.MONTHLY:
        return MeetingRepeat.MONTHLY
      default:
        return MeetingRepeat.NO_REPEAT
    }
  }

  private static mapGoogleDays(byday?: string): DayOfWeek[] | undefined {
    if (!byday) return undefined

    const dayMap: Record<string, DayOfWeek> = {
      FR: DayOfWeek.FRIDAY,
      MO: DayOfWeek.MONDAY,
      SA: DayOfWeek.SATURDAY,
      SU: DayOfWeek.SUNDAY,
      TH: DayOfWeek.THURSDAY,
      TU: DayOfWeek.TUESDAY,
      WE: DayOfWeek.WEDNESDAY,
    }

    // Handle patterns like "MO,WE,FR" or "1MO" (first Monday)
    const days = byday
      .split(',')
      .map(day => {
        // Remove numbers for relative patterns like "1MO", "2TU"
        const cleanDay = day.replace(/^-?\d+/, '')
        return dayMap[cleanDay]
      })
      .filter(Boolean)

    return days.length > 0 ? days : undefined
  }

  private static mapGoogleWeekOfMonth(
    byday?: string,
    bysetpos?: string
  ): number | undefined {
    if (bysetpos) return parseInt(bysetpos)

    if (byday) {
      // Extract number from patterns like "1MO", "2TU", "-1FR" (last Friday)
      const match = byday.match(/^(-?\d+)/)
      if (match) {
        return parseInt(match[1])
      }
    }

    return undefined
  }

  private static parseGoogleUntilDate(until: string): Date {
    // Google UNTIL format: YYYYMMDDTHHMMSSZ
    const year = parseInt(until.substring(0, 4))
    const month = parseInt(until.substring(4, 6)) - 1 // Month is 0-based
    const day = parseInt(until.substring(6, 8))

    if (until.includes('T')) {
      const hour = parseInt(until.substring(9, 11))
      const minute = parseInt(until.substring(11, 13))
      const second = parseInt(until.substring(13, 15))
      return new Date(Date.UTC(year, month, day, hour, minute, second))
    } else {
      return new Date(year, month, day)
    }
  }

  private static parseExdates(recurrence: string[]): Date[] | undefined {
    const exdates: Date[] = []

    for (const rule of recurrence) {
      if (rule.startsWith('EXDATE:')) {
        const dates = rule.substring(7).split(',') // Remove 'EXDATE:' prefix
        for (const dateStr of dates) {
          exdates.push(this.parseGoogleUntilDate(dateStr))
        }
      }
    }

    return exdates.length > 0 ? exdates : undefined
  }

  // Conversion back to Google format methods

  private static createDateTime(
    date: Date,
    isAllDay: boolean
  ): calendar_v3.Schema$EventDateTime {
    if (isAllDay) {
      return {
        date: date.toISOString().split('T')[0], // YYYY-MM-DD format
      }
    } else {
      return {
        dateTime: date.toISOString(),
        timeZone: 'UTC', // You might want to handle timezone conversion
      }
    }
  }

  private static createGoogleAttendees(
    attendees: UnifiedAttendee[]
  ): calendar_v3.Schema$EventAttendee[] {
    return attendees.map(attendee => ({
      additionalGuests: attendee.providerData?.google?.additionalGuests,
      comment: attendee.providerData?.google?.comment,
      displayName: attendee.name,
      email: attendee.email,
      id: attendee.providerData?.google?.id,
      optional: attendee.providerData?.google?.optional,
      organizer: attendee.isOrganizer,
      resource: attendee.providerData?.google?.resource,
      responseStatus: this.mapUnifiedAttendeeStatusToGoogle(attendee.status),
    }))
  }

  private static mapUnifiedAttendeeStatusToGoogle(
    status: AttendeeStatus
  ): string {
    switch (status) {
      case AttendeeStatus.ACCEPTED:
        return 'accepted'
      case AttendeeStatus.DECLINED:
        return 'declined'
      case AttendeeStatus.TENTATIVE:
        return 'tentative'
      case AttendeeStatus.NEEDS_ACTION:
        return 'needsAction'
      default:
        return 'needsAction'
    }
  }

  private static mapUnifiedStatusToGoogle(status?: EventStatus): string {
    switch (status) {
      case EventStatus.CONFIRMED:
        return 'confirmed'
      case EventStatus.TENTATIVE:
        return 'tentative'
      case EventStatus.CANCELLED:
        return 'cancelled'
      default:
        return 'confirmed'
    }
  }

  private static createGoogleRecurrence(
    recurrence: Optional<UnifiedRecurrence>
  ): string[] | undefined {
    if (!recurrence) return undefined

    const rrule = new RRule({
      bymonthday: recurrence.dayOfMonth ? [recurrence.dayOfMonth] : undefined,
      bysetpos: recurrence.weekOfMonth ? [recurrence.weekOfMonth] : undefined,
      byweekday: recurrence.daysOfWeek,
      count: recurrence.occurrenceCount || undefined,
      freq: recurrence.frequency,
      interval: recurrence.interval || 1,
      until: recurrence.endDate || undefined,
    })

    const ruleset = rrule.toString()
    return isJson(ruleset) ? JSON.parse(ruleset) : [ruleset]
  }

  /**
   * Extracts a URL from text that may contain meeting links
   * e.g., "Meeting at https://zoom.us/j/123456" -> "https://zoom.us/j/123456"
   */
  private static extractUrlFromText(text: string): string | null {
    if (!text) return null

    // URL regex pattern to match http/https URLs
    const urlPattern = /(https?:\/\/[^\s<>"]+)/gi
    const matches = text.match(urlPattern)

    if (!matches || matches.length === 0) return null

    // Return the first valid URL found
    for (const match of matches) {
      // Clean up potential trailing punctuation
      const cleanUrl = match.replace(/[.,;!?]+$/, '')
      if (isValidUrl(cleanUrl)) {
        return cleanUrl
      }
    }

    return null
  }

  private static mapDayToGoogle(day: DayOfWeek): string {
    const dayMap: Record<DayOfWeek, string> = {
      [DayOfWeek.SUNDAY]: 'SU',
      [DayOfWeek.MONDAY]: 'MO',
      [DayOfWeek.TUESDAY]: 'TU',
      [DayOfWeek.WEDNESDAY]: 'WE',
      [DayOfWeek.THURSDAY]: 'TH',
      [DayOfWeek.FRIDAY]: 'FR',
      [DayOfWeek.SATURDAY]: 'SA',
    }

    return dayMap[day]
  }

  private static formatGoogleUntilDate(date: Date): string {
    // Format as YYYYMMDDTHHMMSSZ
    const year = date.getUTCFullYear().toString()
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
    const day = date.getUTCDate().toString().padStart(2, '0')
    const hour = date.getUTCHours().toString().padStart(2, '0')
    const minute = date.getUTCMinutes().toString().padStart(2, '0')
    const second = date.getUTCSeconds().toString().padStart(2, '0')

    return `${year}${month}${day}T${hour}${minute}${second}Z`
  }
}

// Additional helper types for Google Calendar extensions
export interface GoogleEventExtensions {
  colorId?: string
  visibility?: string
  transparency?: string
  iCalUID?: string
  sequence?: number
  conferenceData?: calendar_v3.Schema$ConferenceData
  gadget?: calendar_v3.Schema$Event['gadget']
  anyoneCanAddSelf?: boolean
  guestsCanInviteOthers?: boolean
  guestsCanModify?: boolean
  guestsCanSeeOtherGuests?: boolean
  privateCopy?: boolean
  locked?: boolean
  hangoutLink?: string
  eventType?: string
  attachments?: calendar_v3.Schema$EventAttachment[]
  reminders?: calendar_v3.Schema$Event['reminders']
  source?: calendar_v3.Schema$Event['source']
  extendedProperties?: calendar_v3.Schema$Event['extendedProperties']
  originalStartTime?: calendar_v3.Schema$EventDateTime
  recurringEventId?: string
  location?: calendar_v3.Schema$Event['location']
}

// Additional attendee data for Google Calendar
export interface GoogleAttendeeExtensions {
  resource: Optional<boolean>
  optional?: Optional<boolean>
  responseStatus?: Optional<string>
  comment?: Optional<string>
  additionalGuests?: Optional<number>
  id?: Optional<string>
  self?: Optional<boolean>
}
