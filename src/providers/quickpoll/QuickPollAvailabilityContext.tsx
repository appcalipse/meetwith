import React, { createContext, ReactNode, useContext, useState } from 'react'

import { AvailabilitySlot, QuickPollIntent } from '@/types/QuickPoll'

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
  guestAvailabilitySlots: AvailabilitySlot[]
  currentTimezone: string
  currentIntent: QuickPollIntent | null

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
  setGuestAvailabilitySlots: (slots: AvailabilitySlot[]) => void
  setCurrentTimezone: (timezone: string) => void
  setCurrentIntent: (intent: QuickPollIntent | null) => void
  setIsEditingAvailability: (value: boolean) => void
  setIsSavingAvailability: (value: boolean) => void
  setIsRefreshingAvailabilities: (value: boolean) => void
  clearGuestAvailabilitySlots: () => void
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
  initialParticipantId?: string
}

export const QuickPollAvailabilityProvider: React.FC<
  QuickPollAvailabilityProviderProps
> = ({ children, initialParticipantId }) => {
  const [isInviteParticipantsOpen, setIsInviteParticipantsOpen] =
    useState(false)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [showGuestForm, setShowGuestForm] = useState(false)
  const [showGuestIdModal, setShowGuestIdModal] = useState(false)
  const [currentParticipantId, setCurrentParticipantId] = useState<string>(
    initialParticipantId || ''
  )
  const [currentGuestEmail, setCurrentGuestEmail] = useState<string>('')
  const [guestAvailabilitySlots, setGuestAvailabilitySlots] = useState<
    AvailabilitySlot[]
  >([])
  const [currentTimezone, setCurrentTimezone] = useState<string>('UTC')
  const [currentIntent, setCurrentIntent] = useState<QuickPollIntent | null>(
    null
  )
  const [isEditingAvailability, setIsEditingAvailability] = useState(false)
  const [isSavingAvailability, setIsSavingAvailability] = useState(false)
  const [isRefreshingAvailabilities, setIsRefreshingAvailabilities] =
    useState(false)
  const [showCalendarImportFlow, setShowCalendarImportFlow] = useState(false)

  const clearGuestAvailabilitySlots = () => {
    setGuestAvailabilitySlots([])
  }

  const value: QuickPollAvailabilityState = {
    clearGuestAvailabilitySlots,
    currentGuestEmail,
    currentIntent,

    // Data states
    currentParticipantId,
    currentTimezone,
    guestAvailabilitySlots,

    // Loading states
    isEditingAvailability,
    // Modal states
    isInviteParticipantsOpen,
    isRefreshingAvailabilities,
    isSavingAvailability,
    setCurrentGuestEmail,
    setCurrentIntent,
    setCurrentParticipantId,
    setCurrentTimezone,
    setGuestAvailabilitySlots,
    setIsEditingAvailability,

    // Actions
    setIsInviteParticipantsOpen,
    setIsRefreshingAvailabilities,
    setIsSavingAvailability,
    setShowCalendarImportFlow,
    setShowCalendarModal,
    setShowGuestForm,
    setShowGuestIdModal,
    showCalendarImportFlow,
    showCalendarModal,
    showGuestForm,
    showGuestIdModal,
  }

  return (
    <QuickPollAvailabilityContext.Provider value={value}>
      {children}
    </QuickPollAvailabilityContext.Provider>
  )
}
