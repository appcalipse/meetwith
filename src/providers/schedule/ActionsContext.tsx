import { createContext, useContext } from 'react'

import { DBSlot, MeetingDecrypted } from '@/types/Meeting'
import { ParticipantInfo } from '@/types/ParticipantInfo'

export interface IActionsContext {
  handleSchedule: () => Promise<void>
  handleCancel: () => void
  handleDelete:
    | ((actor?: ParticipantInfo) => Promise<void>)
    | ((
        actor?: ParticipantInfo,
        decryptedMeeting?: MeetingDecrypted
      ) => Promise<DBSlot | undefined>)
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
