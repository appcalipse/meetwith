import { ParticipantInfo } from '@/types/ParticipantInfo'

import { getAllParticipantsDisplayName } from '../user_manager'

export const CalendarServiceHelper = {
  getMeetingTitle: (
    slotOwnerAccountAddress: string,
    participants: ParticipantInfo[]
  ) => {
    const displayNames = getAllParticipantsDisplayName(
      participants,
      slotOwnerAccountAddress
    )

    return `Meeting: ${displayNames}`
  },

  getMeetingSummary: (
    meetingDescription?: string,
    meeting_url?: string,
    meetingChangeLink?: string
  ) => {
    let message = `Your meeting will happen at ${
      meeting_url ? meeting_url : 'Meet with Wallet'
    }`
    if (meetingChangeLink) {
      message += `\n\nTo reschedule or cancel the meeting, please go to ${meetingChangeLink}`
    }
    if (meetingDescription) {
      message += `\n\n${meetingDescription}`
    }
    return message
  },
}
