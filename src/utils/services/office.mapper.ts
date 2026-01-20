import { Frequency } from 'rrule'

import {
  AttendeeStatus,
  DayOfWeek,
  EventStatus,
  Optional,
  UnifiedAttendee,
  UnifiedEvent,
  UnifiedRecurrence,
} from '@/types/Calendar'
import { TimeSlotSource } from '@/types/Meeting'
import {
  DateTimeTimeZone,
  ItemBody,
  MicrosoftGraphEvent,
  Attendee as O365Attendee,
  Location as O365Location,
  PatternedRecurrence,
  RecurrencePattern,
  RecurrenceRange,
  ResponseStatus,
} from '@/types/Office365'
import { MeetingPermissions } from '../constants/schedule'
import { extractUrlFromText } from '../generic_utils'
import { isValidUrl } from '../validations'
import { CalendarServiceHelper } from './calendar.helper'

export class Office365EventMapper {
  /**
   * Converts a Microsoft Graph Event to a Unified Event
   */
  static async toUnified(
    o365Event: MicrosoftGraphEvent,
    calendarId: string,
    calendarName: string,
    accountEmail: string,
    isReadOnlyCalendar: boolean = false
  ): Promise<UnifiedEvent> {
    const permissions: MeetingPermissions[] = []
    const isOrganizer =
      o365Event.organizer?.emailAddress?.address?.toLowerCase() ===
      accountEmail.toLowerCase()

    if (!o365Event.hideAttendees || isOrganizer) {
      permissions.push(MeetingPermissions.SEE_GUEST_LIST)
    }
    if (o365Event.allowNewTimeProposals || isOrganizer) {
      permissions.push(MeetingPermissions.EDIT_MEETING)
    }
    if (isOrganizer) {
      permissions.push(MeetingPermissions.INVITE_GUESTS)
    }
    return {
      accountEmail,
      attendees: this.mapAttendees(o365Event.attendees || []),
      calendarId,
      calendarName,
      description: this.extractDescription(o365Event.body),
      end: this.parseDateTime(o365Event.end!),
      etag: o365Event.changeKey,
      id: await this.generateInternalId(o365Event),
      isAllDay: o365Event.isAllDay || false,
      isReadOnlyCalendar,

      lastModified: o365Event.lastModifiedDateTime
        ? new Date(o365Event.lastModifiedDateTime)
        : new Date(),

      meeting_url: this.mapLocation(o365Event) || undefined,
      permissions,
      providerData: {
        office365: {
          allowNewTimeProposals: o365Event.allowNewTimeProposals,
          categories: o365Event.categories,
          hideAttendees: o365Event.hideAttendees,
          iCalUId: o365Event.iCalUId,
          importance: o365Event.importance,
          isOnlineMeeting: o365Event.isOnlineMeeting,
          isReminderOn: o365Event.isReminderOn,
          locations: o365Event.locations,
          onlineMeeting: o365Event.onlineMeeting,
          onlineMeetingProvider: o365Event.onlineMeetingProvider,
          onlineMeetingUrl: o365Event.onlineMeetingUrl,
          reminderMinutesBeforeStart: o365Event.reminderMinutesBeforeStart,
          responseRequested: o365Event.responseRequested,
          sensitivity: o365Event.sensitivity,
          showAs: o365Event.showAs,
        },
      },
      recurrence: this.mapRecurrence(o365Event.recurrence),

      source: TimeSlotSource.OFFICE,
      sourceEventId: o365Event.id!,
      start: this.parseDateTime(o365Event.start!),
      status: this.mapEventStatus(o365Event),
      title: o365Event.subject || '(No title)',
      webLink: o365Event.webLink,
    }
  }

  /**
   * Converts a Unified Event back to Microsoft Graph Event format
   */
  static fromUnified(unifiedEvent: UnifiedEvent): Partial<MicrosoftGraphEvent> {
    const o365Data = unifiedEvent.providerData?.office365 || {}

    return {
      allowNewTimeProposals: o365Data.allowNewTimeProposals,
      attendees: this.createO365Attendees(unifiedEvent.attendees || []),
      body: this.createItemBody(unifiedEvent.description || ''),
      categories: o365Data.categories,
      end: this.createDateTime(unifiedEvent.end),
      hideAttendees: o365Data.hideAttendees,
      id: unifiedEvent.sourceEventId,

      // Office365-specific fields
      importance: o365Data.importance,
      isAllDay: unifiedEvent.isAllDay,
      isOnlineMeeting: o365Data.isOnlineMeeting,
      isReminderOn: o365Data.isReminderOn,

      location: this.createO365Location(unifiedEvent.meeting_url || ''),
      onlineMeetingProvider: o365Data.onlineMeetingProvider,
      recurrence: unifiedEvent.recurrence?.providerRecurrence?.office365,
      reminderMinutesBeforeStart: o365Data.reminderMinutesBeforeStart,
      responseRequested: o365Data.responseRequested,
      sensitivity: o365Data.sensitivity,
      showAs: o365Data.showAs,
      start: this.createDateTime(unifiedEvent.start),
      subject: unifiedEvent.title,
    }
  }

  // Helper Methods

  private static async generateInternalId(
    o365: MicrosoftGraphEvent
  ): Promise<string> {
    if (!o365.body?.content.includes('Your meeting will happen at'))
      return o365.id!
    const extendedProperties = o365.singleValueExtendedProperties
    const internalIdProp = extendedProperties?.find(
      prop => prop.id === 'meeting_id'
    )
    return internalIdProp?.value || o365.id!
  }

  private static extractDescription(body?: ItemBody): string | undefined {
    if (!body?.content) return undefined

    return CalendarServiceHelper.parseDescriptionToRichText(body.content.trim())
  }

  private static parseDateTime(dateTime: DateTimeTimeZone): Date {
    // Office365 returns datetime in the format: "2024-01-15T14:30:00.0000000"
    // with timezone info in the timeZone field
    return new Date(dateTime.dateTime)
  }

  private static mapLocation(
    o365Event: MicrosoftGraphEvent
  ): string | undefined {
    const loc = o365Event?.locations?.find(
      loc => loc.displayName && isValidUrl(loc.displayName)
    )
    if (isValidUrl(o365Event?.onlineMeeting?.joinUrl)) {
      return o365Event?.onlineMeeting?.joinUrl
    } else if (isValidUrl(o365Event?.onlineMeetingUrl)) {
      return o365Event?.onlineMeetingUrl
    } else if (isValidUrl(o365Event?.location?.displayName)) {
      return o365Event?.location?.displayName
    } else if (loc) {
      return loc.displayName
    } else {
      const bodyUrl = extractUrlFromText(o365Event.body?.content)
      if (bodyUrl && isValidUrl(bodyUrl)) {
        return bodyUrl
      }
    }
    return undefined
  }

  private static mapAttendees(
    o365Attendees: O365Attendee[]
  ): UnifiedAttendee[] {
    return o365Attendees.map(attendee => ({
      email: attendee.emailAddress.address,
      isOrganizer: attendee.type === 'required', // This is a simplification
      name: attendee.emailAddress.name,
      providerData: {
        office365: {
          emailAddress: attendee.emailAddress,
          responseTime: attendee.status?.time,
          status: attendee.status,
          type: attendee.type,
        },
      },
      status: this.mapAttendeeStatus(attendee.status),
    }))
  }

  private static mapAttendeeStatus(status?: ResponseStatus): AttendeeStatus {
    if (!status?.response) return AttendeeStatus.NEEDS_ACTION

    switch (status.response) {
      case 'accepted':
        return AttendeeStatus.ACCEPTED
      case 'declined':
        return AttendeeStatus.DECLINED
      case 'tentativelyAccepted':
        return AttendeeStatus.TENTATIVE
      case 'none':
      case 'notResponded':
        return AttendeeStatus.NEEDS_ACTION
      case 'organizer':
        return AttendeeStatus.ACCEPTED
      default:
        return AttendeeStatus.NEEDS_ACTION
    }
  }

  private static mapEventStatus(o365Event: MicrosoftGraphEvent): EventStatus {
    if (o365Event.isCancelled) return EventStatus.CANCELLED
    if (o365Event.responseStatus?.response === 'declined')
      return EventStatus.DECLINED
    if (o365Event.responseStatus?.response === 'tentativelyAccepted')
      return EventStatus.TENTATIVE
    return EventStatus.CONFIRMED
  }

  private static mapRecurrence(
    recurrence?: PatternedRecurrence
  ): UnifiedRecurrence | undefined {
    if (!recurrence) return undefined

    return {
      dayOfMonth: recurrence.pattern.dayOfMonth,
      daysOfWeek: this.mapDaysOfWeek(recurrence.pattern.daysOfWeek),
      endDate: recurrence.range.endDate
        ? new Date(recurrence.range.endDate)
        : undefined,
      frequency: this.mapRecurrenceFrequency(recurrence.pattern.type),
      interval: recurrence.pattern.interval,
      occurrenceCount: recurrence.range.numberOfOccurrences,

      providerRecurrence: {
        office365: {
          pattern: recurrence.pattern,
          range: recurrence.range,
        },
      },
      weekOfMonth: this.mapWeekOfMonth(recurrence.pattern.index),
    }
  }

  private static mapRecurrenceFrequency(
    type: RecurrencePattern['type']
  ): Frequency {
    switch (type) {
      case 'daily':
        return Frequency.DAILY
      case 'weekly':
        return Frequency.WEEKLY
      case 'absoluteMonthly':
      case 'relativeMonthly':
        return Frequency.MONTHLY
      case 'absoluteYearly':
      case 'relativeYearly':
        return Frequency.YEARLY
    }
  }

  private static mapDaysOfWeek(
    days?: RecurrencePattern['daysOfWeek']
  ): DayOfWeek[] | undefined {
    if (!days) return undefined

    const dayMap: Record<string, DayOfWeek> = {
      friday: DayOfWeek.FRIDAY,
      monday: DayOfWeek.MONDAY,
      saturday: DayOfWeek.SATURDAY,
      sunday: DayOfWeek.SUNDAY,
      thursday: DayOfWeek.THURSDAY,
      tuesday: DayOfWeek.TUESDAY,
      wednesday: DayOfWeek.WEDNESDAY,
    }

    return days.map(day => dayMap[day]).filter(Boolean)
  }

  private static mapWeekOfMonth(
    index?: RecurrencePattern['index']
  ): number | undefined {
    const indexMap: Record<string, number> = {
      first: 1,
      fourth: 4,
      last: -1,
      second: 2,
      third: 3,
    }

    return index ? indexMap[index] : undefined
  }

  // Conversion back to Office365 format methods

  private static createItemBody(description?: string): ItemBody | undefined {
    if (!description) return undefined

    return {
      content: description,
      contentType: 'text',
    }
  }

  private static createDateTime(date: Date): DateTimeTimeZone {
    return {
      dateTime: date.toISOString().replace('Z', ''),
      timeZone: 'UTC', // You might want to handle timezone conversion here
    }
  }

  private static createO365Location(
    location?: string
  ): O365Location | undefined {
    if (!location) return undefined

    return {
      displayName: location,
    }
  }

  private static createO365Attendees(
    attendees: UnifiedAttendee[]
  ): O365Attendee[] {
    return attendees.map(attendee => ({
      emailAddress: {
        address: attendee.email,
        name: attendee.name || '',
      },
      status: this.createResponseStatus(attendee.status),
      type: attendee.isOrganizer ? 'required' : 'optional',
    }))
  }

  private static createResponseStatus(status: AttendeeStatus): ResponseStatus {
    switch (status) {
      case AttendeeStatus.ACCEPTED:
        return { response: 'accepted' }
      case AttendeeStatus.DECLINED:
        return { response: 'declined' }
      case AttendeeStatus.TENTATIVE:
        return { response: 'tentativelyAccepted' }
      case AttendeeStatus.NEEDS_ACTION:
        return { response: 'none' }
      default:
        return { response: 'none' }
    }
  }

  private static createO365Recurrence(
    recurrence: Optional<UnifiedRecurrence>
  ): PatternedRecurrence | undefined {
    if (!recurrence) return undefined

    const pattern: RecurrencePattern = {
      interval: recurrence.interval,
      type: this.mapUnifiedFrequencyToO365(recurrence.frequency),
    }

    // Add day-specific rules
    if (recurrence.daysOfWeek?.length) {
      pattern.daysOfWeek = recurrence.daysOfWeek.map(this.mapDayOfWeekToO365)
    }

    if (recurrence.dayOfMonth) {
      pattern.dayOfMonth = recurrence.dayOfMonth
    }

    if (recurrence.weekOfMonth) {
      pattern.index = this.mapWeekOfMonthToO365(recurrence.weekOfMonth)
    }

    const range: RecurrenceRange = {
      startDate: new Date().toISOString().split('T')[0], // You'll want to get actual start date
      type: recurrence.endDate
        ? 'endDate'
        : recurrence.occurrenceCount
        ? 'numbered'
        : 'noEnd',
    }

    if (recurrence.endDate) {
      range.endDate = recurrence.endDate.toISOString().split('T')[0]
    }

    if (recurrence.occurrenceCount) {
      range.numberOfOccurrences = recurrence.occurrenceCount
    }

    return { pattern, range }
  }

  private static mapUnifiedFrequencyToO365(
    frequency: Frequency
  ): RecurrencePattern['type'] {
    switch (frequency) {
      case Frequency.DAILY:
        return 'daily'
      case Frequency.WEEKLY:
        return 'weekly'
      case Frequency.MONTHLY:
        return 'absoluteMonthly' // Default to absolute
      case Frequency.YEARLY:
        return 'absoluteYearly'
      default:
        return 'weekly'
    }
  }

  private static mapDayOfWeekToO365(day: DayOfWeek) {
    const dayMap: Record<
      DayOfWeek,
      | 'sunday'
      | 'monday'
      | 'tuesday'
      | 'wednesday'
      | 'thursday'
      | 'friday'
      | 'saturday'
    > = {
      [DayOfWeek.SUNDAY]: 'sunday',
      [DayOfWeek.MONDAY]: 'monday',
      [DayOfWeek.TUESDAY]: 'tuesday',
      [DayOfWeek.WEDNESDAY]: 'wednesday',
      [DayOfWeek.THURSDAY]: 'thursday',
      [DayOfWeek.FRIDAY]: 'friday',
      [DayOfWeek.SATURDAY]: 'saturday',
    }

    return dayMap[day]
  }

  private static mapWeekOfMonthToO365(
    week: number
  ): RecurrencePattern['index'] {
    switch (week) {
      case 1:
        return 'first'
      case 2:
        return 'second'
      case 3:
        return 'third'
      case 4:
        return 'fourth'
      case -1:
        return 'last'
      default:
        return 'first'
    }
  }
}

// Additional helper types you'll need in your UnifiedEvent.ts
