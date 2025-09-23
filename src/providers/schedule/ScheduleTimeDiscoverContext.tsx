import React, { createContext, ReactNode, useContext, useState } from 'react'

interface ScheduleTimeDiscoverState {
  // Modal states
  isInviteParticipantsOpen: boolean
  showCalendarModal: boolean
  showGuestForm: boolean
  showGuestIdModal: boolean
  showCalendarImportFlow: boolean

  // Data states
  currentParticipantId: string
  currentGuestEmail: string

  // Loading states
  isEditingAvailability: boolean
  isSavingAvailability: boolean
  isRefreshingAvailabilities: boolean

  // Actions
  setIsInviteParticipantsOpen: (value: boolean) => void
  setShowCalendarModal: (value: boolean) => void
  setShowGuestForm: (value: boolean) => void
  setShowGuestIdModal: (value: boolean) => void
  setShowCalendarImportFlow: (value: boolean) => void
  setCurrentParticipantId: (value: string) => void
  setCurrentGuestEmail: (value: string) => void
  setIsEditingAvailability: (value: boolean) => void
  setIsSavingAvailability: (value: boolean) => void
  setIsRefreshingAvailabilities: (value: boolean) => void
}

const ScheduleTimeDiscoverContext = createContext<
  ScheduleTimeDiscoverState | undefined
>(undefined)

export const useScheduleTimeDiscover = () => {
  const context = useContext(ScheduleTimeDiscoverContext)
  if (!context) {
    throw new Error(
      'useScheduleTimeDiscover must be used within ScheduleTimeDiscoverProvider'
    )
  }
  return context
}

interface ScheduleTimeDiscoverProviderProps {
  children: ReactNode
}

export const ScheduleTimeDiscoverProvider: React.FC<
  ScheduleTimeDiscoverProviderProps
> = ({ children }) => {
  const [isInviteParticipantsOpen, setIsInviteParticipantsOpen] =
    useState(false)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [showGuestForm, setShowGuestForm] = useState(false)
  const [showGuestIdModal, setShowGuestIdModal] = useState(false)
  const [currentParticipantId, setCurrentParticipantId] = useState<string>('')
  const [currentGuestEmail, setCurrentGuestEmail] = useState<string>('')
  const [isEditingAvailability, setIsEditingAvailability] = useState(false)
  const [isSavingAvailability, setIsSavingAvailability] = useState(false)
  const [isRefreshingAvailabilities, setIsRefreshingAvailabilities] =
    useState(false)
  const [showCalendarImportFlow, setShowCalendarImportFlow] = useState(false)

  const value: ScheduleTimeDiscoverState = {
    // Modal states
    isInviteParticipantsOpen,
    showCalendarModal,
    showGuestForm,
    showGuestIdModal,
    showCalendarImportFlow,

    // Data states
    currentParticipantId,
    currentGuestEmail,

    // Loading states
    isEditingAvailability,
    isSavingAvailability,
    isRefreshingAvailabilities,

    // Actions
    setIsInviteParticipantsOpen,
    setShowCalendarModal,
    setShowGuestForm,
    setShowGuestIdModal,
    setShowCalendarImportFlow,
    setCurrentParticipantId,
    setCurrentGuestEmail,
    setIsEditingAvailability,
    setIsSavingAvailability,
    setIsRefreshingAvailabilities,
  }

  return (
    <ScheduleTimeDiscoverContext.Provider value={value}>
      {children}
    </ScheduleTimeDiscoverContext.Provider>
  )
}
