import { MeetingCreationRequest } from '@/types/Meeting'

import { ellipsizeAddress } from '../user_manager'

export const CalendarServiceHelper = {
  getMeetingSummary: (owner: string, details: MeetingCreationRequest) => {
    const otherParticipants = [
      details.participants_mapping
        ?.filter(it => it.account_address !== owner)
        .map(it =>
          it.account_address
            ? ellipsizeAddress(it.account_address!)
            : it.guest_email
        ),
    ]

    return `Meet with ${
      otherParticipants.length
        ? otherParticipants.join(', ')
        : 'other participants'
    }`
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
