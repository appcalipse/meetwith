import React, { createContext, ReactNode, useContext, useState } from 'react'

export enum Page {
  SCHEDULE_TIME,
  SCHEDULE_DETAILS,
  COMPLETED,
}
interface INavigationContext {
  handlePageSwitch: (page: Page) => void
  currentPage: Page
  inviteModalOpen: boolean
  setInviteModalOpen: React.Dispatch<React.SetStateAction<boolean>>
}
const DEFAULT_CONTEXT = {
  handlePageSwitch: () => {},
  currentPage: Page.SCHEDULE_TIME,
  inviteModalOpen: false,
  setInviteModalOpen: () => {},
}

const NavigationContext = createContext<INavigationContext>(DEFAULT_CONTEXT)

export const useScheduleNavigation = () => {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error(
      'useScheduleNavigation must be used within NavigationProvider'
    )
  }
  return context
}

interface NavigationProviderProps {
  children: ReactNode
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({
  children,
}) => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.SCHEDULE_TIME)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)

  const value = {
    handlePageSwitch: setCurrentPage,
    currentPage,
    inviteModalOpen,
    setInviteModalOpen,
  }

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  )
}
