import { createContext, useContext } from 'react'

import { DBSlot, MeetingDecrypted } from '@/types/Meeting'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import { UpdateMode } from '@/utils/constants/meeting'

export interface IActionsContext {
  handleSchedule: () => Promise<void>
  handleCancel: () => void
  handleDelete: (
    actor?: ParticipantInfo,
    decryptedMeeting?: MeetingDecrypted,
    editMode?: UpdateMode
  ) => Promise<DBSlot | MeetingDecrypted | void | undefined>
}

export const ActionsContext = createContext<IActionsContext | undefined>(
  undefined
)

export const useScheduleActions = () => {
  const context = useContext(ActionsContext)
  if (!context) {
    throw new Error('useActions must be used within ActionsProvider')
  }
  return context
}
