import { Interval } from 'luxon'
import { TimeSlot } from './Meeting'
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

export interface ActiveAvailabilityBlock {
  id: string
  title: string
}

export interface TimeSlotTooltipContentProps {
  currentUserState?: { state: boolean; displayName: string }
  currentUserEvent?: TimeSlot | null
  eventUrl?: string | null
  otherUserStates: Array<{ state: boolean; displayName: string }>
  activeAvailabilityBlocks?: ActiveAvailabilityBlock[]
  slot: Interval<true>
}
