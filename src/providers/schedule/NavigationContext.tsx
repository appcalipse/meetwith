import { useRouter } from 'next/router'
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
  currentPage: Page.SCHEDULE_TIME,
  handlePageSwitch: () => {},
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
  const router = useRouter()
  const { intent } = router.query

  const initialPage =
    intent === 'schedule_from_poll' ? Page.SCHEDULE_DETAILS : Page.SCHEDULE_TIME

  const [currentPage, setCurrentPage] = useState<Page>(initialPage)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)

  const value = {
    currentPage,
    handlePageSwitch: setCurrentPage,
    inviteModalOpen,
    setInviteModalOpen,
  }

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  )
}
