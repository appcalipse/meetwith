import React, { createContext, ReactNode, useContext, useState } from 'react'

interface QuickPollAvailabilityState {
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

const QuickPollAvailabilityContext = createContext<
  QuickPollAvailabilityState | undefined
>(undefined)

export const useQuickPollAvailability = () => {
  const context = useContext(QuickPollAvailabilityContext)
  if (!context) {
    throw new Error(
      'useQuickPollAvailability must be used within QuickPollAvailabilityProvider'
    )
  }
  return context
}

interface QuickPollAvailabilityProviderProps {
  children: ReactNode
}

export const QuickPollAvailabilityProvider: React.FC<
  QuickPollAvailabilityProviderProps
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

  const value: QuickPollAvailabilityState = {
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
    <QuickPollAvailabilityContext.Provider value={value}>
      {children}
    </QuickPollAvailabilityContext.Provider>
  )
}
