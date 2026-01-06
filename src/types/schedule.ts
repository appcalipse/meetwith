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

export interface TimeSlotTooltipContentProps {
  currentUserState?: { state: boolean; displayName: string }
  currentUserEvent?: TimeSlot | null
  eventUrl?: string | null
  otherUserStates: Array<{ state: boolean; displayName: string }>
  defaultBlockId?: string | null
}

export enum DurationMode {
  PRESET = 'preset',
  CUSTOM = 'custom',
  TIME_RANGE = 'time_range',
}

export interface TimeRangeFilter {
  startTime: string
  endTime: string
}

export interface CustomDurationInput {
  hours?: number
  minutes?: number
  totalMinutes: number
}

export interface DurationConfig {
  mode: DurationMode
  presetDuration?: number
  customDuration?: CustomDurationInput
  timeRange?: TimeRangeFilter
}
