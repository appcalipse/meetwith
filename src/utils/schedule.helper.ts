import { GetGroupsFullResponse } from '@/types/Group'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import { isGroupParticipant, Participant } from '@/types/schedule'

export const getMergedParticipants = (
  participants: Array<Participant>,
  groups: Array<GetGroupsFullResponse>,
  groupParticipants: Record<string, Array<string>>,
  accountAddress: string
) => {
  const allParticipants: Array<ParticipantInfo> = []
  for (const participant of participants) {
    if (isGroupParticipant(participant)) {
      const group = groups.find(g => g.id === participant.id)
      if (group) {
        const groupMembers = groupParticipants?.[participant.id] || []
        const membersSanitized = groupMembers
          .map(member => {
            const groupMember = group.members.find(m => m.address === member)
            if (
              groupMember &&
              groupMember.address &&
              allParticipants.every(
                val => val.account_address !== groupMember.address
              )
            ) {
              return {
                account_address: groupMember.address,
                name: groupMember.displayName,
                type: ParticipantType.Invitee,
                status: ParticipationStatus.Accepted,
                meeting_id: '',
              }
            }
            return undefined
          })
          .filter(val => val !== undefined)
        allParticipants.push(...membersSanitized)
      }
    } else {
      allParticipants.push(participant)
    }
  }
  return allParticipants.filter(val => val.account_address !== accountAddress)
}
