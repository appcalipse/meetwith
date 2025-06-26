import { ParticipantInfo } from './ParticipantInfo'

export interface IGroupParticipant {
  id: string
  name: string
  isGroup: boolean
}

export type Participant = ParticipantInfo | IGroupParticipant

export const isGroupParticipant = (
  participant: Participant
): participant is IGroupParticipant => {
  return 'isGroup' in participant && participant.isGroup === true
}
