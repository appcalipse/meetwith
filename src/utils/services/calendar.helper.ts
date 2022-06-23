import { MeetingCreationRequest, ParticipationStatus } from '@/types/Meeting'

import { getAllParticipantsDisplayName } from '../user_manager'

export const CalendarServiceHelper = {
  getMeetingSummary: (owner: string, details: MeetingCreationRequest) => {
    const displayNames = getAllParticipantsDisplayName(
      details.participants_mapping.map(map => {
        return {
          account_address: map.account_address,
          name: map.name,
          slot_id: map.slot_id,
          type: map.type,
          guest_email: map.guest_email,
          status: ParticipationStatus.Accepted, //will not be used for now
        }
      }),
      owner
    )

    return `Meeting: ${displayNames}`
  },

  getMeetingTitle: (details: MeetingCreationRequest) => {
    return `${
      details.content ? details.content + '\n' : ''
    }Your meeting will happen at ${
      details.meeting_url ? details.meeting_url : 'Meet With Wallet'
    }`
  },

  getMeetingLocation: () => {
    return 'Online @ Meet With Wallet'
  },
}
