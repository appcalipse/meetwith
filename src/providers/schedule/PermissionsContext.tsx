import { useRouter } from 'next/router'
import React, {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react'

interface IPermissionsContext {
  isDeleting: boolean
  canDelete: boolean
  canCancel: boolean
  isScheduler: boolean
  canEditMeetingDetails: boolean
  setIsDeleting: React.Dispatch<React.SetStateAction<boolean>>
  setCanDelete: React.Dispatch<React.SetStateAction<boolean>>
  setCanCancel: React.Dispatch<React.SetStateAction<boolean>>
  setIsScheduler: React.Dispatch<React.SetStateAction<boolean>>
  setCanEditMeetingDetails: React.Dispatch<React.SetStateAction<boolean>>
  canEditMeetingParticipants: boolean
  setCanEditMeetingParticipants: React.Dispatch<React.SetStateAction<boolean>>
  isUpdatingMeeting: boolean
}

const PermissionsContext = createContext<IPermissionsContext | undefined>(
  undefined
)

export const useParticipantPermissions = () => {
  const context = useContext(PermissionsContext)
  if (!context) {
    throw new Error(
      'useParticipantPermissions must be used within PermissionsProvider'
    )
  }
  return context
}

interface PermissionsProviderProps {
  children: ReactNode
}

export const PermissionsProvider: React.FC<PermissionsProviderProps> = ({
  children,
}) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const [canDelete, setCanDelete] = useState(true)
  const [canCancel, setCanCancel] = useState(true)
  const [isScheduler, setIsScheduler] = useState(true)
  const [canEditMeetingDetails, setCanEditMeetingDetails] = useState(true)
  const [canEditMeetingParticipants, setCanEditMeetingParticipants] =
    useState(true)
  const query = useRouter().query
  const isUpdatingMeeting = useMemo(() => !!query.meetingId, [query.meetingId])

  const value: IPermissionsContext = {
    isDeleting,
    canDelete,
    canCancel,
    isScheduler,
    setIsDeleting,
    setCanDelete,
    setCanCancel,
    setIsScheduler,
    canEditMeetingDetails,
    setCanEditMeetingDetails,
    isUpdatingMeeting,
    canEditMeetingParticipants,
    setCanEditMeetingParticipants,
  }
  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  )
}
