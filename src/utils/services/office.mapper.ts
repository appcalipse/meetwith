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
  Attendee as O365Attendee,
  DateTimeTimeZone,
  ItemBody,
  Location as O365Location,
  MicrosoftGraphEvent,
  PatternedRecurrence,
  RecurrencePattern,
  RecurrenceRange,
  ResponseStatus,
} from '@/types/Office365'

export class Office365EventMapper {
  /**
   * Converts a Microsoft Graph Event to a Unified Event
   */
  static async toUnified(
    o365Event: MicrosoftGraphEvent,
    calendarId: string,
    accountEmail: string
  ): Promise<UnifiedEvent> {
    return {
      id: await this.generateInternalId(o365Event),
      title: o365Event.subject || '(No title)',
      description: this.extractDescription(o365Event.body),
      start: this.parseDateTime(o365Event.start!),
      end: this.parseDateTime(o365Event.end!),
      isAllDay: o365Event.isAllDay || false,

      source: TimeSlotSource.OFFICE,
      sourceEventId: o365Event.id!,
      calendarId,
      accountEmail,

      meeting_url: this.mapLocation(o365Event) || undefined,
      webLink: o365Event.webLink,
      attendees: this.mapAttendees(o365Event.attendees || []),
      recurrence: this.mapRecurrence(o365Event.recurrence),
      status: this.mapEventStatus(o365Event),

      lastModified: o365Event.lastModifiedDateTime
        ? new Date(o365Event.lastModifiedDateTime)
        : new Date(),
      etag: o365Event.changeKey,

      providerData: {
        office365: {
          importance: o365Event.importance,
          sensitivity: o365Event.sensitivity,
          showAs: o365Event.showAs,
          isOnlineMeeting: o365Event.isOnlineMeeting,
          onlineMeetingProvider: o365Event.onlineMeetingProvider,
          onlineMeetingUrl: o365Event.onlineMeetingUrl,
          iCalUId: o365Event.iCalUId,
          categories: o365Event.categories,
          reminderMinutesBeforeStart: o365Event.reminderMinutesBeforeStart,
          isReminderOn: o365Event.isReminderOn,
          allowNewTimeProposals: o365Event.allowNewTimeProposals,
          responseRequested: o365Event.responseRequested,
          hideAttendees: o365Event.hideAttendees,
          locations: o365Event.locations,
          onlineMeeting: o365Event.onlineMeeting,
        },
      },
    }
  }

  /**
   * Converts a Unified Event back to Microsoft Graph Event format
   */
  static fromUnified(unifiedEvent: UnifiedEvent): Partial<MicrosoftGraphEvent> {
    const o365Data = unifiedEvent.providerData?.office365 || {}

    return {
      id: unifiedEvent.sourceEventId,
      subject: unifiedEvent.title,
      body: this.createItemBody(unifiedEvent.description || ''),
      start: this.createDateTime(unifiedEvent.start),
      end: this.createDateTime(unifiedEvent.end),
      isAllDay: unifiedEvent.isAllDay,

      location: this.createO365Location(unifiedEvent.meeting_url || ''),
      attendees: this.createO365Attendees(unifiedEvent.attendees || []),
      recurrence: unifiedEvent.recurrence?.providerRecurrence?.office365,

      // Office365-specific fields
      importance: o365Data.importance,
      sensitivity: o365Data.sensitivity,
      showAs: o365Data.showAs,
      isOnlineMeeting: o365Data.isOnlineMeeting,
      onlineMeetingProvider: o365Data.onlineMeetingProvider,
      categories: o365Data.categories,
      reminderMinutesBeforeStart: o365Data.reminderMinutesBeforeStart,
      isReminderOn: o365Data.isReminderOn,
      allowNewTimeProposals: o365Data.allowNewTimeProposals,
      responseRequested: o365Data.responseRequested,
      hideAttendees: o365Data.hideAttendees,
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

    // If HTML, you might want to strip HTML tags or convert to plain text
    if (body.contentType === 'html') {
      return body.content.replace(/<[^>]*>/g, '') // Simple HTML strip
    }

    return body.content
  }

  private static parseDateTime(dateTime: DateTimeTimeZone): Date {
    // Office365 returns datetime in the format: "2024-01-15T14:30:00.0000000"
    // with timezone info in the timeZone field
    return new Date(dateTime.dateTime)
  }

  private static mapLocation(
    o365Event: MicrosoftGraphEvent
  ): string | undefined {
    return (
      o365Event.onlineMeeting?.joinUrl ||
      o365Event.onlineMeetingUrl ||
      o365Event.location.displayName ||
      o365Event.locations.find(
        loc =>
          loc.displayName &&
          (loc.displayName.includes('http://') ||
            loc.displayName.includes('https://') ||
            loc.displayName.includes('zoom.us') ||
            loc.displayName.includes('teams.microsoft.com') ||
            loc.displayName.includes('meet.google.com'))
      )?.displayName ||
      undefined
    )
  }

  private static mapAttendees(
    o365Attendees: O365Attendee[]
  ): UnifiedAttendee[] {
    return o365Attendees.map(attendee => ({
      email: attendee.emailAddress.address,
      name: attendee.emailAddress.name,
      status: this.mapAttendeeStatus(attendee.status),
      isOrganizer: attendee.type === 'required', // This is a simplification
      providerData: {
        office365: {
          type: attendee.type,
          responseTime: attendee.status?.time,
          emailAddress: attendee.emailAddress,
          status: attendee.status,
        },
      },
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
      frequency: this.mapRecurrenceFrequency(recurrence.pattern.type),
      interval: recurrence.pattern.interval,
      daysOfWeek: this.mapDaysOfWeek(recurrence.pattern.daysOfWeek),
      dayOfMonth: recurrence.pattern.dayOfMonth,
      weekOfMonth: this.mapWeekOfMonth(recurrence.pattern.index),
      endDate: recurrence.range.endDate
        ? new Date(recurrence.range.endDate)
        : undefined,
      occurrenceCount: recurrence.range.numberOfOccurrences,

      providerRecurrence: {
        office365: {
          pattern: recurrence.pattern,
          range: recurrence.range,
        },
      },
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
      sunday: DayOfWeek.SUNDAY,
      monday: DayOfWeek.MONDAY,
      tuesday: DayOfWeek.TUESDAY,
      wednesday: DayOfWeek.WEDNESDAY,
      thursday: DayOfWeek.THURSDAY,
      friday: DayOfWeek.FRIDAY,
      saturday: DayOfWeek.SATURDAY,
    }

    return days.map(day => dayMap[day]).filter(Boolean)
  }

  private static mapWeekOfMonth(
    index?: RecurrencePattern['index']
  ): number | undefined {
    const indexMap: Record<string, number> = {
      first: 1,
      second: 2,
      third: 3,
      fourth: 4,
      last: -1,
    }

    return index ? indexMap[index] : undefined
  }

  // Conversion back to Office365 format methods

  private static createItemBody(description?: string): ItemBody | undefined {
    if (!description) return undefined

    return {
      contentType: 'text',
      content: description,
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
      type: attendee.isOrganizer ? 'required' : 'optional',
      status: this.createResponseStatus(attendee.status),
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
      type: this.mapUnifiedFrequencyToO365(recurrence.frequency),
      interval: recurrence.interval,
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
      type: recurrence.endDate
        ? 'endDate'
        : recurrence.occurrenceCount
        ? 'numbered'
        : 'noEnd',
      startDate: new Date().toISOString().split('T')[0], // You'll want to get actual start date
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
