import { parseFromString } from 'dom-parser'
import htmlTags from 'html-tags'

import { ParticipantInfo } from '@/types/ParticipantInfo'

import { getAllParticipantsDisplayName } from '../user_manager'

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
    meetingChangeLink?: string,
    hasGuests?: boolean
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

    if (hasGuests) {
      message += `\n\nGuests have to use the reschedule or cancel link in their meeting confirmation email to manage their booking`
    }

    return message
  },
}
