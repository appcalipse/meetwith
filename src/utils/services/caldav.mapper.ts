/** biome-ignore-all lint/suspicious/noExplicitAny: Implicit typing */
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
import { CalendarServiceHelper } from './calendar.helper'

// Types for WebDAV/CalDAV events (based on your existing code)
export interface WebDAVEvent {
  uid: string
  etag?: string
  url: string
  summary: string
  description?: string
  providerId?: string
  location?: string
  sequence?: number
  calId?: string
  calName?: string
  accountEmail?: string
  startDate: Date
  endDate: Date
  duration?: {
    weeks?: number
    days?: number
    hours?: number
    minutes?: number
    seconds?: number
    isNegative?: boolean
  }
  organizer?: string
  attendees?: string[][]
  recurrenceId: Optional<string>
  timezone?: string
  status?: string
  transp?: string // TRANSPARENT or OPAQUE
  class?: string // PUBLIC, PRIVATE, CONFIDENTIAL
  created?: Optional<Date | string>
  lastModified?: string
  rrule: Optional<string>
  exdate?: Date[]
}

export class WebDAVEventMapper {
  /**
   * Converts a WebDAV/CalDAV Event to a Unified Event
   */
  static toUnified(
    webdavEvent: WebDAVEvent,
    calendarId: string,
    calendarName: string,
    accountEmail: string,
    isReadOnlyCalendar: boolean = false
  ): UnifiedEvent {
    const isOrganizer = webdavEvent.organizer
      ? webdavEvent.organizer.includes(accountEmail)
      : false
    const permissions: MeetingPermissions[] = [
      MeetingPermissions.SEE_GUEST_LIST,
    ]
    if (isOrganizer) {
      permissions.push(MeetingPermissions.INVITE_GUESTS)
      permissions.push(MeetingPermissions.EDIT_MEETING)
    }

    return {
      accountEmail,
      attendees: this.mapAttendees(webdavEvent.attendees || []),
      calendarId,
      calendarName,
      description: CalendarServiceHelper.parseDescriptionToRichText(
        webdavEvent.description?.trim()
      ),
      end: webdavEvent.endDate,
      etag: webdavEvent.etag || null,
      id: this.generateInternalId(webdavEvent),
      isAllDay: this.isAllDayEvent(webdavEvent.startDate, webdavEvent.endDate),
      isReadOnlyCalendar,
      lastModified: new Date(webdavEvent.lastModified || new Date()),

      meeting_url: webdavEvent.location || null,
      permissions,

      providerData: {
        webdav: {
          duration: webdavEvent.duration,
          organizer: webdavEvent.organizer,
          recurrenceId: webdavEvent.recurrenceId,
          rrule: webdavEvent.rrule,
          sequence: webdavEvent.sequence,
          timezone: webdavEvent.timezone,
          url: webdavEvent.url,
        },
      },
      recurrence: this.mapRecurrence(webdavEvent),

      source: TimeSlotSource.WEBDAV,
      sourceEventId: webdavEvent.uid,
      start: webdavEvent.startDate,
      status: this.mapEventStatus(webdavEvent.status),
      title: webdavEvent.summary || '(No title)',
      webLink: webdavEvent.url,
    }
  }

  /**
   * Converts a Unified Event back to WebDAV/CalDAV Event format
   */
  static fromUnified(unifiedEvent: UnifiedEvent): WebDAVEvent {
    const webdavData = unifiedEvent.providerData?.webdav

    return {
      attendees: this.createWebDAVAttendees(unifiedEvent.attendees || []),
      description: unifiedEvent.description || undefined,
      duration: webdavData?.duration,
      endDate: unifiedEvent.end,

      // WebDAV-specific fields
      etag: unifiedEvent.etag || undefined,
      lastModified: unifiedEvent?.lastModified.toISOString(),
      location: unifiedEvent.meeting_url || undefined,
      organizer: webdavData?.organizer,
      recurrenceId: webdavData?.recurrenceId,
      rrule: unifiedEvent.recurrence?.providerRecurrence?.webdav?.rrule,
      sequence: webdavData?.sequence,
      startDate: unifiedEvent.start,
      status: this.mapUnifiedStatusToWebDAV(unifiedEvent.status),
      summary: unifiedEvent.title,
      timezone: webdavData?.timezone,
      uid: unifiedEvent.sourceEventId,
      url: webdavData?.url || '',
    }
  }

  // Helper Methods

  private static generateInternalId(webdavEvent: WebDAVEvent): string {
    const providerId = webdavEvent.providerId
    if (providerId === '-//Meetwith//EN') {
      return getBaseEventId(webdavEvent.uid)
    }
    return webdavEvent.uid
  }

  private static isAllDayEvent(startDate: Date, endDate: Date): boolean {
    const diffMs = endDate.getTime() - startDate.getTime()
    const oneDayMs = 86_400_000
    return diffMs >= oneDayMs && diffMs % oneDayMs === 0
  }

  private static mapAttendees(webdavAttendees: any[]): UnifiedAttendee[] {
    if (!webdavAttendees || !Array.isArray(webdavAttendees)) return []

    return webdavAttendees
      .map(attendee => {
        // WebDAV attendees might be in various formats
        const email = this.extractEmailFromAttendee(attendee)
        const name = this.extractNameFromAttendee(attendee)
        const status = this.extractStatusFromAttendee(attendee)
        const role = this.extractRoleFromAttendee(attendee)

        return {
          email: email || '',
          isOrganizer: role === 'CHAIR' || role === 'organizer',
          name: name || null,
          providerData: {
            webdav: {
              cn: this.extractCnFromAttendee(attendee),
              cutype: this.extractCutypeFromAttendee(attendee),
              delegatedFrom: this.extractDelegatedFromAttendee(attendee),
              delegatedTo: this.extractDelegatedToAttendee(attendee),
              role,
              rsvp: this.extractRsvpFromAttendee(attendee),
              sentBy: this.extractSentByFromAttendee(attendee),
            },
          },
          status: this.mapAttendeeStatus(status),
        }
      })
      .filter(attendee => attendee.email) // Filter out invalid attendees
  }

  private static extractEmailFromAttendee(attendee: any): string | null {
    if (typeof attendee === 'string') {
      // Format: "mailto:email@domain.com" or just "email@domain.com"
      return attendee.replace(/^mailto:/i, '').trim()
    }

    if (Array.isArray(attendee) && attendee.length > 0) {
      // First element might be the email
      const email = attendee.find(
        item =>
          typeof item === 'string' &&
          (item.includes('@') || item.startsWith('mailto:'))
      )
      return email ? email.replace(/^mailto:/i, '').trim() : null
    }

    if (attendee && typeof attendee === 'object') {
      return attendee.email || attendee.value || attendee.cal_address || null
    }

    return null
  }

  private static extractNameFromAttendee(attendee: any): string | null {
    if (Array.isArray(attendee)) {
      // Look for CN parameter
      const cnParam = attendee.find(
        item => typeof item === 'string' && item.toLowerCase().startsWith('cn=')
      )
      if (cnParam) {
        return cnParam.substring(3).replace(/"/g, '').trim()
      }
    }

    if (attendee && typeof attendee === 'object') {
      return attendee.name || attendee.cn || attendee.commonName || null
    }

    return null
  }

  private static extractStatusFromAttendee(attendee: any): string | null {
    if (Array.isArray(attendee)) {
      const statusParam = attendee.find(
        item =>
          typeof item === 'string' && item.toLowerCase().startsWith('partstat=')
      )
      if (statusParam) {
        return statusParam.substring(9).toUpperCase()
      }
    }

    if (attendee && typeof attendee === 'object') {
      return attendee.partstat || attendee.status || null
    }

    return null
  }

  private static extractRoleFromAttendee(attendee: any): string | null {
    if (Array.isArray(attendee)) {
      const roleParam = attendee.find(
        item =>
          typeof item === 'string' && item.toLowerCase().startsWith('role=')
      )
      if (roleParam) {
        return roleParam.substring(5).toUpperCase()
      }
    }

    if (attendee && typeof attendee === 'object') {
      return attendee.role || null
    }

    return null
  }

  private static extractCutypeFromAttendee(attendee: any): string | null {
    if (Array.isArray(attendee)) {
      const cutypeParam = attendee.find(
        item =>
          typeof item === 'string' && item.toLowerCase().startsWith('cutype=')
      )
      if (cutypeParam) {
        return cutypeParam.substring(7).toUpperCase()
      }
    }
    return attendee?.cutype || null
  }

  private static extractRsvpFromAttendee(attendee: any): boolean | null {
    if (Array.isArray(attendee)) {
      const rsvpParam = attendee.find(
        item =>
          typeof item === 'string' && item.toLowerCase().startsWith('rsvp=')
      )
      if (rsvpParam) {
        return rsvpParam.substring(5).toUpperCase() === 'TRUE'
      }
    }
    return attendee?.rsvp || null
  }

  private static extractDelegatedFromAttendee(attendee: any): string | null {
    if (Array.isArray(attendee)) {
      const param = attendee.find(
        item =>
          typeof item === 'string' &&
          item.toLowerCase().startsWith('delegated-from=')
      )
      if (param) {
        return param.substring(15).replace(/"/g, '').trim()
      }
    }
    return attendee?.delegatedFrom || null
  }

  private static extractDelegatedToAttendee(attendee: any): string | null {
    if (Array.isArray(attendee)) {
      const param = attendee.find(
        item =>
          typeof item === 'string' &&
          item.toLowerCase().startsWith('delegated-to=')
      )
      if (param) {
        return param.substring(13).replace(/"/g, '').trim()
      }
    }
    return attendee?.delegatedTo || null
  }

  private static extractSentByFromAttendee(attendee: any): string | null {
    if (Array.isArray(attendee)) {
      const param = attendee.find(
        item =>
          typeof item === 'string' && item.toLowerCase().startsWith('sent-by=')
      )
      if (param) {
        return param.substring(8).replace(/"/g, '').trim()
      }
    }
    return attendee?.sentBy || null
  }

  private static extractCnFromAttendee(attendee: any): string | null {
    return this.extractNameFromAttendee(attendee)
  }

  private static mapAttendeeStatus(status: string | null): AttendeeStatus {
    if (!status) return AttendeeStatus.NEEDS_ACTION

    switch (status.toUpperCase()) {
      case 'ACCEPTED':
        return AttendeeStatus.ACCEPTED
      case 'DECLINED':
        return AttendeeStatus.DECLINED
      case 'TENTATIVE':
        return AttendeeStatus.TENTATIVE
      case 'NEEDS-ACTION':
        return AttendeeStatus.NEEDS_ACTION
      default:
        return AttendeeStatus.NEEDS_ACTION
    }
  }

  private static mapEventStatus(status?: string): EventStatus {
    if (!status) return EventStatus.CONFIRMED

    switch (status.toUpperCase()) {
      case 'CONFIRMED':
        return EventStatus.CONFIRMED
      case 'TENTATIVE':
        return EventStatus.TENTATIVE
      case 'CANCELLED':
        return EventStatus.CANCELLED
      default:
        return EventStatus.CONFIRMED
    }
  }

  private static mapRecurrence(
    webdavEvent: WebDAVEvent
  ): UnifiedRecurrence | null {
    if (!webdavEvent.rrule) return null
    const recurrence = webdavEvent.rrule
    if (!recurrence) return null
    // Google uses RRULE format - parse the first rule
    if (!recurrence.startsWith('RRULE:')) return null

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
        webdav: {
          rrule: webdavEvent.rrule,
        },
      },
      weekOfMonth: Array.isArray(rrule.options.bysetpos)
        ? rrule.options.bysetpos[0]
        : rrule.options.bysetpos,
    }
  }
  private static mapFrequency(freq?: Frequency): MeetingRepeat {
    switch (freq) {
      case Frequency.DAILY:
        return MeetingRepeat.DAILY
      case Frequency.WEEKLY:
        return MeetingRepeat.WEEKLY
      case Frequency.MONTHLY:
        return MeetingRepeat.MONTHLY
      // case Frequency.YEARLY:
      //   return MeetingRepeat.YEARLY
      default:
        return MeetingRepeat.NO_REPEAT
    }
  }
  private static parseRRule(rrule: string): Record<string, string> {
    const rules: Record<string, string> = {}
    const cleanRule = rrule.replace(/^RRULE:/i, '')
    const parts = cleanRule.split(';')

    for (const part of parts) {
      const [key, value] = part.split('=')
      if (key && value) {
        rules[key.toUpperCase()] = value
      }
    }

    return rules
  }

  private static mapDaysOfWeek(byday?: string): DayOfWeek[] | null {
    if (!byday) return null

    const dayMap: Record<string, DayOfWeek> = {
      FR: DayOfWeek.FRIDAY,
      MO: DayOfWeek.MONDAY,
      SA: DayOfWeek.SATURDAY,
      SU: DayOfWeek.SUNDAY,
      TH: DayOfWeek.THURSDAY,
      TU: DayOfWeek.TUESDAY,
      WE: DayOfWeek.WEDNESDAY,
    }

    const days = byday
      .split(',')
      .map(day => {
        const cleanDay = day.replace(/^-?\d+/, '') // Remove week numbers
        return dayMap[cleanDay]
      })
      .filter(Boolean)

    return days.length > 0 ? days : null
  }

  private static mapWeekOfMonth(
    byday?: string,
    bysetpos?: string
  ): number | null {
    if (bysetpos) return parseInt(bysetpos)

    if (byday) {
      const match = byday.match(/^(-?\d+)/)
      if (match) {
        return parseInt(match[1])
      }
    }

    return null
  }

  private static parseUntilDate(until: string): Date {
    // Handle both date and datetime formats
    if (until.includes('T')) {
      // YYYYMMDDTHHMMSSZ format
      const year = parseInt(until.substring(0, 4))
      const month = parseInt(until.substring(4, 6)) - 1
      const day = parseInt(until.substring(6, 8))
      const hour = parseInt(until.substring(9, 11))
      const minute = parseInt(until.substring(11, 13))
      const second = parseInt(until.substring(13, 15))
      return new Date(Date.UTC(year, month, day, hour, minute, second))
    } else {
      // YYYYMMDD format
      const year = parseInt(until.substring(0, 4))
      const month = parseInt(until.substring(4, 6)) - 1
      const day = parseInt(until.substring(6, 8))
      return new Date(year, month, day)
    }
  }

  // Conversion back to WebDAV format methods

  private static createWebDAVAttendees(attendees: UnifiedAttendee[]): any[] {
    return attendees.map(attendee => {
      const webdavData = attendee.providerData?.webdav || {}

      // Create attendee in the format expected by CalDAV
      const attendeeArray = [`mailto:${attendee.email}`]

      if (attendee.name) {
        attendeeArray.push(`CN="${attendee.name}"`)
      }

      attendeeArray.push(
        `PARTSTAT=${this.mapUnifiedAttendeeStatusToWebDAV(attendee.status)}`
      )

      if (attendee.isOrganizer) {
        attendeeArray.push('ROLE=CHAIR')
      } else {
        attendeeArray.push('ROLE=REQ-PARTICIPANT')
      }

      if (webdavData.cutype) {
        attendeeArray.push(`CUTYPE=${webdavData.cutype}`)
      }

      if (webdavData.rsvp !== null) {
        attendeeArray.push(`RSVP=${webdavData.rsvp ? 'TRUE' : 'FALSE'}`)
      }

      return attendeeArray
    })
  }

  private static mapUnifiedAttendeeStatusToWebDAV(
    status: AttendeeStatus
  ): string {
    switch (status) {
      case AttendeeStatus.ACCEPTED:
        return 'ACCEPTED'
      case AttendeeStatus.DECLINED:
        return 'DECLINED'
      case AttendeeStatus.TENTATIVE:
        return 'TENTATIVE'
      case AttendeeStatus.NEEDS_ACTION:
        return 'NEEDS-ACTION'
      default:
        return 'NEEDS-ACTION'
    }
  }

  private static mapUnifiedStatusToWebDAV(status?: EventStatus | null): string {
    switch (status) {
      case EventStatus.CONFIRMED:
        return 'CONFIRMED'
      case EventStatus.TENTATIVE:
        return 'TENTATIVE'
      case EventStatus.CANCELLED:
        return 'CANCELLED'
      default:
        return 'CONFIRMED'
    }
  }

  private static createWebDAVRecurrence(
    recurrence?: UnifiedRecurrence | null
  ): string | undefined {
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
    return isJson(ruleset) ? JSON.parse(ruleset) : ruleset
  }

  private static mapDayToWebDAV(day: DayOfWeek): string {
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

  private static formatWebDAVUntilDate(date: Date): string {
    const year = date.getUTCFullYear().toString()
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
    const day = date.getUTCDate().toString().padStart(2, '0')
    const hour = date.getUTCHours().toString().padStart(2, '0')
    const minute = date.getUTCMinutes().toString().padStart(2, '0')
    const second = date.getUTCSeconds().toString().padStart(2, '0')

    return `${year}${month}${day}T${hour}${minute}${second}Z`
  }
}

// Additional helper types for WebDAV Calendar extensions
export interface WebDAVEventExtensions {
  url?: string
  sequence?: number
  duration?: {
    weeks?: number
    days?: number
    hours?: number
    minutes?: number
    seconds?: number
    isNegative?: boolean
  }
  organizer?: string
  recurrenceId?: string | null
  rrule: Optional<string>
  timezone?: string
}

export interface WebDAVAttendeeExtensions {
  role?: string // CHAIR, REQ-PARTICIPANT, OPT-PARTICIPANT, NON-PARTICIPANT
  cutype?: string // INDIVIDUAL, GROUP, RESOURCE, ROOM, UNKNOWN
  rsvp?: boolean
  delegatedFrom?: string
  delegatedTo?: string
  sentBy?: string
  cn?: string
}
