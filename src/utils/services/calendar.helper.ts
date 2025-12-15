import { parseFromString } from 'dom-parser'
import htmlTags from 'html-tags'

import { ParticipantInfo, ParticipationStatus } from '@/types/ParticipantInfo'

import { noNoReplyEmailForAccount } from '../calendar_manager'
import { getAllParticipantsDisplayName } from '../user_manager'

export interface CalendarAttendee {
  email: string
  displayName: string
  responseStatus: string
}

export const CalendarServiceHelper = {
  isHtml: (str: string) => {
    const full = new RegExp(
      htmlTags.map(tag => `<${tag}\\b[^>]*>`).join('|'),
      'i'
    )
    return full.test(str)
  },
  convertHtmlToPlainText: (html: string) => {
    if (!CalendarServiceHelper.isHtml(html)) {
      return html
    }
    const doc = parseFromString(html)
    const paragraphs = doc.getElementsByTagName('p')
    let plainText = ''
    paragraphs.forEach(paragraph => {
      plainText += paragraph.textContent + '\n'
    })

    return plainText.trim()
  },
  getMeetingTitle: (
    slotOwnerAccountAddress: string,
    participants: ParticipantInfo[],
    title?: string
  ) => {
    if (title) {
      return title
    }
    const displayNames = getAllParticipantsDisplayName(
      participants,
      slotOwnerAccountAddress
    )

    return `Meeting: ${displayNames}`
  },

  getMeetingSummary: function (
    meetingDescription?: string,
    meeting_url?: string,
    meetingChangeLink?: string
  ) {
    let message = ''
    if (meetingDescription) {
      message += `${this.convertHtmlToPlainText(meetingDescription)}`
    }

    const meetingLocationText = `\n\nYour meeting will happen at ${
      meeting_url ? meeting_url : 'Meetwith'
    }`

    message += meetingLocationText

    if (meetingChangeLink) {
      message += `\n\nTo reschedule or cancel the meeting, please go to ${meetingChangeLink}`
    }

    return message
  },
  sanitizeEmail(email: string): string {
    return email.replace(/\+[^@]*@/, '@')
  },
  buildAttendeesList: (
    participants: ParticipantInfo[],
    calendarOwnerAccountAddress: string,
    getConnectedEmail: () => string
  ): CalendarAttendee[] => {
    const addedEmails = new Set<string>()
    const attendees: CalendarAttendee[] = []

    for (const participant of participants) {
      const email =
        calendarOwnerAccountAddress === participant.account_address
          ? getConnectedEmail()
          : CalendarServiceHelper.sanitizeEmail(
              participant.guest_email ||
                noNoReplyEmailForAccount(
                  (participant.name || participant.account_address)!
                )
            )

      // Only add if we haven't already added this email
      if (!addedEmails.has(email)) {
        addedEmails.add(email)
        attendees.push({
          email,
          displayName:
            participant.name ||
            participant.account_address ||
            email.split('@')[0],
          responseStatus:
            participant.status === ParticipationStatus.Accepted
              ? 'accepted'
              : participant.status === ParticipationStatus.Rejected
              ? 'declined'
              : 'needsAction',
        })
      }
    }

    return attendees
  },

  buildAttendeesListForUpdate: (
    participants: ParticipantInfo[],
    calendarOwnerAccountAddress: string,
    getConnectedEmail: () => string,
    actorStatus?: string,
    guestParticipant?: ParticipantInfo
  ): CalendarAttendee[] => {
    const addedEmails = new Set<string>()
    const attendees: CalendarAttendee[] = []

    // Handle guest participant first if provided
    if (guestParticipant?.guest_email) {
      addedEmails.add(guestParticipant.guest_email)
      attendees.push({
        email: guestParticipant.guest_email,
        displayName:
          guestParticipant.name ||
          guestParticipant.guest_email.split('@')[0] ||
          'Guest',
        responseStatus: 'accepted',
      })
    }

    for (const participant of participants) {
      const email =
        calendarOwnerAccountAddress === participant.account_address
          ? getConnectedEmail()
          : participant.guest_email ||
            noNoReplyEmailForAccount(
              (participant.name || participant.account_address)!
            )

      // Only add if we haven't already added this email
      if (!addedEmails.has(email)) {
        addedEmails.add(email)
        attendees.push({
          email,
          displayName:
            participant.name ||
            participant.account_address ||
            email.split('@')[0],
          responseStatus:
            calendarOwnerAccountAddress === participant.account_address &&
            actorStatus
              ? actorStatus
              : participant.status === ParticipationStatus.Accepted
              ? 'accepted'
              : participant.status === ParticipationStatus.Rejected
              ? 'declined'
              : 'needsAction',
        })
      }
    }

    return attendees
  },
}
